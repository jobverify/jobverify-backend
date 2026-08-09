import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SAG_INFOTECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = SAG_INFOTECH_CATALOG.source
export const COMPANY = SAG_INFOTECH_CATALOG.companyName
export const CAREERS_URL = SAG_INFOTECH_CATALOG.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;|&#34;/gi, '"')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
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

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /Current Openings/i.test(page)
    && /ApplyCareer\.aspx\?code=0023/i.test(page)
    && /ApplyCareer\.aspx\?code=0019/i.test(page)
    && /Tech Support Executive/i.test(page)
}

export const extractOpeningCards = (html = '') => [...String(html ?? '').matchAll(
  /<div class="career-box[\s\S]*?<h3>([\s\S]*?)<span[^>]*>([\s\S]*?)<\/span><\/h3>[\s\S]*?<span[^>]*class="dispmsg">([\s\S]*?)<\/span>[\s\S]*?No\. of Vacancies:\s*([^)<\s]+)[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>\s*APPLY NOW!/gi,
)].map((match) => {
  const title = normalizeText(match[3]) || normalizeText(match[1])
  const experienceRequired = normalizeText(match[2])
  const openingsCount = Number.parseInt(String(match[4]).replace(/^0+/, '') || '0', 10)
  const href = normalizeText(match[5])
  const code = href?.match(/code=([^&]+)/i)?.[1] ?? slugify(title)

  return {
    title,
    experienceRequired,
    openingsCount,
    applyUrl: toAbsoluteUrl(href),
    jobId: `${SOURCE}-${code}`,
    requisitionId: code,
    jobDescription: title && openingsCount
      ? `${title}\nVacancies: ${openingsCount}`
      : title,
  }
}).filter((job) => job.title && job.applyUrl)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSagInfotechScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified SAG Infotech careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractOpeningCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('SAG Infotech careers page no longer exposes the verified current openings cards')
    }

    return jobs
      .sort((left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId))
      .map((job) => ({
        ...job,
        location: null,
        city: null,
        employmentType: null,
        workplaceType: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        compensation: null,
        postingDate: null,
        closingDate: null,
        sourceUrl: job.applyUrl,
        companyCareerPage: CAREERS_URL,
        company: COMPANY,
        source: SOURCE,
        companyDomain: SAG_INFOTECH_CATALOG.companyDomain,
        atsPlatform: SAG_INFOTECH_CATALOG.atsPlatform,
        country: 'India',
        link: job.applyUrl,
        scrapedAt: (overrideNow || now)(),
      }))
  },
})

export const run = async (options = {}) => createSagInfotechScraper().run(options)

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
