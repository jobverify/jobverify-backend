import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { EASYREWARDZ_SOFTWARE_SERVICES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#8211;|&#x2013;|&ndash;/gi, '\u2013')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/\bfull\s*time\b/i, 'Full-time')
}

const formatLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'India'
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const getLastPathSegment = (url) => {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? null
  } catch {
    return null
  }
}

export const hasOfficialCareersSignals = (html = '') => {
  const normalized = stripTags(html) || ''

  return normalized.includes('Careers')
    && normalized.includes('All Job Category')
    && normalized.includes('All Job Location')
    && normalized.includes('Customer Success')
    && normalized.includes('More Details')
}

const extractJobCards = (html = '') => {
  const cards = []
  const pattern = /<a[^>]+href="([^"]+)"[^>]*class="awsm-job-item"[^>]*>[\s\S]*?<h2[^>]*class="awsm-job-post-title"[^>]*>([\s\S]*?)<\/h2>[\s\S]*?awsm-job-specification-job-type[^>]*>[\s\S]*?<span[^>]*class="awsm-job-specification-term"[^>]*>([\s\S]*?)<\/span>[\s\S]*?awsm-job-specification-job-location[^>]*>[\s\S]*?<span[^>]*class="awsm-job-specification-term"[^>]*>([\s\S]*?)<\/span>/gi

  for (const match of html.matchAll(pattern)) {
    const applyUrl = normalizeWhitespace(match[1])
    const title = normalizeWhitespace(match[2])
    const employmentType = normalizeEmploymentType(match[3])
    const city = normalizeWhitespace(match[4])

    if (!applyUrl || !title || !city) continue

    cards.push({
      title,
      city,
      location: formatLocation(city),
      employmentType,
      applyUrl,
      sourceUrl: applyUrl,
      requisitionId: getLastPathSegment(applyUrl),
    })
  }

  return cards
}

const buildJobId = ({ title, city, requisitionId }) =>
  [slugify(title), slugify(city), slugify(requisitionId)].filter(Boolean).join('-')

export const createEasyRewardzSoftwareServicesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignals(careersHtml)) {
      throw new Error('The verified EasyRewardz careers page no longer matches the trusted first-party jobs surface')
    }

    return extractJobCards(careersHtml).map((card) => ({
      title: card.title,
      company: COMPANY,
      location: card.location,
      city: card.city,
      country: 'India',
      sourceUrl: card.sourceUrl,
      applyUrl: card.applyUrl,
      link: card.applyUrl,
      jobId: buildJobId(card),
      requisitionId: card.requisitionId,
      employmentType: card.employmentType,
      remoteStatus: 'On-site',
      jobDescription: card.title,
      source: SOURCE,
      scrapedAt: now(),
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createEasyRewardzSoftwareServicesScraper(options).run(options)

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
