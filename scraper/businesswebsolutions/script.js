import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://businesswebsolutions.in/careers/'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  if (!value || /^undefined$/i.test(String(value).trim())) return null

  try {
    return new URL(value, CAREERS_URL).href
  } catch {
    return null
  }
}

export const extractOpenJobs = (html) => [...String(html ?? '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((match) => {
    const row = match[1]
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => normalizeWhitespace(cell[1]))
    const title = cells[0]
    const experienceRequired = cells[1]
    const status = cells[2]
    const jobId = slugify(title)
    const detailUrl = row.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1]

    if (!title || !jobId || !/^open$/i.test(status || '')) return null

    return {
      title,
      company: 'Business Web Solutions',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: toAbsoluteUrl(detailUrl) || CAREERS_URL,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Remote',
      compensation: null,
    }
  })
  .filter(Boolean)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobverifyBot/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createBusinessWebSolutionsScraper = ({ fetchText = defaultFetchText } = {}) => ({
  run: async ({ fetchText: overrideFetchText } = {}) => {
    const jobs = extractOpenJobs(await (overrideFetchText || fetchText)(CAREERS_URL))

    return jobs.map((job) => ({
      ...job,
      source: 'businesswebsolutions',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createBusinessWebSolutionsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total India jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'businesswebsolutions')
}
