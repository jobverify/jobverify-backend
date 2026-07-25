import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CURRENT_OPENINGS_URL = 'https://recruitment.eil.co.in/'
export const SOURCE = 'engineersindialimited'
export const COMPANY = 'Engineers India Limited'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? ''))

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const normalizeAdvNumber = (value) => normalizeWhitespace(value)?.replace(/\s+/g, '') || null

const buildPrintApplicationUrl = (advNumber) => {
  const normalized = normalizeAdvNumber(advNumber)
  if (!normalized) return null
  const encoded = encodeURIComponent(normalized)
  return `https://recruitment.eil.co.in/applicnExpRecruitment/Printout_regno.aspx?adv=${encoded}`
}

export const hasCurrentOpeningsSignal = (html) => {
  const page = String(html ?? '')
  return /EIL Recruitment Portal/i.test(page)
    && /Current Openings/i.test(page)
    && /Recruitment of Fresher \/ Experienced Candidates/i.test(page)
}

export const extractOpenings = (html) => {
  const page = String(html ?? '')
  const sectionMatch = page.match(
    /Recruitment of Fresher \/ Experienced Candidates:[\s\S]*?Live Advertisements \/ Print Outs([\s\S]*?)(?:\*\s*\*\s*\*|<\/body>|$)/i,
  )
  const section = sectionMatch?.[1] || ''

  const jobs = [...section.matchAll(
    /(\d+)\.\s*([^<\n]+?)\s*\(Adv No:\s*([^)]+)\)/gi,
  )]
    .map((match) => {
      const title = stripTags(match[2])
      const advNumber = normalizeAdvNumber(match[3])
      const requisitionId = advNumber ? `eil-${slugify(advNumber)}` : null

      if (!title || !advNumber || !requisitionId) return null

      return {
        title,
        company: COMPANY,
        department: null,
        location: 'India',
        city: null,
        state: null,
        country: 'India',
        jobId: requisitionId,
        requisitionId,
        sourceUrl: CURRENT_OPENINGS_URL,
        applyUrl: buildPrintApplicationUrl(advNumber),
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: `Official EIL opening (${advNumber}). See the EIL Recruitment Portal for advertisement and application details.`,
      }
    })
    .filter(Boolean)

  if (jobs.length === 0) {
    throw new Error('Engineers India Limited recruitment portal no longer exposes the expected current openings list')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createEngineersIndiaLimitedScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasCurrentOpeningsSignal(html)) {
      throw new Error('Engineers India Limited recruitment portal no longer matches the verified official current openings surface')
    }

    return extractOpenings(html).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createEngineersIndiaLimitedScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Engineers India Limited scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
