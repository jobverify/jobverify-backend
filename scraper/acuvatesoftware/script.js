import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { ACUVATE_SOFTWARE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = ACUVATE_SOFTWARE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLY_URL = PROVIDER_METADATA.applyUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#8217;|&rsquo;/gi, "'")
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Culture\s*(?:&|&amp;)\s*Careers\s*\|\s*Acuvate\s*<\/title>/i.test(page)
    && /Open Opportunities at Acuvate/i.test(page)
    && /Project Manager/i.test(page)
    && /CUX Designer/i.test(page)
    && /Agentic AI Architect/i.test(page)
    && /#fill_the_form/i.test(page)
}

export const extractJobs = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(
    /<section[^>]*class=["'][^"']*role-card[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
  )) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const location = normalizeWhitespace(block.match(/<strong>\s*Location:\s*<\/strong>\s*([^<]+)/i)?.[1])
    const department = normalizeWhitespace(block.match(/<strong>\s*Department:\s*<\/strong>\s*([^<]+)/i)?.[1]) || null
    const experienceRequired = normalizeWhitespace(block.match(/<strong>\s*Experience:\s*<\/strong>\s*([^<]+)/i)?.[1]) || null
    const employmentType = normalizeWhitespace(block.match(/<strong>\s*Job Type:\s*<\/strong>\s*([^<]+)/i)?.[1]) || null
    const href = block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1]
    const jobId = slugify(title)

    if (!title || !location || !href || !jobId) continue

    jobs.push({
      title,
      company: COMPANY,
      department,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: new URL(href, CAREERS_URL).toString(),
      employmentType,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

export const createAcuvateSoftwareScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Acuvate Software careers surface no longer matches the trusted first-party page')
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

export const run = async (options = {}) => createAcuvateSoftwareScraper().run(options)

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
