import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SMART_IMS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SMART_IMS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeText = (value = '') => String(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#8211;|&ndash;|–/g, '-')
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

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = String(html).replace(/\s+/g, ' ')

  return normalized.includes('Careers & Job Opportunities | SmartIMS')
    && normalized.includes('Building Impactful Careers')
    && normalized.includes('Select a region to view job openings.')
    && normalized.includes('Smart IMS India')
    && normalized.includes('Current Job Openings')
}

const extractApplyEmail = (block = '') => {
  const directMatch = block.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)
  if (directMatch) {
    return `mailto:${directMatch[1]}`
  }

  const lineMatch = block.match(/To apply send your profile to\s*([\s\S]*?)<\/p>/i)
  if (!lineMatch) {
    return null
  }

  const rawToken = String(lineMatch[1]).replace(/<[^>]*>/g, '').trim()
  if (/^\[email/i.test(rawToken) && /protected\]$/i.test(rawToken)) {
    return `mailto:${rawToken}`
  }

  const normalizedEmail = normalizeText(rawToken).replace(/^\[|\]$/g, '')
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalizedEmail)
    ? `mailto:${normalizedEmail}`
    : null
}

export const parseCurrentOpenings = (html = '') => {
  const jobs = []
  const articlePattern = /<article\b[^>]*class=["'][^"']*job-opening[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi
  let articleMatch

  while ((articleMatch = articlePattern.exec(String(html)))) {
    const block = articleMatch[1]
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    if (!titleMatch) {
      continue
    }

    const title = normalizeText(titleMatch[1]).replace(/^Job Description:\s*/i, '')
    const locationMatch = block.match(/Location:\s*([^<\n]+)/i)
    const experienceMatch = block.match(/Experience:\s*([^<\n]+)/i)
    const openingsMatch = block.match(/No of Positions:\s*([^<\n]+)/i)
    const teamMatch = block.match(/Team:\s*([^<\n]+)/i)
    const applyUrl = extractApplyEmail(block)

    jobs.push({
      title,
      location: locationMatch ? normalizeText(locationMatch[1]) : null,
      applyUrl,
      experience: experienceMatch ? normalizeText(experienceMatch[1]) : null,
      ...(teamMatch ? { team: normalizeText(teamMatch[1]) } : {}),
      ...(openingsMatch ? { openingsCount: normalizeText(openingsMatch[1]) } : {}),
    })
  }

  return jobs
}

export const createSmartImsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(html)) {
      throw new Error('The verified Smart IMS careers page no longer matches the trusted first-party contract')
    }

    const jobs = parseCurrentOpenings(html)
    if (jobs.length === 0) {
      throw new Error('The verified Smart IMS careers contract no longer exposes parseable current openings')
    }

    return jobs
  },
})

export const run = async (options = {}) => createSmartImsScraper().run(options)

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
