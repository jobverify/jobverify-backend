import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { SEDIN_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SEDIN_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")

const stripTags = (value) => String(value ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(stripTags(value))
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

const getRequisitionId = (value) => {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean)
    return segments.at(-2) || segments.at(-1) || SOURCE
  } catch {
    return SOURCE
  }
}

const getJobSlug = (value) => {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean)
    return segments.at(-1) || SOURCE
  } catch {
    return SOURCE
  }
}

const normalizeWorkplaceType = (value) => {
  if (!value) return null
  if (/remote/i.test(value)) return 'Remote'
  if (/on[\s-]?site/i.test(value)) return 'On-site'
  if (/hybrid/i.test(value)) return 'Hybrid'
  return value
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /Current Opportunities/i.test(page)
    && /sedintechnologies\.zohorecruit\.in\/jobs\/Careers/i.test(page)
    && /Apply Now/i.test(page)
  }

export const extractJobCards = (html = '') => [...String(html ?? '').matchAll(
  /<div class="swiper-slide h-auto">([\s\S]*?)<\/div>\s*<\/div>/gi,
)]
  .map((match) => {
    const block = match[1]
    const title = normalizeText(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const department = normalizeText(block.match(/<p[^>]*class="[^"]*text-blueCustom[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1])
    const location = normalizeText(
      block.match(/<div class="flex items-center gap-2 text-dark3 text-sm mb-5"><span>([\s\S]*?)<\/span><\/div>/i)?.[1],
    )
    const description = normalizeText(
      block.match(/<div class="mb-5"><p[^>]*>([\s\S]*?)<\/p><\/div>/i)?.[1],
    )
    const applyUrlValue = block.match(/<a[^>]+href="([^"]+zohorecruit\.in\/jobs\/Careers\/[^"]+)"[^>]*>/i)?.[1]
    const postingDate = normalizeText(block.match(/Posted ([^<]+)<\/span>/i)?.[1])
    const badges = [...block.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((badgeMatch) => normalizeText(badgeMatch[1]))
      .filter(Boolean)
    const workplaceType = normalizeWorkplaceType(
      badges.find((badge) => /remote|hybrid|on[\s-]?site/i.test(badge)),
    )
    const employmentType = badges.find((badge) => /full[\s-]?time|part[\s-]?time|contract|internship/i.test(badge)) || null

    if (!title || !applyUrlValue) return null

    const applyUrl = toAbsoluteUrl(applyUrlValue)
    const requisitionId = getRequisitionId(applyUrl)
    const slug = getJobSlug(applyUrl)
    const city = location?.endsWith(', India') ? location.replace(/,\s*India$/i, '') : null

    return {
      title,
      department,
      location,
      city,
      country: 'India',
      jobId: `${SOURCE}-${requisitionId}-${slug}`,
      requisitionId,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType,
      workplaceType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription: description || title,
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSedinTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Sedin Technologies careers page no longer matches the verified first-party opportunities surface')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Sedin Technologies careers page no longer exposes verified inline opportunity cards')
    }

    return jobs
      .sort((left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId))
      .map((job) => ({
        ...job,
        companyCareerPage: CAREERS_URL,
        company: COMPANY,
        source: SOURCE,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
        link: job.applyUrl,
        scrapedAt: (overrideNow || now)(),
      }))
  },
})

export const run = async (options = {}) => createSedinTechnologiesScraper().run(options)

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
