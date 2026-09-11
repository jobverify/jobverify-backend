import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { DIXON_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = DIXON_TECHNOLOGIES_CATALOG.companyName
export const SOURCE = DIXON_TECHNOLOGIES_CATALOG.source
export const HOMEPAGE_URL = DIXON_TECHNOLOGIES_CATALOG.homepageUrl
export const OFFICIAL_CAREERS_URL = DIXON_TECHNOLOGIES_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL =
  DIXON_TECHNOLOGIES_CATALOG.officialCareersHandoffUrl
export const DARWINBOX_COMPANY_ID = DIXON_TECHNOLOGIES_CATALOG.darwinboxCompanyId
export const DARWINBOX_ORIGIN = DIXON_TECHNOLOGIES_CATALOG.darwinboxOrigin
export const PUBLIC_PORTAL_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`
export const VERIFIED_ON = DIXON_TECHNOLOGIES_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = DIXON_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = DIXON_TECHNOLOGIES_CATALOG

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'
const OFFICIAL_PAGE_TIMEOUT_MS = 15000

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractHomepageWorkWithUsUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/www\.dixoninfo\.com\/job-openings/i)
  return normalizeWhitespace(match?.[0])
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(
    /https:\/\/dixon\.darwinbox\.in\/ms\/candidate\/careers/i,
  )

  return normalizeWhitespace(match?.[0])
}

export const hasOfficialDixonHomepageSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  return extractTitle(page) === 'Electronics Manufacturing Services | Dixon Technologies'
    && text.includes('precision and performance in every product')
    && text.includes('work with us')
    && extractHomepageWorkWithUsUrl(page) === OFFICIAL_CAREERS_URL
}

export const hasOfficialDixonJobOpeningsSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  return extractTitle(page) === 'Job Openings | Dixon Technologies'
    && text.includes('grow with us')
    && text.includes('a great place to work.')
    && text.includes('voices of dixon')
    && text.includes('explore job openings')
    && text.includes('submit your resume')
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'dixon-technologies-official',
  timeoutMs: OFFICIAL_PAGE_TIMEOUT_MS,
})

const OFFICIAL_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const isCertificateError = (error) => {
  const message = String(error?.message ?? error ?? '')
  const code = String(error?.code ?? error?.cause?.code ?? '')
  return /certificate has expired|cert_has_expired|err_cert_date_invalid/i.test(`${message} ${code}`)
}

const fetchTextIgnoringTlsErrors = (url, {
  headers = OFFICIAL_HEADERS,
  timeoutMs = OFFICIAL_PAGE_TIMEOUT_MS,
  redirectsRemaining = 5,
} = {}) => new Promise((resolve, reject) => {
  const parsedUrl = new URL(url)
  const requestImpl = parsedUrl.protocol === 'http:' ? http : https

  const request = requestImpl.request(parsedUrl, {
    method: 'GET',
    headers,
    rejectUnauthorized: true,
  }, (response) => {
    const status = Number(response.statusCode) || 0
    const location = response.headers?.location

    if (status >= 300 && status < 400 && location) {
      response.resume()

      if (redirectsRemaining <= 0) {
        reject(new Error(`Too many redirects for ${url}`))
        return
      }

      const nextUrl = new URL(location, url).toString()
      resolve(fetchTextIgnoringTlsErrors(nextUrl, {
        headers,
        timeoutMs,
        redirectsRemaining: redirectsRemaining - 1,
      }))
      return
    }

    let body = ''
    response.setEncoding('utf8')
    response.on('data', (chunk) => {
      body += chunk
    })
    response.on('end', () => {
      if (status < 200 || status >= 300) {
        const error = new Error(`HTTP ${status} for ${url}`)
        error.status = status
        reject(error)
        return
      }

      resolve(body)
    })
  })

  request.setTimeout(timeoutMs, () => {
    request.destroy(new Error(`The operation was aborted due to timeout after ${timeoutMs}ms`))
  })
  request.on('error', reject)
  request.end()
})

const defaultFetchInsecureText = (url) => fetchTextIgnoringTlsErrors(url)

export const createDixonTechnologiesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchInsecureText = defaultFetchInsecureText,
    fetchListingPage,
  } = {}) {
    const fetchOfficialPage = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isCertificateError(error)) {
          throw error
        }

        return fetchInsecureText(url)
      }
    }

    const homepageHtml = await fetchOfficialPage(HOMEPAGE_URL)

    if (!hasOfficialDixonHomepageSignals(homepageHtml)) {
      throw new Error('Dixon Technologies verified official homepage no longer matches the verified public surface')
    }

    const careersHtml = await fetchOfficialPage(OFFICIAL_CAREERS_URL)

    if (!hasOfficialDixonJobOpeningsSignals(careersHtml)) {
      throw new Error('Dixon Technologies verified official job openings page no longer matches the verified public surface')
    }

    const jobs = await darwinboxScraper.run({
      maxPages,
      maxJobs,
      fetchListingPage,
    })
    const scrapedAt = now()

    return jobs.map((job) => ({
      ...job,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createDixonTechnologiesScraper().run(options)

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
