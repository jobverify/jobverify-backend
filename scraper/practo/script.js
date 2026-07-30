import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PRACTO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PRACTO_CATALOG.source
export const COMPANY = PRACTO_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = PRACTO_CATALOG.officialBrandName
export const VERIFIED_ON = PRACTO_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PRACTO_CATALOG.verifiedSurfaceSummary
export const OFFICIAL_CAREERS_URL = PRACTO_CATALOG.companyCareerPage
export const SEARCH_API_URL = PRACTO_CATALOG.officialSearchApiUrl
export const ZWAYAM_COMPANY_ID = PRACTO_CATALOG.zwayamCompanyId
export const ZWAYAM_DETAIL_COMPANY_ID = PRACTO_CATALOG.zwayamDetailCompanyId

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const buildFormData = (form) => {
  const formData = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    ...(options.headers || {}),
  }

  let body
  if (options.form) {
    body = buildFormData(options.form)
  } else if (options.json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const buildSearchPayload = () => ({
  companyId: 'practo',
})

export const hasVerifiedCareersShellSignals = (html) => {
  const page = String(html ?? '')
  const hasVerifiedTitle = /<title>\s*Practo \| Careers\s*<\/title>/i.test(page)
  const hasVerifiedDescription = /<meta name="description" content="Practo Careers">/i.test(page)
  const hasVerifiedBaseHref = /<base href="\/practo\/">/i.test(page)
  const hasLegacyShell = /current_openings/i.test(page)
    && /Search Jobs/i.test(page)
  const hasCurrentShell = /<app-root>/i.test(page)
    && /current_openings/i.test(page)
    && /<script[^>]+src="runtime\.[^"]+\.js"[^>]*type="module"/i.test(page)
    && /<script[^>]+src="main\.[^"]+\.js"[^>]*type="module"/i.test(page)

  return hasVerifiedTitle
    && hasVerifiedDescription
    && hasVerifiedBaseHref
    && (hasLegacyShell || hasCurrentShell)
}

export const extractSearchRecords = (payload) =>
  Array.isArray(payload?.data?.data)
    ? payload.data.data.map((record) => record?._source || record).filter(Boolean)
    : []

export const isSuppressedRecord = (record = {}) =>
  normalizeWhitespace(record.otherStatusOne) === 'Hidden'
  && normalizeWhitespace(record.otherStatusTwo) === 'Closed'
  && normalizeWhitespace(record.requisitionStatus) === 'A'
  && String(record.appliesNotBlocked ?? '') === '0'

export const allSearchRecordsAreSuppressed = (payload) => {
  const records = extractSearchRecords(payload)
  return records.length > 0 && records.every((record) => isSuppressedRecord(record))
}

export const createPractoScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasVerifiedCareersShellSignals(careersHtml)) {
      throw new Error('Practo verified careers shell no longer matches the official first-party page')
    }

    const searchPayload = await fetchJson(SEARCH_API_URL, {
      method: 'POST',
      form: buildSearchPayload(),
    })

    if (!allSearchRecordsAreSuppressed(searchPayload)) {
      throw new Error('Practo official careers payload now appears to expose public jobs')
    }

    void now
    return []
  },
})

export const run = async (options = {}) => createPractoScraper().run(options)

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
