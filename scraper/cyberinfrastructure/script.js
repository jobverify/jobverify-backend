import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { CYBER_INFRASTRUCTURE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CYBER_INFRASTRUCTURE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const stripTags = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const toAbsoluteUrl = (url) => {
  if (!url) return null
  return new URL(url, CAREERS_URL).toString()
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialJobsBoardSignal = (html = '') => {
  const normalized = String(html).replace(/\s+/g, ' ')

  return normalized.includes('Jobs and Current Openings | Career at CIS')
    && normalized.includes('Stop Dreaming')
    && normalized.includes('Start Living')
    && normalized.includes('career@cisin.com')
    && normalized.includes('Current roles at India')
}

const extractIndiaSection = (html = '') => {
  const match = String(html).match(
    /<section[^>]*data-country=["']India["'][^>]*>([\s\S]*?)<\/section>/i,
  )

  return match ? match[1] : ''
}

export const parseIndiaJobs = (html = '') => {
  const section = extractIndiaSection(html)
  const jobs = []
  const articlePattern = /<article\b[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi
  let articleMatch

  while ((articleMatch = articlePattern.exec(section))) {
    const block = articleMatch[1]
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const detailMatch = block.match(/<a[^>]*href=["']([^"']+)["'][^>]*>\s*View Details\s*<\/a>/i)
    const applyMatch = block.match(/<a[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)

    if (!titleMatch || !detailMatch || !applyMatch) {
      continue
    }

    jobs.push({
      title: stripTags(titleMatch[1]),
      location: 'India',
      detailUrl: toAbsoluteUrl(detailMatch[1]),
      applyUrl: toAbsoluteUrl(applyMatch[1]),
    })
  }

  return jobs
}

export const createCyberInfrastructureScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (!hasOfficialJobsBoardSignal(html)) {
      throw new Error('The verified Cyber Infrastructure jobs board no longer matches the trusted first-party contract')
    }

    return parseIndiaJobs(html)
  },
})

export const run = async (options = {}) => createCyberInfrastructureScraper().run(options)

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
