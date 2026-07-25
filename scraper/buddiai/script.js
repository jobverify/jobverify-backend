import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { normalizeCity } from '../utils/cityNormalizer.js'

import { BUDDI_AI_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const toAnchorUrl = (title) => `${CAREERS_URL}#${slugify(title)}`

const normalizeIndiaLocation = (value) => {
  const cleaned = normalizeWhitespace(String(value ?? '').replace(/^Location:\s*/i, ''))
  if (!cleaned) return null
  if (/\bchennai\b/i.test(cleaned)) return 'Chennai, India'
  return cleaned
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers\s*-\s*BUDDI\.AI\s*<\/title>/i.test(page)
    && text.includes("You're in good company")
    && text.includes('Hello Automation, Goodbye Complexity.')
}

export const extractJobs = (html = '') => {
  const jobs = []
  const page = String(html ?? '')

  for (const match of page.matchAll(/<section[^>]*class=["'][^"']*role[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi)) {
    const block = match[1]
    const department = normalizeWhitespace(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const title = normalizeWhitespace(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1])
    const locationMatch = block.match(/Location:\s*([^<]+)/i) || block.match(/<p[^>]*>([^<]*United States of America[^<]*)<\/p>/i)
    const location = normalizeIndiaLocation(locationMatch?.[1])
    const jobDescription = normalizeWhitespace(block.match(/Specializations:\s*([^<]+)/i)?.[0])

    if (!title || !location || !/\bindia\b/i.test(location)) continue

    const city = normalizeCity(location.split(',')[0]) || location.split(',')[0].trim()
    const anchorUrl = toAnchorUrl(title)
    const jobId = slugify(title)

    jobs.push({
      title,
      company: COMPANY,
      department: department || null,
      location,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: anchorUrl,
      applyUrl: anchorUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: jobDescription || null,
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

export const createBuddiAiScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified BUDDI.AI careers surface no longer matches the trusted first-party page')
    }

    const scrapedAt = now()
    return extractJobs(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createBuddiAiScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
