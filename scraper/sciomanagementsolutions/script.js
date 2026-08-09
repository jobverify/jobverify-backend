import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SCIOMS_CATALOG from './catalog.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SCIOMS_CATALOG
export const SOURCE = SCIOMS_CATALOG.source
export const COMPANY = SCIOMS_CATALOG.companyName
export const VERIFIED_ON = SCIOMS_CATALOG.verifiedOn
export const CAREERS_URL = SCIOMS_CATALOG.companyCareerPage
export const APPLY_URL = SCIOMS_CATALOG.applyUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const PROTOCOL_PARSE_ERROR_PATTERN =
  /response does not match the http\/1\.1 protocol|invalid header value char|hpe_invalid_header_token|http parser error/i

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const collectSignals = (html, patterns) => {
  const normalized = normalizeWhitespace(html)
  return patterns.every((pattern) => pattern.test(normalized))
}

const hasVerifiedTitleSignal = (html = '') =>
  /SCIO Management Solutions[^A-Za-z0-9]+Intelligent,\s*Automated RCM Services/i
    .test(normalizeWhitespace(html))

const PLACEHOLDER_POSITION_PATTERNS = [
  /^--\s*select position\s*--$/i,
  /^select position$/i,
]

const ACTUAL_PUBLIC_JOB_PATTERNS = [
  /\bjob\s*id\b/i,
  /\brequisition\b/i,
  /\bjob openings?\b/i,
  /\bopen positions?\b/i,
  /\/job(s)?\//i,
]

const isProtocolParseError = (error) => {
  const message = String(error?.message ?? error ?? '')
  const causeMessage = String(error?.cause?.message ?? '')
  const causeCode = String(error?.cause?.code ?? '')
  return PROTOCOL_PARSE_ERROR_PATTERN.test(`${message} ${causeCode} ${causeMessage}`)
}

const buildBrokenHttpSurfaceError = (surfaceLabel, error) => {
  const upstreamError = new Error(
    `SCIO Management Solutions verified ${surfaceLabel} currently returns a broken HTTP/1.1 response`,
    { cause: error },
  )
  upstreamError.softFailure = true
  upstreamError.upstreamOutage = true
  upstreamError.failureKind = 'network_or_timeout'
  upstreamError.abortRetries = true
  return upstreamError
}

export const extractPositionOptions = (html = '') =>
  [...String(html ?? '').matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
    .filter((option) => !PLACEHOLDER_POSITION_PATTERNS.some((pattern) => pattern.test(option)))

export const hasVerifiedCareersSignal = (html = '') => {
  return hasVerifiedTitleSignal(html)
    && collectSignals(html, [
      /\bLife at SCIO\b/i,
      /\bCurrent Openings\b/i,
      /\bGrowth Pathways\b/i,
      /\bRecognition\b/i,
      /\bRoles across Operations\b/i,
      /\bTech\b/i,
      /\bAnalytics\b/i,
      /SCIO Management Solutions empowers healthcare organizations with data-driven insights and smart analytics\./i,
    ])
}

export const hasVerifiedApplyFormSignal = (html = '') => {
  return hasVerifiedTitleSignal(html)
    && collectSignals(html, [
      /\bApply Now\b/i,
      /--\s*Select Position\s*--/i,
      /Upload Resume\s*\(PDF\/DOC\/DOCX\)/i,
      /\bSubmit\b/i,
    ])
}

export const hasPublicJobListingsSignal = (html = '') =>
  extractPositionOptions(html).length > 0
  || ACTUAL_PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createScioManagementSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    let careersHtml
    try {
      careersHtml = await fetchText(CAREERS_URL)
    } catch (error) {
      if (isProtocolParseError(error)) {
        throw buildBrokenHttpSurfaceError('careers shell', error)
      }
      throw error
    }

    if (!hasVerifiedCareersSignal(careersHtml)) {
      throw new Error('Response is not the verified SCIO Management Solutions careers shell')
    }

    let applyHtml
    try {
      applyHtml = await fetchText(APPLY_URL)
    } catch (error) {
      if (isProtocolParseError(error)) {
        throw buildBrokenHttpSurfaceError('apply form shell', error)
      }
      throw error
    }

    if (!hasVerifiedApplyFormSignal(applyHtml)) {
      throw new Error('Response is not the verified SCIO Management Solutions apply form shell')
    }

    if (hasPublicJobListingsSignal(careersHtml) || hasPublicJobListingsSignal(applyHtml)) {
      throw new Error('SCIO Management Solutions careers surface now exposes public positions')
    }

    return []
  },
})

export const run = async (options = {}) => createScioManagementSolutionsScraper().run(options)

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
