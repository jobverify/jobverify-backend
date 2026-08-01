import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CURRENT_OPENINGS_URL = 'https://cdot.in/cdotweb/web/current_openings.php?lang=en'
export const SOURCE = 'cdot'
const COMPANY = 'Centre for Development of Telematics (C-DOT)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '')
  .replace(/<br\b[^>]*>/gi, ' ')
  .replace(/<[^>]+>/g, ' '))

const extractHref = (html) => html.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2] || null

const parseDate = (value) => {
  const match = normalizeWhitespace(value)?.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (!match) return null

  const [, day, month, year] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString()
}

const extractRows = (html) => {
  const table = String(html ?? '').match(/<table\b[^>]*\bid\s*=\s*(["'])openings\1[^>]*>[\s\S]*?<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)
  if (!table) return []

  return [...table[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => [...match[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => cell[1]))
    .filter((cells) => cells.length >= 6)
}

const getJobId = (applyUrl, rowNumber) => {
  try {
    const advertisementId = new URL(applyUrl).searchParams.get('adv_id')
    if (advertisementId) return `cdot-${advertisementId}`
  } catch {
    // Keep parsing a row even if C-DOT changes the application URL format.
  }

  return `cdot-${rowNumber}`
}

export const hasCurrentOpeningsSignal = (html) => (
  /<title>\s*Current Openings\s*<\/title>/i.test(String(html ?? ''))
  && /<table\b[^>]*\bid\s*=\s*(["'])openings\1/i.test(String(html ?? ''))
)

export const extractOpenings = (html) => extractRows(html)
  .map((cells) => {
    const rowNumber = stripTags(cells[0])
    const title = stripTags(cells[1])
    const advertisementUrl = extractHref(cells[4])
    const applicationUrl = extractHref(cells[5])
    const applyUrl = applicationUrl ? new URL(applicationUrl, CURRENT_OPENINGS_URL).toString() : null

    if (!title || !applyUrl) return null

    const jobId = getJobId(applyUrl, rowNumber || title)
    return {
      title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: advertisementUrl
        ? new URL(advertisementUrl, CURRENT_OPENINGS_URL).toString()
        : CURRENT_OPENINGS_URL,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: parseDate(stripTags(cells[2])),
      closingDate: parseDate(stripTags(cells[3])),
      jobDescription: 'Official C-DOT opening. See the advertisement for role details.',
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCdotScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasCurrentOpeningsSignal(html)) {
      throw new Error('C-DOT current openings page no longer exposes the expected table')
    }

    const jobs = extractOpenings(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createCdotScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running C-DOT scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
