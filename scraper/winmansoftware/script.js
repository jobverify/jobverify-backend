import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { WINMAN_SOFTWARE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = WINMAN_SOFTWARE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLY_URL = PROVIDER_METADATA.applyUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')

const normalizeWhitespace = (value) => decodeHtml(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(li|p|div|tr|td|th|h[1-6]|ul|ol)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripToLines = (value) => decodeHtml(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(li|p|div|tr|td|th|h[1-6]|ul|ol)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  const lowerNormalized = normalized.toLowerCase()

  return lowerNormalized.includes('careers for experience candidates - winman software')
    && page.includes('experienced_table')
    && lowerNormalized.includes('designation and job profile')
    && lowerNormalized.includes('apply now')
    && lowerNormalized.includes('senior accountant')
    && lowerNormalized.includes('electrical maintenance supervisor')
    && (page.includes(APPLY_URL) || page.includes('https://winman.in/jobs/resumedetail.aspx'))
}

export const hasCurrentCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Careers\s*(?:&#8211;|–)\s*Winman Software\s*<\/title>/i.test(page)
    && /<table\b[^>]*id=["']freshers["']/i.test(page)
    && /<table\b[^>]*id=["']experienced["']/i.test(page)
    && page.includes(APPLY_URL)
}

export const extractCurrentListings = (html = '') => {
  const page = String(html ?? '')
  if (!hasCurrentCareersSignal(page)) throw new Error('Winman current first-party careers page changed')
  const freshersTable = page.match(/<table\b[^>]*id=["']freshers["'][\s\S]*?<\/table>/i)?.[0]
  const experiencedTable = page.match(/<table\b[^>]*id=["']experienced["'][\s\S]*?<\/table>/i)?.[0]
  if (!freshersTable || !experiencedTable) throw new Error('Winman current job tables are missing')

  const freshers = [...freshersTable.matchAll(/<a\b[^>]*href=["'](https:\/\/www\.winmansoftware\.com\/more\/careers\/[a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => ({ title: normalizeWhitespace(match[2]), detailUrl: match[1] }))
  const experienced = [...experiencedTable.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(match => {
      const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1])
      const title = normalizeWhitespace(cells[0]?.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1])
      if (!title) return null
      return {
        title,
        experienceRequired: normalizeWhitespace(cells[1]),
        description: stripToLines(cells[0]).filter(line => line !== title).join(' '),
      }
    }).filter(Boolean)
  if (!freshers.length || !experienced.length
    || new Set(freshers.map(job => job.detailUrl)).size !== freshers.length
    || [...freshers, ...experienced].some(job => !job.title)
    || experienced.some(job => !job.experienceRequired || !job.description)) {
    throw new Error('Winman current job inventory is incomplete')
  }
  return { freshers, experienced }
}

export const extractCurrentFresherDetail = (html, listing) => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(page.match(/<h1\b[^>]*class=["']job-title["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  const summary = page.match(/<ul\b[^>]*class=["']job-summary["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1]
  const description = summary && stripToLines(summary).join(' ')
  const qualification = normalizeWhitespace(page.match(/<p\b[^>]*class=["']qualification["'][^>]*>([\s\S]*?)<\/p>/i)?.[1])
  if (title !== listing.title || !description || !qualification || !page.includes(APPLY_URL)
    || !/Winman Software India LLP/i.test(page) || !/Mangalore/i.test(page)) {
    throw new Error(`Winman current job detail changed: ${listing.detailUrl}`)
  }
  return { title, description, qualification }
}

const buildCurrentJob = ({ title, description, qualification = null, experienceRequired = null, sourceUrl, scrapedAt }) => {
  const jobId = slugify(title)
  if (!jobId) throw new Error('Winman current job ID is missing')
  return {
    title, company: COMPANY, department: null,
    location: 'Mangaluru, Karnataka, India', city: 'Mangaluru', country: 'India',
    jobId, requisitionId: jobId, sourceUrl, applyUrl: APPLY_URL,
    employmentType: null, experienceRequired,
    minimumQualification: qualification, preferredQualification: null,
    requiredSkills: [], postingDate: null, closingDate: null,
    jobDescription: description, remoteStatus: 'On-site',
    source: SOURCE, link: APPLY_URL, scrapedAt,
  }
}

export const extractJobs = (html = '') => {
  const jobs = []

  for (const rowMatch of String(html ?? '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => match[1])
    if (cells.length < 2) continue

    const title = normalizeWhitespace(cells[0].match(/<h5[^>]*>([\s\S]*?)<\/h5>/i)?.[1])
    const experienceRequired = normalizeWhitespace(cells[1])
    const description = stripToLines(cells[0])
      .filter((line) => line !== title)
      .join(' ')
      .trim() || null
    const jobId = slugify(title)

    if (!title || !experienceRequired || !jobId) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: 'Mangaluru, Karnataka, India',
      city: 'Mangaluru',
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: APPLY_URL,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: description,
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

export const createWinmanSoftwareScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (hasCurrentCareersSignal(careersHtml)) {
      const { freshers, experienced } = extractCurrentListings(careersHtml)
      const scrapedAt = new Date().toISOString()
      const freshJobs = []
      for (let index = 0; index < freshers.length; index += 4) {
        const batch = await Promise.all(freshers.slice(index, index + 4).map(async listing => {
          const detail = extractCurrentFresherDetail(await fetchText(listing.detailUrl), listing)
          return buildCurrentJob({ title: detail.title, description: detail.description,
            qualification: detail.qualification, sourceUrl: listing.detailUrl, scrapedAt })
        }))
        freshJobs.push(...batch)
      }
      const jobs = [...freshJobs, ...experienced.map(job => buildCurrentJob({
        title: job.title, description: job.description, experienceRequired: job.experienceRequired,
        sourceUrl: CAREERS_URL, scrapedAt,
      }))]
      if (new Set(jobs.map(job => job.jobId)).size !== jobs.length) throw new Error('Winman current job IDs are duplicated')
      const selected = maxJobs ? jobs.slice(0, maxJobs) : jobs
      return selected.map(job => ({ ...job, ...(selected.length < jobs.length ? { sourceListingComplete: false } : {}) }))
    }
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Winman Software careers surface no longer matches the trusted first-party page')
    }

    const jobs = extractJobs(careersHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createWinmanSoftwareScraper().run(options)

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
