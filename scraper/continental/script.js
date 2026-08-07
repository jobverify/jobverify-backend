import path from 'path'
import { fileURLToPath } from 'url'

import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'
import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://jobs.continental.com/en/'
export const RESULTS_API_URL = 'https://jobs.continental.com/en/api/result-list/pagetype-jobs/'
export const INDIA_LOCATION = JSON.stringify({
  title: 'Indien',
  type: 'country',
  countryCode: 'in',
})

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const extractFirst = (pattern, value) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? match[1] : null
}

const stripPageText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|hr|\/section)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const getRemoteStatus = (value) => {
  if (/hybrid/i.test(value || '')) return 'Hybrid'
  if (/remote/i.test(value || '')) return 'Remote'
  if (/on\s*site/i.test(value || '')) return 'On-site'
  return null
}

const buildDescription = (listing) => [
  listing.fieldOfWorkLabel ? `Field of work: ${normalizeWhitespace(listing.fieldOfWorkLabel)}.` : null,
  listing.jobFlexibilityLabel ? `Flexibility: ${normalizeWhitespace(listing.jobFlexibilityLabel)}.` : null,
].filter(Boolean).join(' ') || null

const extractDetailSectionText = (html, target) => stripPageText(
  extractFirst(
    new RegExp(
      `<div\\b[^>]*data-accordion-target=["']${target}["'][^>]*>([\\s\\S]*?)(?:<span\\b[^>]*class=["'][^"']*c-readmore__button|<\\/div>\\s*<\\/div>)`,
      'i',
    ),
    html,
  ),
)

const extractDetailTitle = (html, listing = {}) => normalizeWhitespace(
  extractFirst(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i, html)
  || extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)
  || extractFirst(/<title[^>]*>([\s\S]*?)<\/title>/i, html)?.replace(/\s*\|\s*Continental\s*$/i, '')
  || listing.title,
)

const inferExperienceRequired = (...texts) => {
  for (const text of texts) {
    const normalized = normalizeWhitespace(text)
    if (!normalized) continue

    const experienceProfile = extractJobFilterSignals({
      description: normalized,
    })?.experienceProfile
    const evidence = normalizeWhitespace(experienceProfile?.evidence)
    if (evidence && experienceProfile?.confidence === 'high') {
      return evidence
    }
  }

  return null
}

export const isRemovedJobDetailPage = (html = '') => /unable to find any job opportunities|vacancy has been removed/i
  .test(stripPageText(html) || '')

export const extractJobDetailFromHtml = (html, listing = {}) => {
  if (isRemovedJobDetailPage(html)) {
    return null
  }

  const tasks = extractDetailSectionText(html, 'contentsection-job-description')
  const qualifications = extractDetailSectionText(html, 'contentsection-qualifications')
  const detailDescription = [
    tasks,
    qualifications,
  ].filter(Boolean).join('\n\n') || listing.jobDescription || null

  return {
    ...listing,
    title: extractDetailTitle(html, listing) || listing.title || null,
    jobDescription: detailDescription,
    experienceRequired: inferExperienceRequired(qualifications, detailDescription) || listing.experienceRequired || null,
    publicExperienceChecked: true,
  }
}

export const buildIndiaSearchRequest = ({ currentPage = 1, itemsPerPage = 100 } = {}) => {
  const body = new FormData()
  body.append('tx_conjobs_api[filter][location]', INDIA_LOCATION)
  body.append('tx_conjobs_api[itemsPerPage]', String(itemsPerPage))

  if (currentPage > 1) {
    body.append('tx_conjobs_api[currentPage]', String(currentPage))
  }

  return {
    url: RESULTS_API_URL,
    options: {
      method: 'POST',
      body,
    },
  }
}

export const extractSearchResults = (payload) => {
  const listings = Array.isArray(payload?.result?.list) ? payload.result.list : []

  return listings
    .filter((listing) => normalizeWhitespace(listing.countryLabel) === 'India')
    .map((listing) => {
      const city = normalizeWhitespace(listing.cityLabel)
      const jobId = normalizeWhitespace(listing.refNumber || listing.internalId)
      const sourceUrl = normalizeWhitespace(listing.absoluteUrl)

      return {
        title: normalizeWhitespace(listing.title),
        company: 'Continental',
        department: normalizeWhitespace(listing.fieldOfWorkLabel),
        location: city ? `${city}, India` : 'India',
        city,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        remoteStatus: getRemoteStatus(listing.jobFlexibilityLabel),
        postingDate: normalizeWhitespace(listing.publicationDate),
        closingDate: null,
        requiredSkills: [],
        jobDescription: buildDescription(listing),
      }
    })
    .filter((job) => job.title && job.sourceUrl)
}

const defaultFetchJson = (url, options) => fetchJsonWithRetry(url, {
  ...options,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    Accept: 'application/json',
  },
  label: 'continental',
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'continental-detail',
  timeoutMs: 30000,
})

export const createContinentalScraper = () => ({
  async run({
    fetchJson = defaultFetchJson,
    fetchText = defaultFetchText,
    maxPages = null,
    maxJobs = null,
  } = {}) {
    const jobs = []
    let currentPage = 1

    while (!maxPages || currentPage <= maxPages) {
      const request = buildIndiaSearchRequest({ currentPage })
      const payload = await fetchJson(request.url, request.options)
      const pageJobs = extractSearchResults(payload)

      for (const listing of pageJobs) {
        let job = listing

        try {
          const detailHtml = await fetchText(listing.sourceUrl)
          job = extractJobDetailFromHtml(detailHtml, listing) || null
        } catch {
          job = listing
        }

        if (!job) continue
        jobs.push(job)

        if (maxJobs && jobs.length >= maxJobs) break
      }

      if (maxJobs && jobs.length >= maxJobs) break

      const pagination = payload?.result?.pagination
      if (!pagination?.nextPage || pagination.isLastPage) break
      currentPage = pagination.nextPage
    }

    return (maxJobs ? jobs.slice(0, maxJobs) : jobs).map((job) => ({
      ...job,
      source: 'continental',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createContinentalScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total India jobs scraped: ${jobs.length}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'continental')
  }
}
