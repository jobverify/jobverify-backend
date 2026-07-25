import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { DOODLEBLUE_INNOVATION_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DOODLEBLUE_INNOVATION_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeText = (value = '') => String(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialOpeningsSignal = (html = '') => {
  const normalized = String(html).replace(/\s+/g, ' ')

  return normalized.includes('Career at doodleblue | openings at chennai | doodleblue | India')
    && normalized.includes('Join our Team')
    && normalized.includes('Browse our open positions and pick the challenge that excites you the most')
    && normalized.includes('Apply Now')
}

const extractApplyUrl = (html = '') => {
  const match = String(html).match(/<a[^>]*href=["']([^"']*\/careers\/apply-now\/[^"']*)["'][^>]*>\s*Apply Now\s*<\/a>/i)
  return match ? new URL(match[1], CAREERS_URL).toString() : null
}

const parseMetaLine = (value = '') => {
  const normalized = normalizeText(value)
  const match = normalized.match(/^(.*?India)\s+(Full time)\s+(experienced)$/i)

  if (!match) {
    return { location: normalized, employmentType: null, seniority: null }
  }

  return {
    location: match[1],
    employmentType: match[2],
    seniority: match[3],
  }
}

export const parseOpenings = (html = '') => {
  const applyUrl = extractApplyUrl(html)
  const jobs = []
  const articlePattern = /<article\b[^>]*class=["'][^"']*opening-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi
  let articleMatch

  while ((articleMatch = articlePattern.exec(String(html)))) {
    const block = articleMatch[1]
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const metaMatch = block.match(/<p[^>]*class=["'][^"']*meta[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)

    if (!titleMatch || !metaMatch || !applyUrl) {
      continue
    }

    const meta = parseMetaLine(metaMatch[1])
    jobs.push({
      title: normalizeText(titleMatch[1]),
      location: meta.location,
      employmentType: meta.employmentType,
      seniority: meta.seniority,
      detailUrl: applyUrl,
      applyUrl,
    })
  }

  return jobs
}

export const createDoodleblueInnovationScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (!hasOfficialOpeningsSignal(html)) {
      throw new Error('The verified doodleblue openings page no longer matches the trusted first-party contract')
    }

    const jobs = parseOpenings(html)
    if (jobs.length === 0) {
      throw new Error('The verified doodleblue openings page no longer exposes parseable role cards')
    }

    return jobs
  },
})

export const run = async (options = {}) => createDoodleblueInnovationScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
