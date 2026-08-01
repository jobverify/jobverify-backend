import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { CONTUS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CONTUS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const stripTags = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = String(html).replace(/\s+/g, ' ')

  return normalized.includes('CONTUS TECH - Career Opportunities and Job Openings')
    && normalized.includes('We build features not just Tech.')
    && normalized.includes('Current Openings')
}

export const parseOpeningCards = (html = '') => {
  const jobs = []
  const articlePattern = /<article\b[^>]*class=["'][^"']*opening-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi
  let articleMatch

  while ((articleMatch = articlePattern.exec(String(html)))) {
    const block = articleMatch[1]
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const locationMatch = block.match(/<p[^>]*class=["'][^"']*location[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)
    const applyMatch = block.match(/<a[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)

    if (!titleMatch || !locationMatch || !applyMatch) {
      continue
    }

    const resolvedUrl = new URL(applyMatch[1], CAREERS_URL).toString()
    jobs.push({
      title: stripTags(titleMatch[1]),
      location: stripTags(locationMatch[1]),
      detailUrl: resolvedUrl,
      applyUrl: resolvedUrl,
    })
  }

  return jobs
}

export const createContusScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(html)) {
      throw new Error('The verified CONTUS careers page no longer matches the trusted first-party contract')
    }

    const jobs = parseOpeningCards(html)
    if (jobs.length === 0) {
      throw new Error('The verified CONTUS openings list no longer exposes parseable role cards')
    }

    return jobs
  },
})

export const run = async (options = {}) => createContusScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
