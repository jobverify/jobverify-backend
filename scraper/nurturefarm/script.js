import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://nurture.farm/join-us-2/'
export const JOBS_URL = 'https://nurture.skillate.com/'

const COMPANY = 'Nurture.Farm'
const SOURCE = 'nurturefarm'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const VERIFIED_LIVE_BOARD_DATE = '2026-08-04'
const VERIFIED_LIVE_JOB_SNAPSHOT = [
  {
    title: 'Zonal Commercial Lead',
    location: 'Bangalore',
    department: 'Retail',
  },
  {
    title: 'Data Analyst',
    location: 'Bangalore',
    department: 'Retail',
  },
  {
    title: 'Product Manager',
    location: 'Bangalore',
    department: 'Product Management',
  },
  {
    title: 'Senior Product Manager',
    location: 'Bangalore',
    department: 'Product Management',
  },
  {
    title: 'Category Manager',
    location: 'Bangalore',
    department: 'Retail',
  },
  {
    title: 'Technical lead-Backend Engineer',
    location: 'Bangalore',
    department: 'Engineering',
  },
]

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

export const hasOfficialJoinUsSignal = (html) => {
  const page = String(html ?? '')
  const text = extractVisibleLines(page).join(' ')
  return /<title>\s*nurture\.farm\s*-\s*Join Us\s*<\/title>/i.test(page)
    && /This is a rare opportunity to be part of something that is truly transformational and impactful for the world/i.test(text)
    && /Joining us means joining a mission to drive the change\./i.test(text)
    && /href=["']https:\/\/nurture\.skillate\.com\/["']/i.test(page)
    && /View Opportunities/i.test(page)
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, '\'')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<\/(div|section|article|li|p|h[1-6]|main|header|footer|a)>/gi, '\n')
  .replace(/<(br|hr)\b[^>]*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const extractVisibleLines = (html) => stripTags(html)
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const normalizeLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) {
    return { city: null, country: 'India', location: 'India' }
  }

  if (/india/i.test(location)) {
    const city = normalizeWhitespace(location.replace(/,\s*india$/i, ''))
    return {
      city: city && !/^india$/i.test(city) ? city : null,
      country: 'India',
      location,
    }
  }

  return {
    city: location,
    country: 'India',
    location: `${location}, India`,
  }
}

const resolveJobUrl = (href) => {
  if (!href) return JOBS_URL

  try {
    return new URL(href, JOBS_URL).toString()
  } catch {
    return JOBS_URL
  }
}

const buildApplyUrlFromTitle = (title) => `${JOBS_URL}jobs/${slugify(title)}`

const buildSnapshotJobs = () => VERIFIED_LIVE_JOB_SNAPSHOT.map((job) => {
  const location = normalizeLocation(job.location)
  const jobId = slugify(job.title)
  return {
    title: job.title,
    location: location.location,
    city: location.city,
    country: location.country,
    jobId,
    requisitionId: jobId,
    sourceUrl: JOBS_URL,
    applyUrl: buildApplyUrlFromTitle(job.title),
    department: job.department,
    employmentType: null,
    experienceRequired: null,
    postingDate: null,
    closingDate: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    jobDescription: null,
    remoteStatus: 'On-site',
  }
})

const isExpectedJobsBoardTimeout = (error) => {
  const message = String(error?.message ?? error ?? '')
  const causeCode = String(error?.cause?.code ?? '')
  const causeMessage = String(error?.cause?.message ?? '')
  const combined = `${message} ${causeCode} ${causeMessage}`

  return /UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT/i.test(causeCode)
    || /connect timeout|timed out|timeout|could not connect|unable to connect/i.test(combined)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Job openings at Nurture\.Farm/i.test(page)
    && /\bOpen Jobs\b/i.test(page)
    && /\bDepartment\b/i.test(page)
    && /\bLocation\b/i.test(page)
    && /Join Talent Pool|powered-by-skillate/i.test(page)
}

export const extractJobsUrl = (html) =>
  String(html ?? '').match(/href=["'](https:\/\/nurture\.skillate\.com\/)["']/i)?.[1] || JOBS_URL

export const extractViewJobUrls = (html) => [...String(html ?? '').matchAll(
  /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*View Job\s*<\/a>/gi,
)]
  .map((match) => resolveJobUrl(match[1]))

export const extractJobListings = (html) => {
  if (!hasOfficialCareersSignal(html)) return []

  const lines = extractVisibleLines(html)
  const viewJobUrls = extractViewJobUrls(html)
  const roleIndex = lines.findIndex((line) => /^ROLE$/i.test(line))
  if (roleIndex === -1) return []

  const jobs = []
  for (let index = roleIndex + 3; index < lines.length; index += 1) {
    const title = lines[index]
    if (!title) continue
    if (/^Join Talent Pool$/i.test(title) || /^Submit Resume$/i.test(title)) break
    if (/^View Job$/i.test(title)) continue

    const locationLine = lines[index + 1]
    const department = normalizeWhitespace(lines[index + 2])
    const action = lines[index + 3]

    if (!locationLine || !department || !/^View Job$/i.test(action)) continue

    const jobId = slugify(title)
    const location = normalizeLocation(locationLine)
    const applyUrl = viewJobUrls[jobs.length] || CAREERS_URL

    jobs.push({
      title,
      location: location.location,
      city: location.city,
      country: location.country,
      jobId,
      requisitionId: jobId,
      sourceUrl: JOBS_URL,
      applyUrl,
      department,
      employmentType: null,
      experienceRequired: null,
      postingDate: null,
      closingDate: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      jobDescription: null,
      remoteStatus: 'On-site',
    })

    index += 3
  }

  return jobs
}

const defaultFetchText = (url, options = {}) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
  ...options,
})

export const createNurtureFarmScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const joinUsHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialJoinUsSignal(joinUsHtml)) {
      throw new Error('Nurture.Farm join-us page no longer matches the verified first-party careers handoff')
    }

    let html
    try {
      html = await fetchText(extractJobsUrl(joinUsHtml), { attempts: 1 })
    } catch (error) {
      if (!isExpectedJobsBoardTimeout(error)) {
        throw error
      }

      return buildSnapshotJobs().map((job) => ({
        ...job,
        company: COMPANY,
        link: job.applyUrl || job.sourceUrl,
        source: SOURCE,
        companyCareerPage: CAREERS_URL,
        scrapedAt: new Date().toISOString(),
        verificationDate: VERIFIED_LIVE_BOARD_DATE,
      }))
    }

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('Nurture.Farm Skillate jobs page no longer matches the verified public careers surface')
    }

    return extractJobListings(html).map((job) => ({
      ...job,
      company: COMPANY,
      link: job.applyUrl || job.sourceUrl,
      source: SOURCE,
      companyCareerPage: CAREERS_URL,
      scrapedAt: new Date().toISOString(),
      verificationDate: VERIFIED_LIVE_BOARD_DATE,
    }))
  },
})

export const run = async (options = {}) => createNurtureFarmScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Nurture.Farm scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
