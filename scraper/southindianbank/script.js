import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://recruit.southindianbank.bank.in/RDC/'

const SOURCE = 'southindianbank'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeDate = (value) => {
  const match = String(value ?? '').match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*(?:Current Openings|South Indian Bank Careers)\s*-\s*South Indian Bank\s*<\/title>/i.test(page)
    && /href=["']https:\/\/www\.southindianbank\.bank\.in\/about-us\/careers["']/i.test(page)
    && text.includes('South Indian Bank')
    && (
      text.includes('Current Job Openings')
      || text.includes('Recruitment Drive Portal')
    )
}

export const hasEmptyOpeningsSignal = (html) =>
  /Currently,\s*there are no job openings\./i.test(html || '')

export const extractOpenings = (html, { now = () => new Date().toISOString() } = {}) => {
  const page = String(html ?? '')
  const cards = page.match(/<article class="job-card">[\s\S]*?<\/article>/gi) ?? []

  return cards
    .map((card) => {
      const title = card.match(/data-job-title=["']([^"']+)["']/i)?.[1]?.trim() ?? null
      const jobId =
        card.match(/<button[^>]+id=["'](\d+)["']/i)?.[1]
        ?? card.match(/id=["']pdf_(\d+)["']/i)?.[1]
        ?? card.match(/Notification\/(\d+)\.jpg/i)?.[1]
        ?? null
      const startDate = card.match(/Start Date:\s*<\/span>\s*<span[^>]*>\s*([^<]+)\s*<\/span>/i)?.[1] ?? null
      const endDate = card.match(/End\s*Date:\s*<\/span>\s*<span[^>]*>\s*([^<]+)\s*<\/span>/i)?.[1] ?? null

      if (!title || !jobId) return null

      return {
        title,
        company: 'South Indian Bank',
        department: null,
        location: 'India',
        city: null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: CAREERS_URL,
        applyUrl: CAREERS_URL,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeDate(startDate),
        closingDate: normalizeDate(endDate),
        jobDescription: null,
        source: SOURCE,
        link: CAREERS_URL,
        scrapedAt: now(),
      }
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSouthIndianBankScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('South Indian Bank careers page no longer matches the verified official public surface')
    }

    const jobs = extractOpenings(html, { now })
    if (jobs.length > 0) return jobs

    if (hasEmptyOpeningsSignal(html)) return []

    throw new Error('South Indian Bank careers page no longer matches the verified public jobs or no-openings surface')
  },
})

export const run = async (options = {}) => createSouthIndianBankScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running South Indian Bank scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
