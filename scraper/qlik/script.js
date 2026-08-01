import { chromium } from 'playwright'

import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { CANONICAL_CITIES } from '../../scraper-support/utils/cities.js'

const SOURCE = 'qlik'
const COMPANY = 'Qlik'
const BASE_URL = 'https://careerhub.qlik.com'
const CAREERS_URL = `${BASE_URL}/careers?domain=qlik.com`
const SEARCH_URL = `${BASE_URL}/api/pcsx/search`
const DETAIL_URL = `${BASE_URL}/api/pcsx/position_details`
const BROWSER_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: CAREERS_URL,
  Origin: BASE_URL,
}
const CITY_ALIASES = Object.entries(CANONICAL_CITIES)
  .filter(([alias, canonical]) => !/^(?:remote|none)$/i.test(alias) && !/^(?:Remote|None)$/i.test(canonical))
  .sort(([left], [right]) => right.length - left.length)

const buildChromiumLaunchArgs = () =>
  process.env.PUPPETEER_DISABLE_SANDBOX ? ['--no-sandbox'] : []

const shouldUseBrowserFallback = (error) =>
  /connect timeout|getaddrinfo enotfound|fetch failed/i.test(String(error))

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const locationValue = (value) => clean(
  typeof value === 'string' ? value : (value?.name || value?.location),
)

const chooseIndiaLocation = (position = {}) => {
  const locations = (Array.isArray(position.locations) ? position.locations : [position.location])
    .map(locationValue)
    .filter(Boolean)
  return locations
    .filter((location) => /\bindia\b/i.test(location))
    .sort((left, right) => (/^india$/i.test(left) ? 1 : 0) - (/^india$/i.test(right) ? 1 : 0))[0]
    || null
}

const deriveCity = (location) => {
  const normalized = clean(location).toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  for (const [alias, canonical] of CITY_ALIASES) {
    const candidate = alias.replace(/[^a-z0-9]+/g, ' ')
    if (` ${normalized} `.includes(` ${candidate} `)) return canonical
  }
  return null
}

const deriveWorkMode = (...values) => {
  const evidence = values.map(clean).join(' ')
  if (/\bhybrid\b/i.test(evidence)) return 'Hybrid'
  if (/\bremote\b|\boffsite\b/i.test(evidence)) return 'Remote'
  if (/\bon-?site\b|\bin[ -]?office\b/i.test(evidence)) return 'On-site'
  return null
}

const canonicalJobUrl = (value, jobId) => {
  const fallback = `${BASE_URL}/careers/job/${encodeURIComponent(jobId)}`
  if (!value) return fallback
  try {
    const url = new URL(value, BASE_URL)
    if (url.hostname.toLowerCase() !== 'careerhub.qlik.com') return fallback
    const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    if (
      segments.length !== 3
      || segments[0].toLowerCase() !== 'careers'
      || segments[1].toLowerCase() !== 'job'
      || segments[2] !== String(jobId)
    ) return fallback
    return `${url.origin}${url.pathname}`
  } catch {
    return fallback
  }
}

const loadJsonWithBrowser = async (url, options = {}) => {
  const browser = await chromium.launch({
    headless: true,
    args: buildChromiumLaunchArgs(),
  })

  try {
    const page = await browser.newPage({ userAgent: BROWSER_HEADERS['User-Agent'] })
    await page.goto(CAREERS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })

    const result = await page.evaluate(async ({ requestUrl, headers }) => {
      const response = await fetch(requestUrl, {
        headers,
      })

      return {
        status: response.status,
        text: await response.text(),
      }
    }, {
      requestUrl: url,
      headers: {
        Accept: options.headers?.Accept || BROWSER_HEADERS.Accept,
        'X-Requested-With': options.headers?.['X-Requested-With'] || BROWSER_HEADERS['X-Requested-With'],
      },
    })

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`HTTP ${result.status} for ${url}`)
    }

    return JSON.parse(result.text)
  } finally {
    await browser.close()
  }
}

export const loadWithBrowserFallback = async ({
  primaryLoad,
  fallbackLoad,
}) => {
  try {
    return await primaryLoad()
  } catch (error) {
    if (!shouldUseBrowserFallback(error)) throw error
    return fallbackLoad(error)
  }
}

const defaultFetchJson = (url, options = {}) => loadWithBrowserFallback({
  primaryLoad: () => fetchJsonWithRetry(url, {
    ...options,
    headers: { ...BROWSER_HEADERS, ...(options.headers || {}) },
    label: SOURCE,
    timeoutMs: 20000,
  }),
  fallbackLoad: () => loadJsonWithBrowser(url, options),
})

export const createQlikScraper = ({
  pageSize = 10,
  maxPages = 100,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
      throw new Error('[qlik] pageSize must be a positive integer')
    }
    if (!Number.isInteger(maxPages) || maxPages <= 0) {
      throw new Error('[qlik] maxPages must be a positive integer')
    }

    const jobs = []
    const seenIds = new Set()
    const seenPageSignatures = new Set()
    const scrapedAt = now()
    let declaredTotal = null
    let start = 0

    for (let page = 0; page < maxPages; page += 1) {
      const url = new URL(SEARCH_URL)
      url.searchParams.set('domain', 'qlik.com')
      url.searchParams.set('query', '')
      url.searchParams.set('location', 'India')
      url.searchParams.set('start', String(start))
      url.searchParams.set('limit', String(pageSize))
      const payload = await fetchJson(url.toString(), { method: 'GET', headers: BROWSER_HEADERS })

      if (!Array.isArray(payload?.data?.positions)) {
        throw new Error('[qlik] Eightfold contract no longer exposes data.positions')
      }
      const total = Number(payload?.data?.count)
      if (!Number.isInteger(total) || total < 0) {
        throw new Error('[qlik] Eightfold contract no longer exposes a valid data.count')
      }
      if (declaredTotal != null && declaredTotal !== total) {
        throw new Error('[qlik] Eightfold total changed during pagination')
      }
      declaredTotal = total

      const positions = payload.data.positions
      if (positions.length > pageSize) {
        throw new Error('[qlik] Eightfold returned more positions than the requested page size')
      }
      const ids = positions.map((position) => clean(position?.id))
      if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
        throw new Error('[qlik] Eightfold page contains missing or duplicate position identities')
      }
      const signature = ids.join('|')
      if (positions.length > 0 && seenPageSignatures.has(signature)) {
        throw new Error('[qlik] Eightfold pagination repeated a page without progress')
      }
      if (positions.length > 0) seenPageSignatures.add(signature)
      const newIds = ids.filter((id) => !seenIds.has(id))
      if (positions.length > 0 && newIds.length === 0) {
        throw new Error('[qlik] Eightfold pagination made no progress')
      }
      const newIdSet = new Set(newIds)

      for (const position of positions) {
        const jobId = clean(position.id)
        if (!newIdSet.has(jobId)) continue

        const title = clean(position.name)
        const location = chooseIndiaLocation(position)
        if (!title || !location) continue

        const detailUrl = new URL(DETAIL_URL)
        detailUrl.searchParams.set('position_id', jobId)
        detailUrl.searchParams.set('domain', 'qlik.com')
        detailUrl.searchParams.set('hl', 'en')
        let detail = {}
        try {
          const detailPayload = await fetchJson(detailUrl.toString(), { method: 'GET', headers: BROWSER_HEADERS })
          if (!detailPayload?.data || typeof detailPayload.data !== 'object') {
            throw new Error(`[qlik] malformed Eightfold detail for ${jobId}`)
          }
          detail = detailPayload.data
        } catch (error) {
          if (/malformed Eightfold detail/i.test(error?.message || '')) throw error
        }

        const sourceUrl = canonicalJobUrl(detail.publicUrl, jobId)
        jobs.push({
          title,
          company: COMPANY,
          location,
          city: deriveCity(location),
          country: 'India',
          link: sourceUrl,
          sourceUrl,
          applyUrl: sourceUrl,
          jobId,
          requisitionId: clean(position.displayJobId) || jobId,
          department: clean(position.department) || null,
          employmentType: clean(position.employmentType) || null,
          remoteStatus: deriveWorkMode(
            position.workLocationType,
            position.locationType,
            detail.workLocationType,
            location,
          ),
          jobDescription: detail.jobDescription ?? null,
          minimumQualification: null,
          preferredQualification: null,
          requiredSkills: [],
          postingDate: position.postedTs ?? null,
          closingDate: null,
          source: SOURCE,
          scrapedAt,
        })
      }
      for (const jobId of newIdSet) seenIds.add(jobId)

      if (seenIds.size > declaredTotal) {
        throw new Error('[qlik] Eightfold returned more unique positions than its declared total')
      }
      if (positions.length === 0) {
        if (seenIds.size < declaredTotal) {
          throw new Error('[qlik] Eightfold pagination ended before the declared total')
        }
        break
      }
      if (seenIds.size === declaredTotal) break
      if (positions.length < pageSize) {
        throw new Error('[qlik] Eightfold returned a premature short page')
      }
      if (page + 1 >= maxPages) {
        throw new Error(`[qlik] Eightfold pagination limit reached after ${maxPages} pages`)
      }
      start += pageSize
    }

    return jobs
  },
})

export const run = (options = {}) => createQlikScraper().run(options)
