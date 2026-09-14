import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://careers.chitkara.edu.in'
export const CAREERS_URL = `${BASE_URL}/`
const JOBS_API_URL = 'https://api.chitkara.edu.in/jobpost/getAll'

const SOURCE = 'chitkarauniversity'
const COMPANY = 'Chitkara University'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const slugFromUrl = (url) => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || null
  } catch {
    return null
  }
}

const extractField = (block, className) => normalizeWhitespace(
  block.match(new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'))?.[1],
)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full time' || normalized === 'full-time') return 'Full-time'
  if (normalized === 'part time' || normalized === 'part-time') return 'Part-time'
  return normalizeWhitespace(value)
}

const inferRemoteStatus = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase() || ''
  if (normalized.includes('remote')) return 'Remote'
  if (normalized.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

const extractDescription = (html) => stripTags(
  String(html ?? '').match(/<(section|div)[^>]*class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i)?.[2],
)

const extractHasNextPage = (html) => /class=["'][^"']*next[^"']*page-numbers[^"']*["']/i.test(String(html ?? ''))

export const buildPageUrl = (page = 1) => {
  const normalizedPage = Math.max(1, Number(page) || 1)
  return normalizedPage === 1 ? CAREERS_URL : `${CAREERS_URL}page/${normalizedPage}/`
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /job-posted-box/i.test(page)
    && /(gform_wrapper|Apply Now)/i.test(page)
}

const getPublicAppBundleUrl = (html) => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(page.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || ''
  if (!/^Chitkara University\b/i.test(title)
    || !/id=["']positions["']/i.test(page)
    || !/View All Positions/i.test(page)) return null
  const scriptPath = page.match(/<script\b[^>]*\bsrc=["'](\/_next\/static\/chunks\/app\/page-[\w-]+\.js)["']/i)?.[1]
  return scriptPath ? new URL(scriptPath, CAREERS_URL).href : null
}

const extractPublicApiJobs = (payload) => {
  if (payload?.statusCode !== 200 || !Array.isArray(payload.data)) {
    throw new Error('Chitkara public jobs API returned an invalid response')
  }
  const seen = new Set()
  return payload.data.map((row) => {
    if (!row || typeof row.id !== 'string' || !row.id.trim() || seen.has(row.id)
      || typeof row.title !== 'string' || !normalizeWhitespace(row.title)
      || ['responsibilities', 'qualifications', 'requiredSkill'].some((key) => !Array.isArray(row[key])
        || row[key].some((item) => typeof item !== 'string'))) {
      throw new Error('Chitkara public jobs API returned an invalid or duplicate role')
    }
    seen.add(row.id)
    const location = normalizeWhitespace(row.location)
    const city = /^(Rajpura|Mohali)\b/i.exec(location || '')?.[1] || null
    const country = /\b(?:Rajpura|Mohali|Himachal Pradesh|India)\b/i.test(location || '') ? 'India' : null
    const sourceUrl = `${CAREERS_URL}#positions`
    return {
      title: normalizeWhitespace(row.title), company: COMPANY,
      department: normalizeWhitespace(row.category), location, city, country,
      jobId: row.id, requisitionId: row.id, sourceUrl, applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(row.schedule),
      experienceRequired: normalizeWhitespace(row.experience),
      minimumQualification: normalizeWhitespace(row.mandatoryEducation),
      preferredQualification: normalizeWhitespace(row.qualifications.join(' ')),
      requiredSkills: row.requiredSkill.map(normalizeWhitespace).filter(Boolean),
      postingDate: Number.isFinite(Date.parse(row.jobs_created_at)) ? new Date(row.jobs_created_at).toISOString() : null,
      closingDate: null,
      jobDescription: normalizeWhitespace([row.summary, ...row.responsibilities, ...row.qualifications].filter(Boolean).join(' ')),
      remoteStatus: location ? inferRemoteStatus(location) : null,
    }
  })
}

export const extractListings = (html) => [...String(html ?? '').matchAll(
  /<div[^>]+class=["'][^"']*job-posted-box[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
)]
  .map((match) => {
    const block = match[1]
    const sourceUrl = toAbsoluteUrl(block.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1])
    const title = normalizeWhitespace(block.match(/<h[1-6][^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h[1-6]>/i)?.[1])
    const location = extractField(block, 'job-location')
    const city = normalizeWhitespace(location)?.split(',')[0] || null
    const jobId = slugFromUrl(sourceUrl)

    if (!sourceUrl || !title || !jobId) return null

    return {
      title,
      company: COMPANY,
      department: extractField(block, 'job-domain'),
      location,
      city,
      country: /india/i.test(location || '') ? 'India' : null,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(extractField(block, 'job-type')),
      experienceRequired: extractField(block, 'job-experience'),
      minimumQualification: extractField(block, 'job-education'),
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]),
      remoteStatus: inferRemoteStatus(location),
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => ({
  ...listing,
  title: normalizeWhitespace(String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || listing.title || null,
  jobDescription: extractDescription(html) || listing.jobDescription || null,
  applyUrl: listing.sourceUrl || listing.applyUrl || null,
  sourceUrl: listing.sourceUrl || null,
  remoteStatus: inferRemoteStatus(listing.location),
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createChitkaraUniversityScraper = ({ maxJobs = null, maxPages = Number.POSITIVE_INFINITY } = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const jobs = []

    for (let page = 1; page <= maxPages; page += 1) {
      const pageUrl = buildPageUrl(page)
      const pageHtml = await fetchText(pageUrl)

      const publicAppBundleUrl = page === 1 ? getPublicAppBundleUrl(pageHtml) : null
      if (publicAppBundleUrl) {
        const bundle = await fetchText(publicAppBundleUrl)
        if (!/fetch\(\s*["']https:\/\/api\.chitkara\.edu\.in\/jobpost\/getAll["']\s*\)/.test(bundle)) {
          throw new Error('Chitkara public careers app no longer confirms the verified jobs API')
        }
        const apiJobs = extractPublicApiJobs(JSON.parse(await fetchText(JOBS_API_URL)))
        const selectedJobs = Number.isInteger(maxJobs) ? apiJobs.slice(0, maxJobs) : apiJobs
        return selectedJobs.map((job) => ({ ...job, source: SOURCE, link: job.sourceUrl, scrapedAt: now() }))
      }

      if (page === 1 && !hasOfficialCareersSignal(pageHtml)) {
        throw new Error('verified Chitkara University careers surface no longer matches the official public careers page')
      }

      const listings = extractListings(pageHtml)
      if (listings.length === 0) break

      for (const listing of listings) {
        const detailHtml = await fetchText(listing.sourceUrl)
        jobs.push({
          ...extractJobDetail(detailHtml, listing),
          source: SOURCE,
          link: listing.sourceUrl,
          scrapedAt: now(),
        })

        if (Number.isInteger(maxJobs) && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!extractHasNextPage(pageHtml)) {
        break
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createChitkaraUniversityScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
