import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://cdac.in/index.aspx?id=current_jobs'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const ANNOUNCEMENT_SECTIONS = ['Current Openings', 'Rolling Advertisements']

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toAbsoluteUrl = (href) => {
  try {
    return new URL(href, CAREER_PAGE_URL).toString()
  } catch {
    return null
  }
}

const getSectionHtml = (html, heading) => {
  const pattern = new RegExp(
    `<h([1-6])[^>]*>\\s*${heading}\\s*<\\/h\\1>([\\s\\S]*?)(?=<h[1-6][^>]*>|$)`,
    'i',
  )
  return String(html ?? '').match(pattern)?.[2] || ''
}

const extractAnnouncements = (html) => ANNOUNCEMENT_SECTIONS.flatMap((heading) => {
  const sectionHtml = getSectionHtml(html, heading)
  return [...sectionHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const applyUrl = toAbsoluteUrl(match[1])
      const title = normalizeWhitespace(match[2])
      if (!applyUrl || !title) return null

      const url = new URL(applyUrl)
      const requisitionId = url.searchParams.get('dynamicId') || url.searchParams.get('id')
      if (!requisitionId) return null

      return { title, applyUrl, requisitionId }
    })
    .filter(Boolean)
})

export const pageIndicatesCurrentOpenings = (html) =>
  /<h[1-6][^>]*>\s*Current Openings\s*<\/h[1-6]>/i.test(String(html ?? ''))

export const extractSearchResults = (html) => extractAnnouncements(html)
  .map(({ title, applyUrl, requisitionId }) => ({
    title,
    company: 'C-DAC',
    department: null,
    location: 'India',
    city: null,
    country: 'India',
    jobId: `cdac-${requisitionId.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()}`,
    requisitionId,
    sourceUrl: CAREER_PAGE_URL,
    applyUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official C-DAC career announcement. Review the official posting for eligibility and application details.',
  }))
  .sort((left, right) => left.title.localeCompare(right.title))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cdac',
  timeoutMs: 15000,
})

export const createCdacScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(CAREER_PAGE_URL)

    if (!pageIndicatesCurrentOpenings(html)) {
      throw new Error('C-DAC careers page no longer exposes the expected Current Openings section')
    }

    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'cdac',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createCdacScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running C-DAC scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'cdac')
    console.log('DB result:', result)
    process.exit(0)
  }
}
