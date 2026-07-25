import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { SRINSOFT_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SRINSOFT_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLY_FORM_URL = PROVIDER_METADATA.applyFormUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_NEGATIVE_LOCATION_PATTERN =
  /\b(canada|united states|usa|u\.s\.a\.|uk|united kingdom|uae|australia|singapore|malaysia|germany|france|toronto|ontario|boca raton)\b/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\*/g, ' ')
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

const toAbsoluteApplyUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_URL)
    if (!/^(www\.)?srinsofttech\.com$/i.test(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

const isIndiaFacingLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  return Boolean(normalized) && !INDIA_NEGATIVE_LOCATION_PATTERN.test(normalized)
}

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Careers at SrinSoft\s*\|\s*Join Our Innovative Team\s*<\/title>/i.test(rawHtml)
    && /mailto:tms@srinsofttech\.com/i.test(rawHtml)
    && /accordion-item/i.test(rawHtml)
    && /Apply Now/i.test(rawHtml)
}

export const extractIndiaAccordionJobs = (html = '') =>
  [...String(html ?? '').matchAll(
    /<div[^>]*class=["'][^"']*\baccordion-item\b[^"']*["'][^>]*data-tags=["']([^"']+)["'][^>]*>([\s\S]*?)(?=<div[^>]*class=["'][^"']*\baccordion-item\b|<\/body>)/gi,
  )]
    .map((match) => {
      const department = normalizeWhitespace(match[1]) || null
      const blockHtml = match[2]
      const title = normalizeWhitespace(blockHtml.match(/<button[^>]*>([\s\S]*?)<\/button>/i)?.[1])
      const location = normalizeWhitespace(
        blockHtml.match(/Location:\s*<\/strong>\s*([\s\S]*?)<\/p>/i)?.[1],
      )
      const experience = normalizeWhitespace(
        blockHtml.match(/Experience:\s*<\/strong>\s*([\s\S]*?)<\/p>/i)?.[1],
      )
      const jobDescription = normalizeWhitespace(
        blockHtml.match(/Job Description:\s*<\/strong>\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>/i)?.[1],
      )
      const applyUrl = toAbsoluteApplyUrl(
        blockHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1],
      )

      if (!title || !location || !experience || !jobDescription || !applyUrl) return null
      if (!isIndiaFacingLocation(location)) return null

      return {
        title,
        department,
        location,
        experience,
        sourceUrl: CAREERS_URL,
        applyUrl,
        jobDescription,
      }
    })
    .filter(Boolean)

export const createSrinSoftTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractIndiaAccordionJobs(careersHtml)

    if (!hasOfficialCareersSignal(careersHtml) || jobs.length === 0) {
      throw new Error('SrinSoft verified first-party careers page changed materially')
    }

    return jobs.map((job) => ({
      ...job,
      company: COMPANY,
      country: 'India',
      link: job.applyUrl,
      source: SOURCE,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSrinSoftTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
