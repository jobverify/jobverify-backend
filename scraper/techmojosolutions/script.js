import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import TECHMOJO_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TECHMOJO_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

export const hasOfficialJobsPortalSignal = (html = '') => {
  const text = stripTags(html)
  return text.includes('TechMojo Career Portal') && text.includes('Open Positions')
}

const buildAbsoluteUrl = (href) => {
  try {
    return new URL(href, CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const extractJobs = (html = '', scrapedAt = new Date().toISOString()) => {
  const jobs = []
  const seen = new Set()
  const pattern = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const url = buildAbsoluteUrl(match[1])
    const rawAnchor = String(match[2] ?? '')
    const text = stripTags(rawAnchor)
    if (!url || !/jobs\.techmojo\.com\/jobs\//i.test(url) || !/Hyderabad,\s*Telangana/i.test(text)) {
      continue
    }

    const titleMatch = rawAnchor.match(/^\s*([^<\n][\s\S]*?)\s*(?:<|Hyderabad,\s*Telangana|Full\s+Time|Part\s+Time)/i)
    const title = normalizeWhitespace(titleMatch?.[1] ?? '')
      .replace(/\s+$/, '')
    const employmentType = /full time/i.test(text)
      ? 'Full Time'
      : /part time/i.test(text)
        ? 'Part Time'
        : null
    const key = `${title}::${url}`
    if (!title || seen.has(key)) continue
    seen.add(key)

    jobs.push({
      title,
      company: COMPANY,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      sourceUrl: url,
      applyUrl: url,
      employmentType,
      experienceRequired: null,
      requiredSkills: [],
      jobDescription: null,
      source: SOURCE,
      link: url,
      scrapedAt,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    })
  }

  return jobs
}

export const createTechMojoSolutionsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (!hasOfficialJobsPortalSignal(html)) {
      throw new Error('The verified TechMojo Solutions jobs portal changed materially')
    }

    return extractJobs(html, now())
  },
})

export const run = async (options = {}) => createTechMojoSolutionsScraper(options).run(options)

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
