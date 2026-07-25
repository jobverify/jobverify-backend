import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const LISTING_PAGE_URL = 'https://careers.brillio.com/job-listing/'
export const DETAIL_PAGE_URL_PREFIX = 'https://careers.brillio.com/job-details?job-id='
export const APPLY_PAGE_URL_PREFIX = 'https://careers.brillio.com/privacy-notice?job-id='

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const MAX_LISTING_PAGES = 50

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#8211;/gi, (entity) => {
      if (/8211/.test(entity)) return '-'
      return "'"
    })
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  if (!value) return null
  return new URL(value, LISTING_PAGE_URL).toString()
}

const extractCity = (location) => normalizeWhitespace(
  normalizeWhitespace(location)?.split(',')[0],
)

const isIndiaLocation = (value) => /\bindia\b/i.test(String(value ?? ''))

const buildPrivacyNoticeUrl = (jobId) => (
  jobId ? `${APPLY_PAGE_URL_PREFIX}${jobId}` : null
)

const extractJobIdFromDetailUrl = (value) => {
  try {
    return normalizeWhitespace(new URL(value).searchParams.get('job-id'))
  } catch {
    return null
  }
}

export const buildListingUrl = (page = 1) => (
  page <= 1
    ? LISTING_PAGE_URL
    : new URL(`job-listing/page/${page}/`, 'https://careers.brillio.com/').toString()
)

export const extractListingJobs = (html) => {
  const jobs = []
  const pattern = /<div class="job-list-wrap job_list">[\s\S]*?<a href="([^"]*job-details\?job-id=[^"]+)"><\/a>[\s\S]*?<div class="job-card">[\s\S]*?<h4>([\s\S]*?)<\/h4>[\s\S]*?<p class="infoline">[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/p>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const detailUrl = toAbsoluteUrl(match[1])
    const jobId = extractJobIdFromDetailUrl(detailUrl)

    jobs.push({
      detailUrl,
      jobId,
      title: normalizeWhitespace(match[2]),
      location: normalizeWhitespace(match[3]),
      department: normalizeWhitespace(match[4]),
      requisitionId: normalizeWhitespace(match[5]),
      summary: normalizeWhitespace(match[6]),
    })
  }

  return jobs
}

const extractDetailContentHtml = (html) => {
  const source = String(html ?? '')
  const startMarker = '<div class="_detail-content">'
  const startIndex = source.indexOf(startMarker)
  if (startIndex < 0) return ''

  const afterStart = source.slice(startIndex + startMarker.length)
  const endCandidates = [
    afterStart.indexOf('<div class="_sidelist">'),
    afterStart.indexOf('<div class="col-lg-4 col-md-12">'),
    afterStart.indexOf('</section>'),
  ].filter((index) => index >= 0)

  if (endCandidates.length === 0) return afterStart
  return afterStart.slice(0, Math.min(...endCandidates))
}

export const extractJobDetail = (html, { jobId = null } = {}) => {
  const source = String(html ?? '')
  const title = normalizeWhitespace((source.match(/<h1>([\s\S]*?)<\/h1>/i) || [])[1])
  const applyUrl = toAbsoluteUrl(
    (source.match(/<a[^>]+href="([^"]+)"[^>]*>\s*APPLY\s*<\/a>/i) || [])[1],
  ) || buildPrivacyNoticeUrl(jobId)

  const contentHtml = extractDetailContentHtml(source)
  const descriptionWithoutTitle = contentHtml.replace(/<h1>[\s\S]*?<\/h1>/i, ' ')
  const primarySkillsHtml = (descriptionWithoutTitle.match(
    /<h6>\s*Primary Skills\s*<\/h6>\s*<ul>([\s\S]*?)<\/ul>/i,
  ) || [])[1]
  const primarySkillsText = stripTags(primarySkillsHtml)
  const requiredSkills = primarySkillsText
    ? primarySkillsText.split(',').map((skill) => normalizeWhitespace(skill)).filter(Boolean)
    : []

  return {
    title,
    applyUrl,
    requiredSkills,
    jobDescription: stripTags(descriptionWithoutTitle),
  }
}

export const extractSearchResults = ({
  listingHtmlByUrl = {},
  detailHtmlByUrl = {},
} = {}) => {
  const jobs = []
  const seenDetailUrls = new Set()

  for (const html of Object.values(listingHtmlByUrl)) {
    for (const listing of extractListingJobs(html)) {
      if (!listing.detailUrl || seenDetailUrls.has(listing.detailUrl)) continue
      if (!isIndiaLocation(listing.location)) continue

      seenDetailUrls.add(listing.detailUrl)
      const detail = extractJobDetail(detailHtmlByUrl[listing.detailUrl] || '', {
        jobId: listing.jobId,
      })

      jobs.push({
        title: detail.title || listing.title,
        company: 'Brillio',
        department: listing.department,
        location: listing.location,
        city: extractCity(listing.location),
        country: 'India',
        jobId: listing.jobId,
        requisitionId: listing.requisitionId,
        sourceUrl: listing.detailUrl,
        applyUrl: detail.applyUrl || buildPrivacyNoticeUrl(listing.jobId),
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: detail.requiredSkills,
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription || listing.summary,
        remoteStatus: null,
      })
    }
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'brillio',
  timeoutMs: 15000,
})

export const createBrillioScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const listingHtmlByUrl = {}

    for (let page = 1; page <= MAX_LISTING_PAGES; page += 1) {
      const url = buildListingUrl(page)
      const html = await fetchText(url)
      const listings = extractListingJobs(html)

      if (listings.length === 0) {
        break
      }

      listingHtmlByUrl[url] = html
    }

    const detailHtmlByUrl = {}
    const detailUrls = new Set(
      Object.values(listingHtmlByUrl)
        .flatMap((html) => extractListingJobs(html))
        .filter((listing) => isIndiaLocation(listing.location))
        .map((listing) => listing.detailUrl),
    )

    for (const url of detailUrls) {
      try {
        detailHtmlByUrl[url] = await fetchText(url)
      } catch {
        detailHtmlByUrl[url] = ''
      }
    }

    const jobs = extractSearchResults({ listingHtmlByUrl, detailHtmlByUrl })
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'brillio',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createBrillioScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Brillio scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'brillio')
    console.log('DB result:', result)
    process.exit(0)
  }
}
