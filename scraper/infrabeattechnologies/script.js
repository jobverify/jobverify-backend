import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import INFRABEAT_TECHNOLOGIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = INFRABEAT_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#8211;|&ndash;/gi, '-')

const stripTags = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(div|p|li|ul|ol|h[1-6]|strong)>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => stripTags(value) || null

const slugFromUrl = (value) => {
  try {
    const pathname = new URL(value).pathname.replace(/\/+$/, '')
    return pathname.split('/').filter(Boolean).pop() || null
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /Archives:\s*<span>\s*Careers\s*<\/span>/i.test(page)
    && /class="[^"]*\bcareer\b[^"]*type-career/i.test(page)
    && /entry-title/i.test(page)
  }

export const extractJobs = (html = '') => {
  const jobs = []
  const matches = String(html ?? '').matchAll(
    /<article[^>]*class="[^"]*\bcareer\b[^"]*"[\s\S]*?<h2 class="entry-title"><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>[\s\S]*?<div class="entry-content">([\s\S]*?)<\/div>\s*<\/article>/gi,
  )

  for (const match of matches) {
    const sourceUrl = normalizeText(match[1])
    const title = normalizeText(match[2])
    const body = match[3]
    const location = normalizeText(body.match(/Job Location\s*:\s*<\/strong>\s*([^<]+)/i)?.[1])
    const experienceRequired = normalizeText(
      body.match(/(?:SAP Experience|Experience)\s*:?\s*<\/strong>\s*([^<]+)/i)?.[1],
    )
    const rolesBlock = body.match(
      /Roles\s*&(?:amp;)?\s*Responsibilities:\s*<\/strong>\s*<\/p>\s*<ul>([\s\S]*?)<\/ul>/i,
    )?.[1] ?? ''
    const responsibilities = [...rolesBlock.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
      .map((item) => normalizeText(item[1]))
      .filter(Boolean)
    const slug = slugFromUrl(sourceUrl)
    if (!sourceUrl || !title || !location || !slug) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: `${location}, India`,
      city: location,
      country: 'India',
      jobId: slug,
      requisitionId: slug,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: responsibilities.length > 0
        ? `Roles & Responsibilities: ${responsibilities.join(' ')}`
        : null,
    })
  }

  return jobs
}

export const createInfrabeatTechnologiesScraper = ({
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Infrabeat Technologies careers archive no longer matches the trusted first-party surface')
    }

    const jobs = extractJobs(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Infrabeat Technologies careers archive no longer exposes the verified career post cards')
    }

    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createInfrabeatTechnologiesScraper().run(options)

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
