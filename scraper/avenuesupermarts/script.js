import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { withRetry } from '../../scraper-support/utils/retry.js'

import { AVENUE_SUPERMARTS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AVENUE_SUPERMARTS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const SUCCESSFACTORS_BOARD_URL = PROVIDER_METADATA.successFactorsBoardUrl
export const SUCCESSFACTORS_SEARCH_URL = PROVIDER_METADATA.successFactorsSearchUrl
export const SUCCESSFACTORS_COMPANY_TOKEN = PROVIDER_METADATA.successFactorsCompanyToken
export const DETAIL_URL_PREFIX = `https://career10.successfactors.com/career?career_ns=job_listing&company=${SUCCESSFACTORS_COMPANY_TOKEN}&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const SUCCESSFACTORS_VIEW_ID = '/ui/rcmcareer/pages/careersite/career.jsp.xhtml'
const SUCCESSFACTORS_DEFAULT_SORT_COLUMN = 'JOB_POSTING_DATE'
const SUCCESSFACTORS_DEFAULT_SORT_ORDER = 'DESC'
const NON_RETRIABLE_HTTP_STATUSES = new Set([401, 403, 404, 410, 451])

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) return normalized

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export const buildDetailUrl = (requisitionId) =>
  `${DETAIL_URL_PREFIX}&career_job_req_id=${encodeURIComponent(String(requisitionId))}&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta`

export const buildSearchUrl = () => SUCCESSFACTORS_SEARCH_URL

export const extractSuccessFactorsHandoffUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/career10\.successfactors\.com\/career\?company=avenuesupe)["']/i)
  return match ? match[1] : null
}

export const hasJavascriptShellCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*DMart\s*<\/title>/i.test(rawHtml)
    && /<noscript>[\s\S]*?You need to enable JavaScript to run this app\./i.test(rawHtml)
    && /<div[^>]+id=["']root["'][^>]*><\/div>/i.test(rawHtml)
    && /<script[^>]+src=["'][^"']*\/static\/js\/main\.[^"']+\.js["']/i.test(rawHtml)
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const hasLegacyCareersTitle = /<title>\s*Careers\s*\|\s*DMart\s*<\/title>/i.test(rawHtml)
  const hasLegacyCareersCopy = /DMart is constantly expanding/i.test(normalized || '')
    && /CURRENT OPENINGS/i.test(normalized || '')
    && /Explore our current openings below\. Good Luck!/i.test(normalized || '')
  const hasCurrentFirstPartyNav = /About us/i.test(normalized || '')
    && /Partner with us/i.test(normalized || '')
    && /Investor Relations/i.test(normalized || '')
  const hasLegacyCareersSurface = hasLegacyCareersTitle
    && (hasLegacyCareersCopy || hasCurrentFirstPartyNav)

  return hasLegacyCareersSurface || hasJavascriptShellCareersPageSignal(rawHtml)
}

export const hasSuccessFactorsSearchPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  return hasStaticSuccessFactorsSearchPageSignal(rawHtml)
    || hasSuccessFactorsDwrResponseSignal(rawHtml)
}

export const hasStaticSuccessFactorsSearchPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Career Opportunities\s*<\/title>/i.test(rawHtml)
    && /class="jobResultItem"/i.test(rawHtml)
    && new RegExp(`company=${SUCCESSFACTORS_COMPANY_TOKEN}`, 'i').test(rawHtml)
}

export const hasSuccessFactorsDwrBootstrapShellSignal = (html) => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Career Opportunities\s*<\/title>/i.test(rawHtml)
    && /id=["']candidateProfileTitle["'][^>]*>\s*Career Opportunities\s*</i.test(rawHtml)
    && /id=["']career_ns["'][^>]+value=["']job_listing_summary["']/i.test(rawHtml)
    && new RegExp(`id=["']company["'][^>]+value=["']${SUCCESSFACTORS_COMPANY_TOKEN}["']`, 'i').test(rawHtml)
    && /window\.addEventListener\(\s*["']load["']\s*,\s*getInitialJobSearchData\s*\)/i.test(rawHtml)
    && /careerJobSearchController\.getInitialJobSearchData\s*\(/i.test(rawHtml)
    && /id=["']careerJobSearchContainer["']/i.test(rawHtml)
}

export const hasSuccessFactorsDwrResponseSignal = (value) => {
  const raw = String(value ?? '')
  return /allowScriptTagRemoting is false\./i.test(raw)
    && /dwr\.engine\._remoteHandleCallback\(/i.test(raw)
    && /postingCount/i.test(raw)
}

const hasNextPage = (html) => /<a[^>]+title="Next Page"[^>]*>/i.test(String(html ?? ''))

const buildLocation = ({ city, state }) => {
  const parts = [normalizeWhitespace(city), normalizeWhitespace(state), 'India'].filter(Boolean)
  return parts.join(', ') || 'India'
}

const parseRow = (rowHtml) => {
  const title = stripTags(rowHtml.match(/<a[^>]*class="jobTitle"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || '')
  const values = [...String(rowHtml ?? '').matchAll(/<span class="jobContentEM">([\s\S]*?)<\/span>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  const requisitionId = normalizeWhitespace(values[0])
  const postingDate = toIsoDate(String(values[1] ?? '').replace(/^Posted on\s*/i, ''))
  const hiringEntity = normalizeWhitespace(values[2])
  const state = normalizeWhitespace(values[3])
  const city = normalizeWhitespace(values[4])
  const department = normalizeWhitespace(values[5])

  if (!title || !requisitionId) return null

  const detailUrl = buildDetailUrl(requisitionId)

  return {
    title,
    company: COMPANY_NAME,
    hiringEntity,
    department,
    location: buildLocation({ city, state }),
    city,
    state,
    country: 'India',
    jobId: requisitionId,
    requisitionId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    link: detailUrl,
    postingDate,
    jobDescription: null,
  }
}

const extractCookieHeader = (response) => {
  const setCookies = typeof response?.headers?.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : []

  const cookies = setCookies
    .map((value) => normalizeWhitespace(String(value ?? '').split(';', 1)[0]))
    .filter(Boolean)

  return cookies.length > 0 ? cookies.join('; ') : null
}

const extractHtmlTitle = (html) =>
  String(html ?? '').match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null

const buildHttpError = (response, url) => {
  const error = new Error(`HTTP ${response.status} for ${url}`)
  error.status = response.status

  if (NON_RETRIABLE_HTTP_STATUSES.has(response.status)) {
    error.abortRetries = true
  }

  return error
}

const buildUnexpectedHtmlResponseError = (url, html) => {
  const title = extractHtmlTitle(html)
  const error = new Error(`Expected SuccessFactors DWR JavaScript from ${url} but received HTML${title ? ` (${title})` : ''}`)

  if (/requested operation is not available|not authorized|access denied|forbidden/i.test(String(html ?? ''))) {
    error.abortRetries = true
  }

  return error
}

const getSearchPagePath = (searchUrl = SUCCESSFACTORS_SEARCH_URL) => {
  const url = new URL(searchUrl)
  return `${url.pathname}${url.search}`
}

const createScriptSessionId = () => `${randomBytes(16).toString('hex').toUpperCase()}240`

const extractAjaxToken = (html) =>
  normalizeWhitespace(String(html ?? '').match(/ajaxSecKey="([^"]+)"/i)?.[1])

const buildInitialSearchDwrBody = ({
  pagePath = getSearchPagePath(),
  scriptSessionId = createScriptSessionId(),
  browserTimeZone = 'Asia/Calcutta',
} = {}) => [
  'callCount=1',
  `page=${pagePath}`,
  'httpSessionId=',
  `scriptSessionId=${scriptSessionId}`,
  'c0-scriptName=careerJobSearchControllerProxy',
  'c0-methodName=getInitialJobSearchData',
  'c0-id=0',
  'c0-e1=string:',
  'c0-e2=string:',
  'c0-e3=string:',
  `c0-e4=string:${encodeURIComponent(browserTimeZone)}`,
  'c0-param0=Object_Object:{filterOnly:reference:c0-e1, jobAlertId:reference:c0-e2, returnToList:reference:c0-e3, browserTimeZone:reference:c0-e4}',
  'batchId=0',
  '',
].join('\n')

const buildPaginatedSearchDwrBody = ({
  pagePath = getSearchPagePath(),
  scriptSessionId,
  currentPage,
  pageSize,
  totalCount,
  sortByColumn = SUCCESSFACTORS_DEFAULT_SORT_COLUMN,
  sortOrder = SUCCESSFACTORS_DEFAULT_SORT_ORDER,
  batchId = Math.max(1, currentPage - 1),
  increaseCandSummaryPagination = false,
} = {}) => {
  const safePageSize = Math.max(1, Number.parseInt(pageSize, 10) || 10)
  const safeTotalCount = Math.max(safePageSize, Number.parseInt(totalCount, 10) || safePageSize)
  const safeCurrentPage = Math.max(1, Number.parseInt(currentPage, 10) || 1)
  const startRow = ((safeCurrentPage - 1) * safePageSize) + 1
  const endRow = Math.min(safeCurrentPage * safePageSize, safeTotalCount)

  return [
    'callCount=1',
    `page=${pagePath}`,
    'httpSessionId=',
    `scriptSessionId=${scriptSessionId}`,
    'c0-scriptName=careerJobSearchControllerProxy',
    'c0-methodName=search',
    'c0-id=0',
    `c0-e2=number:${safeCurrentPage}`,
    `c0-e3=number:${endRow}`,
    `c0-e4=boolean:${increaseCandSummaryPagination ? 'true' : 'false'}`,
    `c0-e5=number:${safePageSize}`,
    `c0-e6=number:${startRow}`,
    `c0-e7=number:${safeTotalCount}`,
    'c0-e1=Object_Object:{currentPage:reference:c0-e2, endRow:reference:c0-e3, increaseCandSummaryPagination:reference:c0-e4, pageSize:reference:c0-e5, startRow:reference:c0-e6, totalCount:reference:c0-e7}',
    `c0-e8=string:${sortByColumn}`,
    `c0-e9=string:${sortOrder}`,
    'c0-param0=Object_Object:{pagination:reference:c0-e1, sortByColumn:reference:c0-e8, sortOrder:reference:c0-e9}',
    `batchId=${Math.max(1, Number.parseInt(batchId, 10) || 1)}`,
    '',
  ].join('\n')
}

const fetchSuccessFactorsSearchSession = async ({
  searchUrl = SUCCESSFACTORS_SEARCH_URL,
  fetchImpl = fetch,
} = {}) => withRetry(async () => {
  const response = await fetchImpl(searchUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
    },
  })

  if (!response.ok) {
    throw buildHttpError(response, searchUrl)
  }

  const html = await response.text()
  const csrfToken = extractAjaxToken(html)

  if (!csrfToken) {
    const error = new Error('Avenue Supermarts verified SuccessFactors search bootstrap no longer exposes an ajaxSecKey token')
    error.abortRetries = true
    throw error
  }

  return {
    html,
    csrfToken,
    cookieHeader: extractCookieHeader(response),
  }
}, {
  attempts: 3,
  baseDelayMs: 500,
  label: `${SOURCE}-successfactors-bootstrap`,
})

const postSuccessFactorsDwr = async ({
  endpoint,
  body,
  csrfToken,
  cookieHeader,
  refererUrl = SUCCESSFACTORS_SEARCH_URL,
  subaction = 0,
  fetchImpl = fetch,
} = {}) => {
  const url = `https://career10.successfactors.com/xi/ajax/remoting/call/plaincall/careerJobSearchControllerProxy.${endpoint}.dwr`

  return withRetry(async () => {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        'Content-Type': 'text/plain',
        Referer: refererUrl,
        Origin: 'https://career10.successfactors.com',
        'x-csrf-token': csrfToken,
        'x-ajax-token': csrfToken,
        'x-sap-page-info': `companyId=${SUCCESSFACTORS_COMPANY_TOKEN}`,
        'x-subaction': String(subaction),
        viewid: SUCCESSFACTORS_VIEW_ID,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body,
    })

    if (!response.ok) {
      throw buildHttpError(response, url)
    }

    const text = await response.text()
    if (/<html\b/i.test(text)) {
      throw buildUnexpectedHtmlResponseError(url, text)
    }
    if (!hasSuccessFactorsDwrResponseSignal(text)) {
      const error = new Error(`Avenue Supermarts verified SuccessFactors ${endpoint} response no longer matches the expected DWR contract`)
      error.abortRetries = true
      throw error
    }

    return text
  }, {
    attempts: 3,
    baseDelayMs: 500,
    label: `${SOURCE}-successfactors-${endpoint}`,
  })
}

export const extractDwrPayload = (responseText) => {
  const rawText = String(responseText ?? '')
  if (!hasSuccessFactorsDwrResponseSignal(rawText)) return null

  let callbackValue = null
  const executable = rawText.replace(/^\s*throw 'allowScriptTagRemoting is false\.';\s*/i, '')
  const sandbox = {
    dwr: {
      engine: {
        _remoteHandleCallback(_batchId, _callId, value) {
          callbackValue = value
        },
      },
    },
  }

  try {
    vm.runInNewContext(executable, sandbox, { timeout: 1000 })
  } catch (error) {
    throw new Error(
      'Avenue Supermarts verified SuccessFactors DWR search payload could not be parsed',
      { cause: error },
    )
  }

  const payload = callbackValue?.payload?.results
    ? callbackValue.payload
    : callbackValue

  if (!payload?.results || !Array.isArray(payload.results.postings)) {
    throw new Error('Avenue Supermarts verified SuccessFactors DWR payload no longer exposes postings')
  }

  return payload
}

const flattenPostingFields = (value) => {
  if (!value) return []
  if (!Array.isArray(value)) return [value]
  return value.flatMap((entry) => flattenPostingFields(entry))
}

const buildPostingFieldMap = (posting) => {
  const fields = new Map()

  for (const entry of flattenPostingFields(posting?.otherValues)) {
    const fieldId = normalizeWhitespace(entry?.fieldId)
    if (!fieldId || fields.has(fieldId)) continue
    fields.set(fieldId, normalizeWhitespace(entry?.shortVal ?? entry?.longVal ?? entry?.internalVal))
  }

  return fields
}

export const extractDwrSearchResults = (responseText) => {
  const payload = extractDwrPayload(responseText)
  const detailUrlPrefix = normalizeWhitespace(payload?.results?.detailURLPrefix)

  return payload.results.postings
    .map((posting) => {
      const fields = buildPostingFieldMap(posting)
      const requisitionId = normalizeWhitespace(posting?.id)

      if (!requisitionId) return null

      const detailUrl = detailUrlPrefix?.includes('career_job_req_id=')
        ? buildDetailUrl(requisitionId)
        : buildDetailUrl(requisitionId)

      return {
        title: normalizeWhitespace(posting?.title),
        company: COMPANY_NAME,
        hiringEntity: fields.get('filter1') || null,
        department: fields.get('filter4') || null,
        location: buildLocation({
          city: fields.get('filter3'),
          state: fields.get('filter2'),
        }),
        city: fields.get('filter3') || null,
        state: fields.get('filter2') || null,
        country: 'India',
        jobId: requisitionId,
        requisitionId,
        sourceUrl: detailUrl,
        applyUrl: detailUrl,
        link: detailUrl,
        postingDate: toIsoDate(posting?.postingDate),
        jobDescription: null,
      }
    })
    .filter(Boolean)
}

export const extractSearchResults = (html) => {
  if (hasSuccessFactorsDwrResponseSignal(html)) {
    return extractDwrSearchResults(html)
  }

  const rows = []

  for (const match of String(html ?? '').matchAll(/<tr[^>]*class="jobResultItem"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = parseRow(match[1])
    if (row) rows.push(row)
  }

  return rows
}

const extractDescriptionFromText = (text) => {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return null

  const explicitSection = normalized.match(/FUNCTION\s*:\s*[\s\S]+$/i)?.[0]
  if (explicitSection) {
    return normalizeWhitespace(
      explicitSection.replace(/\s*Apply Save Job Email Job to Friend Return to List\s*$/i, ''),
    )
  }

  return normalized
}

export const extractJobDetail = (html, listing = {}) => {
  const rawHtml = String(html ?? '')
  const bodyText = stripTags(rawHtml) || ''
  const detailSectionHtml = rawHtml.match(/<div[^>]*class="jobdescription"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
  const title = normalizeWhitespace(
    (stripTags(rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || listing.title || '') || '')
      .replace(/^Career Opportunities:\s*/i, '')
      .replace(/\s*\(\d+\)\s*$/i, ''),
  )
  const requisitionId = normalizeWhitespace(
    bodyText.match(/\bRequisition ID\s*([0-9]+)\b/i)?.[1] || listing.requisitionId || listing.jobId,
  )
  const postingDate = toIsoDate(
    bodyText.match(/\bPosted\s*([0-9/]{10})\b/i)?.[1] || listing.postingDate,
  )
  const jobDescription = detailSectionHtml
    ? stripTags(detailSectionHtml)
    : extractDescriptionFromText(bodyText)

  return {
    title: title || listing.title || null,
    requisitionId,
    postingDate,
    applyUrl: buildDetailUrl(requisitionId || listing.requisitionId || listing.jobId),
    jobDescription: jobDescription || listing.jobDescription || null,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 3,
  baseDelayMs: 500,
  timeoutMs: 30000,
  label: `${SOURCE}-html`,
})

export const getLiveSearchPages = async ({
  fetchText = defaultFetchText,
  fetchSearchSession = (options = {}) => fetchSuccessFactorsSearchSession(options),
  fetchDwrText = (options = {}) => postSuccessFactorsDwr(options),
  searchUrl = SUCCESSFACTORS_SEARCH_URL,
} = {}) => {
  const html = await fetchText(searchUrl)
  if (hasStaticSuccessFactorsSearchPageSignal(html)) {
    if (hasNextPage(html)) {
      throw new Error(
        'Avenue Supermarts API-only migration required: the verified SuccessFactors board requires pagination, but no HTTP pagination request contract is available; browser automation is disabled.',
      )
    }

    return [html]
  }

  if (!hasSuccessFactorsDwrBootstrapShellSignal(html)) {
    return [html]
  }

  const session = await fetchSearchSession({ searchUrl })
  if (!hasSuccessFactorsDwrBootstrapShellSignal(session.html)) {
    throw new Error('Avenue Supermarts verified SuccessFactors search bootstrap no longer matches the known public page')
  }

  const pagePath = getSearchPagePath(searchUrl)
  const scriptSessionId = createScriptSessionId()
  const initialResponse = await fetchDwrText({
    endpoint: 'getInitialJobSearchData',
    body: buildInitialSearchDwrBody({ pagePath, scriptSessionId }),
    csrfToken: session.csrfToken,
    cookieHeader: session.cookieHeader,
    refererUrl: searchUrl,
    subaction: 0,
  })
  const initialPayload = extractDwrPayload(initialResponse)
  const initialPagination = initialPayload.results.options?.pagination || {}
  const pageSize = Math.max(
    1,
    Number.parseInt(initialPagination.pageSize, 10) || initialPayload.results.postings.length || 10,
  )
  const totalCount = Math.max(
    initialPayload.results.postings.length,
    Number.parseInt(initialPagination.totalCount, 10)
      || Number.parseInt(initialPayload.results.postingCount, 10)
      || initialPayload.results.postings.length,
  )
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const sortByColumn = normalizeWhitespace(initialPayload.results.options?.sortByColumn)
    || SUCCESSFACTORS_DEFAULT_SORT_COLUMN
  const sortOrder = normalizeWhitespace(initialPayload.results.options?.sortOrder)
    || SUCCESSFACTORS_DEFAULT_SORT_ORDER
  const pages = [initialResponse]

  for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
    pages.push(await fetchDwrText({
      endpoint: 'search',
      body: buildPaginatedSearchDwrBody({
        pagePath,
        scriptSessionId,
        currentPage,
        pageSize,
        totalCount,
        sortByColumn,
        sortOrder,
        batchId: currentPage - 1,
      }),
      csrfToken: session.csrfToken,
      cookieHeader: session.cookieHeader,
      refererUrl: searchUrl,
      subaction: currentPage - 1,
    }))
  }

  return pages
}

const collectSummaryPages = (pages) => {
  const listings = []
  const seenRequisitionIds = new Set()

  if (!Array.isArray(pages) || pages.length === 0 || !hasSuccessFactorsSearchPageSignal(pages[0])) {
    throw new Error('Avenue Supermarts verified SuccessFactors search surface no longer matches the known public page')
  }

  for (const html of pages) {
    const pageJobs = extractSearchResults(html)

    for (const job of pageJobs) {
      if (seenRequisitionIds.has(job.requisitionId)) continue
      seenRequisitionIds.add(job.requisitionId)
      listings.push(job)
    }

  }

  return listings
}

export const createAvenueSupermartsScraper = ({
  fetchText = defaultFetchText,
  getSearchPages = (options = {}) => getLiveSearchPages({ ...options, fetchText }),
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Avenue Supermarts verified DMart careers page no longer matches the known public surface')
    }

    const isJavascriptShellCareersPage = hasJavascriptShellCareersPageSignal(careersHtml)
    const handoffUrl = extractSuccessFactorsHandoffUrl(careersHtml)
    if (!isJavascriptShellCareersPage && handoffUrl !== SUCCESSFACTORS_BOARD_URL) {
      throw new Error('Avenue Supermarts verified DMart careers page no longer exposes the known SuccessFactors handoff')
    }

    const searchPages = await getSearchPages({ searchUrl: buildSearchUrl(), fetchText })
    const listings = collectSummaryPages(searchPages)
    const jobs = []

    for (const listing of listings) {
      let detail = listing

      try {
        const detailHtml = await fetchText(listing.sourceUrl)
        detail = extractJobDetail(detailHtml, listing)
      } catch {
        detail = listing
      }

      jobs.push({
        ...listing,
        ...detail,
        source: SOURCE,
        company: COMPANY_NAME,
        country: 'India',
        companyCareerPage: CAREERS_PAGE_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
        link: detail.applyUrl || listing.applyUrl || listing.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createAvenueSupermartsScraper(options).run()

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
