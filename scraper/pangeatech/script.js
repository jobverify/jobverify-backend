import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'pangeatech'
export const COMPANY = 'Pangea Tech'
export const VERIFIED_AT = '2026-07-13'
export const CANONICAL_HOST_CHECKS = [
  { url: 'https://pangea.tech/', expected: 'dns' },
  { url: 'https://www.pangea.tech/', expected: 'dns' },
  { url: 'https://pangeatech.com/', expected: 'unreachable' },
  { url: 'https://www.pangeatech.com/', expected: 'unreachable' },
  { url: 'https://pangeatech.in/', expected: 'dns' },
  { url: 'https://www.pangeatech.in/', expected: 'dns' },
]
export const UNRELATED_LIVE_HOST_URL = 'https://pangea-tech.com/'
export const UNRELATED_LIVE_HOST_ROUTE_URLS = [
  'https://pangea-tech.com/careers',
  'https://pangea-tech.com/jobs',
  'https://pangea-tech.com/about-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bjob opportunities\b/i,
  /\bcareer opportunities\b/i,
  /\bjoin our team\b/i,
  /\bapply now\b/i,
  /\bapply here\b/i,
  /\bview jobs\b/i,
  /\bview openings\b/i,
  /\bopen roles\b/i,
  /\bwe(?:'re| are)? hiring\b/i,
  /\bvacan(?:cy|cies)\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
]

const DNS_RESOLUTION_FAILURE_PATTERNS = [
  /\bgetaddrinfo\s+enotfound\b/i,
  /\benotfound\b/i,
  /\bthe remote name could not be resolved\b/i,
  /\bname or service not known\b/i,
  /\bnxdomain\b/i,
]

const UNREACHABLE_HOST_FAILURE_PATTERNS = [
  /\bcould not connect to server\b/i,
  /\beconnrefused\b/i,
  /\beconnreset\b/i,
  /\bsocket hang up\b/i,
  /\bconnection refused\b/i,
  /\btimed out\b/i,
  /\bssl\/tls secure channel\b/i,
  /\btrust relationship\b/i,
  /\bunexpected error occurred on a send\b/i,
]

const UNTRUSTED_UNRELATED_HOST_FAILURE_PATTERNS = [
  /hostname\/ip does not match certificate'?s altnames/i,
  /connect\.multilinkbroadcast\.co\.uk/i,
  /cert/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

const collectErrorMessages = (error) => {
  const messages = []
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    visited.add(current)

    if (current.message) {
      messages.push(current.message)
    } else if (typeof current === 'string') {
      messages.push(current)
    }

    current = current.cause
  }

  return messages.filter(Boolean).join(' | ') || String(error ?? '')
}

const defaultFetchPage = async (url) => {
  try {
    return await withRetry(async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: createTimeoutSignal(15000),
      })

      return {
        status: response.status,
        url: response.url,
        html: await response.text(),
        errorMessage: '',
      }
    }, {
      attempts: 3,
      baseDelayMs: 2000,
      label: SOURCE,
    })
  } catch (error) {
    return {
      status: 'FETCH_ERROR',
      url,
      html: '',
      errorMessage: collectErrorMessages(error),
    }
  }
}

export const hasPublicJobsSignal = (value) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

const hasDnsResolutionFailure = (value) =>
  DNS_RESOLUTION_FAILURE_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

const hasUnreachableHostFailure = (value) =>
  UNREACHABLE_HOST_FAILURE_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

const hasUntrustedUnrelatedHostFailure = (value) =>
  UNTRUSTED_UNRELATED_HOST_FAILURE_PATTERNS.every((pattern) => pattern.test(String(value ?? '')))

export const isVerifiedCanonicalHostAbsence = (check, page = {}) => {
  if (!check?.expected) return false

  const normalizedText = normalizeWhitespace(page.html)
  if (normalizedText !== '') return false
  if (String(page.status) !== 'FETCH_ERROR') return false

  if (check.expected === 'dns') {
    return hasDnsResolutionFailure(page.errorMessage)
  }

  if (check.expected === 'unreachable') {
    return hasUnreachableHostFailure(page.errorMessage)
  }

  return false
}

export const hasVerifiedUnrelatedLiveHostSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Multilink Broadcast Connect\s*<\/title>/i.test(page)
    && /href="https:\/\/multilinkbroadcast\.co\.uk\/favicon\.ico"/i.test(page)
    && /alt="Multilink Broadcast"/i.test(page)
    && /placeholder="Enter Username"/i.test(page)
    && /placeholder="Password"/i.test(page)
    && normalized.includes('connect')
    && normalized.includes('this system works best using the latest version of google chrome')
}

export const isVerifiedUnavailableUnrelatedHost = (page = {}) =>
  String(page?.status) === 'FETCH_ERROR'
  && normalizeWhitespace(page?.html) === ''
  && hasUntrustedUnrelatedHostFailure(page?.errorMessage)

export const isVerifiedMissingUnrelatedHostRoute = (page = {}) => {
  const resolvedUrl = String(page.url ?? '')
  const html = String(page.html ?? '')
  const normalized = normalizeWhitespace(html).toLowerCase()

  return resolvedUrl.startsWith(UNRELATED_LIVE_HOST_URL)
    && page.status === 404
    && /<title>\s*404 Not Found\s*<\/title>/i.test(html)
    && normalized.includes('the requested url was not found on this server.')
    && normalized.includes('apache server at pangea-tech.com port 443')
    && !hasPublicJobsSignal(html)
}

export const createPangeatechScraper = (deps = {}) => ({
  // No trustworthy public jobs contract is currently available for Pangea Tech.
  async run(runtime = {}) {
    return []
  },
})

export const createPangeaTechScraper = createPangeatechScraper

export const run = async (options = {}) => createPangeatechScraper().run(options)

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
