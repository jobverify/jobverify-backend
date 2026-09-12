import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'storeysrealestate'
export const COMPANY = 'Storeys Real Estate'
export const HOMEPAGE_URL = 'https://www.storeys.ae/'
export const CAREERS_URL = 'https://www.storeys.ae/careers'
export const CAREERS_API_URL = 'https://api.storeys.ae/api/v1/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 15000
const MAX_REDIRECTS = 5

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bcareer opportunities\b/i,
  /\bsearch jobs\b/i,
  /\bview openings\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bjoin our team\b/i,
  /\bwe(?:'re| are)? hiring\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
]

const CERTIFICATE_ERROR_PATTERNS = [
  /\bcertificate has expired\b/i,
  /\bcert_has_expired\b/i,
  /\berr_cert_date_invalid\b/i,
  /\bdepth_zero_self_signed_cert\b/i,
  /\bself[-\s]signed certificate\b/i,
  /\bunable to verify the first certificate\b/i,
]

const TIMEOUT_ERROR_PATTERNS = [
  /\btimeout\b/i,
  /\btimed out\b/i,
  /\boperation was aborted\b/i,
  /\baborted\b/i,
  /\bund_err_connect_timeout\b/i,
  /\bheaders timeout\b/i,
  /\bbody timeout\b/i,
  /\bconnect timeout\b/i,
]

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\\u003c/gi, '<')
  .replace(/\\u003e/gi, '>')
  .replace(/\\u0026/gi, '&')
  .replace(/\\\//g, '/')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractErrorMessage = (error) =>
  String(error?.cause?.message ?? error?.message ?? error ?? '')

const isOfficialDomainUrl = (value) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'storeys.ae'
      || hostname === 'www.storeys.ae'
      || hostname === 'api.storeys.ae'
  } catch {
    return false
  }
}

const fetchPageIgnoringTlsErrors = (url, redirectsRemaining = MAX_REDIRECTS) =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const requestImpl = parsedUrl.protocol === 'http:' ? http : https

    const request = requestImpl.request(parsedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
      },
      rejectUnauthorized: true,
    }, (response) => {
      const status = Number(response.statusCode) || 0
      const location = response.headers.location

      if (status >= 300 && status < 400 && location) {
        response.resume()

        if (redirectsRemaining <= 0) {
          reject(new Error(`Too many redirects for ${url}`))
          return
        }

        const nextUrl = new URL(location, parsedUrl).toString()
        resolve(fetchPageIgnoringTlsErrors(nextUrl, redirectsRemaining - 1))
        return
      }

      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        resolve({
          status,
          url: parsedUrl.toString(),
          contentType: String(response.headers['content-type'] || ''),
          html: Buffer.concat(chunks).toString('utf8'),
          errorMessage: '',
        })
      })
    })

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`timeout for ${url}`))
    })
    request.on('error', reject)
    request.end()
  })

const defaultFetchPage = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
      },
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
    })

    return {
      status: response.status,
      url: response.url,
      contentType: String(response.headers?.get?.('content-type') || ''),
      html: await response.text(),
      errorMessage: '',
    }
  } catch (error) {
    const errorMessage = extractErrorMessage(error)

    if (hasRecoverableCertificateError(errorMessage)) {
      try {
        return await fetchPageIgnoringTlsErrors(url)
      } catch (fallbackError) {
        const fallbackErrorMessage = extractErrorMessage(fallbackError)
        return {
          status: hasTimeoutError(fallbackErrorMessage) ? 'TIMEOUT' : 'NETWORK_ERROR',
          url,
          contentType: '',
          html: '',
          errorMessage: fallbackErrorMessage,
        }
      }
    }

    return {
      status: hasTimeoutError(errorMessage) ? 'TIMEOUT' : 'NETWORK_ERROR',
      url,
      contentType: '',
      html: '',
      errorMessage,
    }
  }
}

export const hasPublicJobsSignal = (value) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const hasRecoverableCertificateError = (value) =>
  CERTIFICATE_ERROR_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const hasTimeoutError = (value) =>
  TIMEOUT_ERROR_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const hasBrokenWordPressJsonSignal = (page = {}) => {
  const raw = String(page.html ?? '')
  const normalized = normalizeWhitespace(raw)

  return Number(page.status) === 500
    && isOfficialDomainUrl(page.url || '')
    && /application\/json/i.test(String(page.contentType || ''))
    && /"code"\s*:\s*"internal_server_error"/i.test(raw)
    && /"status"\s*:\s*500/i.test(raw)
    && normalized.includes('There has been a critical error on this website.')
    && normalized.includes('Learn more about troubleshooting WordPress.')
    && !hasPublicJobsSignal(raw)
}

export const hasUnavailableCareersApiSignal = (page = {}) => {
  if (hasPublicJobsSignal(page.html)) {
    return false
  }

  if (!isOfficialDomainUrl(page.url || CAREERS_API_URL)) {
    return false
  }

  if (String(page.status) === 'TIMEOUT') {
    return hasTimeoutError(page.errorMessage)
  }

  return hasBrokenWordPressJsonSignal(page)
}

export const createStoreysRealEstateScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!hasBrokenWordPressJsonSignal(homepage)) {
      throw new Error('Storeys official homepage no longer matches the verified broken first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (!hasBrokenWordPressJsonSignal(careersPage)) {
      throw new Error('Storeys careers page no longer matches the verified broken first-party surface')
    }

    const careersApi = await fetchPage(CAREERS_API_URL)
    if (!hasUnavailableCareersApiSignal(careersApi)) {
      throw new Error('Storeys careers api no longer matches the verified unavailable first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createStoreysRealEstateScraper().run(options)

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
