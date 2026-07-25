import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://www.qubecinema.com/careers'
export const BOARD_URL = 'https://qubecinema.applytojob.com/'

const COMPANY = 'Qube Cinema'
const SOURCE = 'qubecinema'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const BOARD_HOST = new URL(BOARD_URL).hostname

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|section|article|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtml = (value) => normalizeWhitespace(value) || ''

const extractTitle = (html) => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

const stripToLines = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(div|p|li|section|article|ul|ol|h[1-6])>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
  .replace(/\u00a0/g, ' ')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const toAbsoluteBoardUrl = (value) => {
  try {
    const url = new URL(value, BOARD_URL)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.hostname !== BOARD_HOST) return null
    if (!url.pathname.startsWith('/apply/')) return null
    return url.href.split('#')[0]
  } catch {
    return null
  }
}

const extractJobId = (url) => {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean)
    const applyIndex = segments.indexOf('apply')
    return applyIndex >= 0 ? segments[applyIndex + 1] || null : null
  } catch {
    return null
  }
}

const normalizeLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return null
  if (/^remote$/i.test(location)) return 'Remote, India'
  return location
}

const getCity = (location) => {
  if (!location || /^remote\b/i.test(location) || /^india$/i.test(location)) return null
  return normalizeWhitespace(location.split(',')[0])
}

const getRemoteStatus = (location) => (/^remote\b/i.test(location || '') ? 'Remote' : 'On-site')

const isIndiaOrRemote = (location) =>
  /^remote\b/i.test(location || '') || /\bindia\b/i.test(location || '')

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = decodeHtml(page)
  const boardLinks = page.match(/https:\/\/qubecinema\.applytojob\.com\/?/gi) || []
  const viewJobsCount = (text.match(/\bview jobs\b/gi) || []).length

  return /welcome to qube careers/i.test(text)
    && /\bjobs\b/i.test(text)
    && /qube wants to hear from you/i.test(text)
    && boardLinks.length >= 2
    && viewJobsCount >= 2
}

export const hasVerifiedBoardSignal = (html) => {
  const page = String(html ?? '')
  const text = decodeHtml(page)

  return extractTitle(page) === 'Qube Cinema - Career Page'
    && /current openings/i.test(text)
    && /view our website/i.test(text)
    && /powered by/i.test(text)
    && /qube cinema/i.test(text)
}

export const extractBoardJobs = (html) => {
  const seen = new Set()
  const jobs = []

  for (const match of String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const itemHtml = match[1]
    const headingMatch = itemHtml.match(
      /<h3[^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i,
    )

    if (!headingMatch) continue

    const applyUrl = toAbsoluteBoardUrl(headingMatch[1])
    const title = normalizeWhitespace(headingMatch[2])
    const lines = stripToLines(itemHtml.replace(headingMatch[0], ''))
    const location = normalizeLocation(lines[0])
    const department = normalizeWhitespace(lines[1])
    const jobId = applyUrl ? extractJobId(applyUrl) : null

    if (!applyUrl || !title || !location || !jobId || seen.has(applyUrl) || !isIndiaOrRemote(location)) {
      continue
    }

    seen.add(applyUrl)
    jobs.push({
      title,
      company: COMPANY,
      department: department || null,
      location,
      city: getCity(location),
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: getRemoteStatus(location),
    })
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

export const createQubeCinemaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The official Qube careers page no longer matches the verified public surface')
    }

    const boardHtml = await fetchText(BOARD_URL)

    if (!hasVerifiedBoardSignal(boardHtml)) {
      throw new Error('The verified Qube ApplyToJob board no longer matches the expected public surface')
    }

    const jobs = extractBoardJobs(boardHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createQubeCinemaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Qube Cinema scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
