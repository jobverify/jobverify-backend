import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { AEON_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AEON_CATALOG.source
export const COMPANY = AEON_CATALOG.companyName
export const HOMEPAGE_URL = 'https://www.aeoncredit.co.in/'
export const CAREERS_URL = AEON_CATALOG.companyCareerPage
export const JOIN_US_URL = AEON_CATALOG.joinUsUrl
export const PORTAL_ORIGIN = 'https://careers-aeoncredit.peoplestrong.com'
export const JOB_LISTINGS_URL = AEON_CATALOG.jobListingsUrl
export const ACCEPTED_JOB_LISTINGS_URLS = [
  JOB_LISTINGS_URL,
  `${PORTAL_ORIGIN}/portal/home`,
]
export const VERIFIED_SURFACE_SUMMARY = AEON_CATALOG.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERN =
  /candidate portal|job detail|current openings|apply now|open positions|job openings/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const hasCareersLink = /href=["'](?:https:\/\/www\.aeoncredit\.co\.in)?\/careers["']/i.test(rawHtml)
  const hasLegacyGroupSignal = /AEON Group is consisting of about 300 Subsidiary Companies/i.test(normalized)
  const hasProductSignal = /Personal Loan,\s*Two wheeler loan and More/i.test(normalized)

  return /Personal Loan,\s*Two wheeler loan and More \| Aeon Credit/i.test(rawHtml)
    && (hasProductSignal || /Aeon Credit - Personal Loan,\s*Two wheeler loan and more/i.test(normalized))
    && (hasLegacyGroupSignal || /Hot Offers/i.test(normalized))
    && /AEON CREDIT SERVICE INDIA PVT\. LTD\./i.test(normalized)
    && hasCareersLink
}

export const hasOfficialCareersHubSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const hasJoinUsLink = /href=["'](?:https:\/\/www\.aeoncredit\.co\.in)?\/careers\/join-us["']/i.test(rawHtml)

  return /Careers @ AEON India/i.test(normalized)
    && /Why Join Us/i.test(normalized)
    && /Life at ÆON|Life at AEON/i.test(normalized)
    && /Join Us/i.test(normalized)
    && /Fast Growing Organization/i.test(normalized)
    && hasJoinUsLink
}

export const hasOfficialJoinUsSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /Are you the right fit\?/i.test(normalized)
    && /View Job Vacancy/i.test(normalized)
    && /Explore opportunities at Aeon Credit Service/i.test(normalized)
    && /cv@aeoncredit\.co\.in/i.test(normalized)
}

export const extractJobListingsUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*View Job Vacancy\s*<\/a>/gi)) {
    try {
      return new URL(match[1], JOIN_US_URL).toString()
    } catch {
      continue
    }
  }

  return null
}

export const isAcceptedJobListingsUrl = (value) =>
  ACCEPTED_JOB_LISTINGS_URLS.some((url) => {
    try {
      return new URL(value).toString() === new URL(url).toString()
    } catch {
      return false
    }
  })

export const hasBlockedPublicJobListingsSignal = ({ status, url, html } = {}) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return status === 403
    && isAcceptedJobListingsUrl(url)
    && normalized.includes('403 forbidden')
    && normalized.includes('request forbidden by administrative rules')
}

export const createAeonScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('AEON verified official homepage no longer matches the known public surface')
    }

    const careersHub = await fetchPage(CAREERS_URL)
    if (careersHub.status !== 200 || !hasOfficialCareersHubSignal(careersHub.html)) {
      throw new Error('AEON verified careers hub no longer matches the known first-party public surface')
    }

    const joinUsPage = await fetchPage(JOIN_US_URL)
    if (joinUsPage.status !== 200 || !hasOfficialJoinUsSignal(joinUsPage.html)) {
      throw new Error('AEON verified join-us page no longer matches the known first-party public surface')
    }

    const jobListingsUrl = extractJobListingsUrl(joinUsPage.html)
    if (!isAcceptedJobListingsUrl(jobListingsUrl)) {
      throw new Error('AEON verified public job vacancy handoff no longer matches the known PeopleStrong URL')
    }

    const jobListingsPage = await fetchPage(jobListingsUrl)
    if (hasBlockedPublicJobListingsSignal(jobListingsPage)) {
      return []
    }

    if (jobListingsPage.status === 200 && PUBLIC_JOB_SIGNAL_PATTERN.test(jobListingsPage.html || '')) {
      throw new Error('AEON public job listings surface no longer matches the verified blocked state')
    }

    throw new Error('AEON public job listings surface no longer matches the verified blocked state')
  },
})

export const run = async (options = {}) => createAeonScraper().run(options)

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
