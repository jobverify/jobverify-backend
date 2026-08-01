import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { JOHNSON_CONTROLS_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = JOHNSON_CONTROLS_INDIA_CATALOG.source
export const COMPANY = JOHNSON_CONTROLS_INDIA_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = JOHNSON_CONTROLS_INDIA_CATALOG.officialBrandName
export const CAREERS_URL = JOHNSON_CONTROLS_INDIA_CATALOG.companyCareerPage
export const ALGOLIA_SEARCH_URL = JOHNSON_CONTROLS_INDIA_CATALOG.algoliaSearchUrl
export const ALGOLIA_APPLICATION_ID = JOHNSON_CONTROLS_INDIA_CATALOG.algoliaApplicationId
export const ALGOLIA_API_KEY = JOHNSON_CONTROLS_INDIA_CATALOG.algoliaApiKey
export const ALGOLIA_INDEX_NAME = JOHNSON_CONTROLS_INDIA_CATALOG.algoliaIndexName
export const PROVIDER_METADATA = JOHNSON_CONTROLS_INDIA_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const DETAIL_URL_BASE = 'https://jobs.johnsoncontrols.com/job/'
const DEFAULT_PAGE_SIZE = 100

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) =>
  normalizeWhitespace(
    decodeHtmlEntities(value)
      .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
      .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizeArray = (value) =>
  (Array.isArray(value) ? value : [value])
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean)

const firstValue = (value) => normalizeArray(value)[0] || null

const buildDetailUrl = (requisitionId) => {
  const normalized = normalizeWhitespace(requisitionId)
  return normalized ? `${DETAIL_URL_BASE}${normalized}` : null
}

const chooseLocation = (hit = {}) =>
  firstValue(hit.location)
  || normalizeArray(hit.locations_list).find((value) => /(?:^|,\s*)India(?:$|[\s,)(-])/i.test(value))
  || firstValue(hit.locations_list)
  || null

const deriveCity = (hit = {}, location = null) => {
  const scopedCity = getValidIndiaCityForJob({
    country: firstValue(hit.country),
    city: firstValue(hit.geo_city),
    location,
    locations: normalizeArray(hit.locations_list),
  })

  if (scopedCity) return scopedCity

  const firstToken = normalizeWhitespace(location)?.split(',').at(-1)?.trim()
  if (!firstToken || /^india$/i.test(firstToken)) return null
  return normalizeCity(firstToken)
}

const isIndiaHit = (hit = {}) =>
  firstValue(hit.country)?.toLowerCase() === 'india'
  || normalizeArray(hit.locations_list).some((value) => /(?:^|,\s*)India(?:$|[\s,)(-])/i.test(value))
  || Boolean(getValidIndiaCityForJob({
    location: chooseLocation(hit),
    locations: normalizeArray(hit.locations_list),
  }))

const inferRemoteStatus = (hit = {}, location = null) => {
  const haystack = [location, ...normalizeArray(hit.locations_list)].filter(Boolean).join(' | ')

  if (/\bhybrid\b/i.test(haystack)) return 'Hybrid'
  if (/\bremote\b/i.test(haystack)) return 'Remote'
  return 'On-site'
}

export const hasOfficialSearchPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Job Search - Johnson Controls Careers\s*<\/title>/i.test(page)
    && /id=["']searchbox["']/i.test(page)
    && /id=["']clear-refinements["'][^>]*>\s*Reset filters\s*</i.test(page)
    && /algoliasearch\/dist\/algoliasearch-lite\.umd\.js/i.test(page)
    && /instantsearch\.js\/dist\/instantsearch\.production\.min\.js/i.test(page)
    && /production_JCI_jobs%5BrefinementList%5D%5Bparent_category%5D%5B0%5D=Engineering/i.test(page)
}

export const buildAlgoliaSearchRequestBody = ({
  page = 0,
  hitsPerPage = DEFAULT_PAGE_SIZE,
} = {}) => ({
  requests: [
    {
      indexName: ALGOLIA_INDEX_NAME,
      params: new URLSearchParams({
        facetFilters: JSON.stringify([['locations_list:India']]),
        hitsPerPage: String(hitsPerPage),
        page: String(page),
        query: '',
      }).toString(),
    },
  ],
})

const getPrimaryAlgoliaResult = (payload) => {
  const result = Array.isArray(payload?.results) ? payload.results[0] : null
  const hits = Array.isArray(result?.hits) ? result.hits : null

  if (!hits) {
    throw new Error('Johnson Controls India Algolia payload no longer matches the verified search response')
  }

  return result
}

export const extractJohnsonControlsIndiaJobsFromAlgoliaPayload = (
  payload,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) =>
  getPrimaryAlgoliaResult(payload).hits
    .filter((hit) => isIndiaHit(hit))
    .map((hit) => {
      const title = normalizeWhitespace(hit?.title)
      const requisitionId = firstValue(hit?.job_requisition_id) || normalizeWhitespace(hit?.external_id)
      const location = chooseLocation(hit)
      const link = buildDetailUrl(requisitionId)
      const applyUrl = firstValue(hit?.application_url) || link

      if (!title || !requisitionId || !location || !link || !applyUrl) {
        throw new Error('Johnson Controls India Algolia payload no longer exposes the verified India job fields')
      }

      return {
        title,
        company: COMPANY,
        location,
        city: deriveCity(hit, location),
        country: 'India',
        link,
        applyUrl,
        sourceUrl: link,
        source: SOURCE,
        jobId: normalizeWhitespace(hit?.objectID) || (hit?.id ?? null),
        requisitionId,
        department: firstValue(hit?.parent_category) || firstValue(hit?.job_family_group),
        employmentType: firstValue(hit?.employee_type),
        experienceRequired: null,
        jobDescription: stripTags(firstValue(hit?.description)) || stripTags(hit?.summary) || null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: firstValue(hit?.posted_date),
        remoteStatus: inferRemoteStatus(hit, location),
        scrapedAt,
      }
    })

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    'Content-Type': 'application/json',
    'x-algolia-api-key': ALGOLIA_API_KEY,
    'x-algolia-application-id': ALGOLIA_APPLICATION_ID,
    ...(options.headers || {}),
  },
  body: options.body,
  label: SOURCE,
  timeoutMs: 15000,
})

export const createJohnsonControlsIndiaScraper = ({
  maxJobs = null,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const searchHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialSearchPageSignal(searchHtml)) {
      throw new Error('Johnson Controls India verified official job search surface changed materially')
    }

    const scrapedAt = now()
    const jobs = []
    let page = 0
    let totalPages = 1

    while (page < totalPages) {
      const payload = await fetchJson(ALGOLIA_SEARCH_URL, {
        method: 'POST',
        body: JSON.stringify(buildAlgoliaSearchRequestBody({ page, hitsPerPage: pageSize })),
      })

      const result = getPrimaryAlgoliaResult(payload)
      totalPages = Number(result?.nbPages) > 0 ? Number(result.nbPages) : 1
      jobs.push(...extractJohnsonControlsIndiaJobsFromAlgoliaPayload(payload, { scrapedAt }))
      page += 1

      if (Number.isFinite(maxJobs) && jobs.length >= maxJobs) {
        return jobs.slice(0, maxJobs)
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createJohnsonControlsIndiaScraper(options).run(options)

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
