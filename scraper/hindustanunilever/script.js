import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'hindustanunilever'
export const COMPANY = 'Hindustan Unilever Limited'
export const CAREERS_URL = 'https://www.hul.co.in/careers/'
export const LOCATION_PAGE_URL = 'https://careers.unilever.com/en/india'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(String(value ?? ''))

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractLocationCity = (location) => {
  const normalized = normalizeWhitespace(location)
  const city = normalized.replace(/,\s*india$/i, '').trim()
  return city && city.toLowerCase() !== 'india' ? city : null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('india')
    && normalized.includes('our local jobs')
    && /<h1[^>]*>\s*India\s*<\/h1>/i.test(page)
    && /https:\/\/careers\.unilever\.com\/en\/job\//i.test(page)
}

export const pageLinksToVerifiedIndiaCareersSurface = (html) => (
  /https:\/\/careers\.unilever\.com\/en\/india/i.test(String(html ?? ''))
)

export const extractLocalJobs = (html) => Array.from(
  String(html ?? '').matchAll(
    /<a[^>]+href=["'](https:\/\/careers\.unilever\.com\/en\/job\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  ),
  (match) => {
    const applyUrl = match[1]
    const anchorHtml = match[2]
    const location = stripTags(anchorHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1])
    const withoutLocation = anchorHtml.replace(/<span[^>]*>[\s\S]*?<\/span>/i, ' ')
    const title = stripTags(withoutLocation)

    return {
      title,
      location,
      applyUrl,
    }
  },
).filter((job) => job.title && /,\s*india$/i.test(job.location))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createHindustanUnileverScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!pageLinksToVerifiedIndiaCareersSurface(careersHtml)) {
      throw new Error('Hindustan Unilever official careers handoff changed; refusing to guess the public jobs surface')
    }

    const locationHtml = await fetchText(LOCATION_PAGE_URL)

    if (!hasOfficialCareersSignal(locationHtml)) {
      throw new Error('Hindustan Unilever verified official India careers surface changed')
    }

    const jobs = extractLocalJobs(locationHtml)
      .map((job) => ({
        title: job.title,
        company: COMPANY,
        location: job.location,
        city: extractLocationCity(job.location),
        country: 'India',
        jobId: `${SOURCE}-${slugify(`${job.title}-${job.location}`)}`,
        requisitionId: null,
        sourceUrl: LOCATION_PAGE_URL,
        applyUrl: job.applyUrl,
        employmentType: null,
        department: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: 'Apply via the official Unilever India careers page.',
      }))
      .sort((left, right) => left.title.localeCompare(right.title) || left.location.localeCompare(right.location))

    return jobs
  },
})

export const run = async (options = {}) => createHindustanUnileverScraper().run(options)

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
