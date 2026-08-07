import { createBrowserFetchSession } from '../shared/browserFetch.js'
import { createPaginationState, getNextPageRequest, updatePaginationState } from './pagination.js'
import {
  expandTemplate,
  getMappedFieldValue,
  getValueAtPath,
  normalizeApiPortalConfig,
} from './providerConfig.js'

const normalizeRequiredSkills = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []
)

const deriveCity = (location) => {
  if (!location) return null
  const normalized = String(location)
  if (/remote/i.test(normalized)) return 'Remote'
  if (/multiple locations/i.test(normalized)) return null
  return normalized.split(/[,-]/)[0]?.trim() || null
}

const toAbsoluteUrl = (value, provider) => {
  if (value == null || value === '') return null
  try {
    return new URL(value, provider.companyCareerPage).toString()
  } catch {
    return null
  }
}

const buildMynextHireLink = (selector = {}, payload = {}) => {
  const reqIdSelector = selector.reqIdPath || 'reqId'
  const reqId = getMappedFieldValue(payload, reqIdSelector)
  if (reqId == null || !selector.baseUrl) return null

  const qStringContext = {
    pageType: selector.pageType || 'jd',
    cvSource: selector.cvSource || 'careers',
    reqId,
    requester: {
      id: selector.requester?.id || '',
      code: selector.requester?.code || '',
      name: selector.requester?.name || '',
    },
    page: selector.page || 'careers',
    bufilter: selector.bufilter ?? -1,
    customFields: selector.customFields || {},
  }

  let additionalFilters = ''
  Object.entries(qStringContext.customFields).forEach(([key, value]) => {
    additionalFilters += `&${key}${encodeURIComponent('=')}${encodeURIComponent(value)}`
  })

  const encodedContext = Buffer
    .from(JSON.stringify(qStringContext), 'utf8')
    .toString('base64')

  return `${selector.baseUrl}?src${encodeURIComponent('=')}${qStringContext.cvSource}${additionalFilters}${encodeURIComponent('&')}p${encodeURIComponent('=')}${encodedContext}`
}

const getMappedValue = (payload, selector) => {
  if (!selector) return null
  if (typeof selector === 'object' && !Array.isArray(selector) && selector.strategy === 'mynexthire-link') {
    return buildMynextHireLink(selector, payload)
  }
  return getMappedFieldValue(payload, selector)
}

const serializeRequestBody = (body, headers = {}) => {
  if (body == null) return undefined
  if (typeof body === 'string' || body instanceof URLSearchParams || Buffer.isBuffer(body)) {
    return body
  }

  const contentTypeHeader = Object.entries(headers).find(([key]) => (
    String(key).toLowerCase() === 'content-type'
  ))
  const contentType = String(contentTypeHeader?.[1] || '').toLowerCase()

  if (typeof body === 'object') {
    if (!contentType || contentType.includes('application/json')) {
      return JSON.stringify(body)
    }
  }

  return body
}

const mergeRequestBody = (baseBody, pageBody) => {
  if (pageBody == null) return baseBody
  if (baseBody == null) return pageBody

  if (
    typeof baseBody === 'object'
    && !Array.isArray(baseBody)
    && typeof pageBody === 'object'
    && !Array.isArray(pageBody)
  ) {
    return {
      ...baseBody,
      ...pageBody,
    }
  }

  return pageBody
}

const matchesFieldPattern = (value, pattern) => {
  if (!pattern) return true
  if (value == null) return false

  const flags = pattern.flags || 'i'
  const source = pattern.regex || pattern.pattern || String(pattern)
  return new RegExp(source, flags).test(String(value))
}

const passesResultFilter = (mapped, resultFilter = {}) => {
  const include = Array.isArray(resultFilter.include) ? resultFilter.include : []
  const exclude = Array.isArray(resultFilter.exclude) ? resultFilter.exclude : []

  if (include.some((rule) => !matchesFieldPattern(mapped?.[rule.field], rule))) {
    return false
  }

  if (exclude.some((rule) => matchesFieldPattern(mapped?.[rule.field], rule))) {
    return false
  }

  return true
}

const mapRecord = (raw, provider, config, detail = {}) => {
  const merged = { ...raw, ...detail }
  const title = getMappedValue(merged, config.mapping.title)
  const location = getMappedValue(merged, config.mapping.location)
  const experienceLevel = getMappedValue(merged, config.mapping.experienceLevel)
  const postingDate = getMappedValue(merged, config.mapping.postingDate)
  const remoteStatus = getMappedValue(merged, config.mapping.remoteStatus)
  const sourceUrl = toAbsoluteUrl(
    getMappedValue(merged, config.mapping.sourceUrl) ?? detail.sourceUrl,
    provider,
  )
  const applyUrl = toAbsoluteUrl(
    getMappedValue(merged, config.mapping.applyUrl) ?? detail.applyUrl,
    provider,
  )
  const canonicalUrl = sourceUrl || applyUrl

  if (!title || !canonicalUrl) return null

  return {
    title,
    company: provider.companyName,
    location,
    city: deriveCity(location),
    country: provider.countryFilter || 'India',
    link: canonicalUrl,
    applyUrl,
    sourceUrl: canonicalUrl,
    source: provider.source,
    jobId: getMappedValue(merged, config.mapping.jobId),
    requisitionId: getMappedValue(merged, config.mapping.requisitionId),
    department:
      getMappedValue(merged, config.mapping.department)
      ?? getValueAtPath(detail, 'department'),
    employmentType: getMappedValue(merged, config.mapping.employmentType),
    experienceRequired: getMappedValue(merged, config.mapping.experienceRequired),
    ...(experienceLevel != null ? { experienceLevel } : {}),
    ...(postingDate != null ? { postingDate } : {}),
    jobDescription:
      getMappedValue(detail, config.detail.mapping.jobDescription)
      ?? getMappedValue(merged, config.mapping.jobDescription),
    minimumQualification:
      getMappedValue(detail, config.detail.mapping.minimumQualification)
      ?? getMappedValue(merged, config.mapping.minimumQualification),
    preferredQualification:
      getMappedValue(detail, config.detail.mapping.preferredQualification)
      ?? getMappedValue(merged, config.mapping.preferredQualification),
    requiredSkills: normalizeRequiredSkills(
      getMappedValue(detail, config.detail.mapping.requiredSkills)
      ?? getMappedValue(merged, config.mapping.requiredSkills),
    ),
    remoteStatus: remoteStatus ?? (/remote/i.test(location || '') ? 'Remote' : 'On-site'),
    scrapedAt: new Date().toISOString(),
  }
}

const createFallbackDetailUrl = (provider, record, config) => {
  const configuredSourceUrl = getMappedValue(record, config.mapping.sourceUrl)
  const configuredApplyUrl = getMappedValue(record, config.mapping.applyUrl)
  const directUrl = toAbsoluteUrl(configuredSourceUrl || configuredApplyUrl, provider)
  if (directUrl) return directUrl

  const jobId = getMappedValue(record, config.mapping.jobId)
  if (jobId && provider.atsPlatform === 'eightfold') {
    try {
      return `${new URL(config.detail.urlTemplate).origin}/careers/job/${jobId}`
    } catch {
      return null
    }
  }

  const detailUrl = expandTemplate(config.detail.urlTemplate, {
    jobId,
    requisitionId: getMappedValue(record, config.mapping.requisitionId),
  })

  return toAbsoluteUrl(detailUrl, provider)
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const isBrowserJsonFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout/i
    .test(String(error?.message ?? error ?? ''))

const canUseBrowserJsonFallback = (provider, url, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase()

  return method === 'GET'
    && options.body == null
    && (
      provider.atsPlatform === 'eightfold'
      || /\/api\/pcsx\//i.test(String(url ?? ''))
    )
}

const parseBrowserJson = (rawText, url) => {
  try {
    return JSON.parse(String(rawText ?? '').trim())
  } catch (error) {
    throw new Error(`Browser JSON fallback returned invalid JSON for ${url}: ${error.message}`)
  }
}

const isBlockedEightfoldInventoryError = (error) => {
  const message = String(error?.message ?? error ?? '')

  return /HTTP 403\b/i.test(message)
    && (
      /\/api\/pcsx\/search/i.test(message)
      || /PCSX is not enabled/i.test(message)
      || /eightfold/i.test(message)
    )
}

const createBlockedEightfoldSignalJob = (provider) => {
  const sourceUrl = provider.companyCareerPage
  const location = provider.countryFilter || 'India'
  const verificationNote = provider.verifiedOn
    ? ` Verified surface checked on ${provider.verifiedOn}.`
    : ''

  return {
    title: `Current openings at ${provider.companyName}`,
    company: provider.companyName,
    location,
    city: deriveCity(location),
    country: provider.countryFilter || 'India',
    link: sourceUrl,
    applyUrl: sourceUrl,
    sourceUrl,
    source: provider.source,
    jobId: `${provider.source}-current-openings`,
    requisitionId: `${provider.source}-current-openings`,
    department: null,
    employmentType: null,
    experienceRequired: null,
    jobDescription:
      `The official ${provider.companyName} careers page remained reachable, `
      + 'but the public Eightfold inventory API returned HTTP 403 during this scrape. '
      + `Review current openings directly on ${sourceUrl}.${verificationNote}`,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: null,
    scrapedAt: new Date().toISOString(),
  }
}

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const workerCount = Math.max(1, Math.min(
    items.length || 1,
    Number.isFinite(concurrency) ? Math.floor(concurrency) : 1,
  ))
  const results = new Array(items.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) {
        return
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

export const runApiPortalScraper = async ({ provider, fetchJson, fetchBrowserJson }) => {
  const config = normalizeApiPortalConfig(provider.config || {})
  if (
    provider.atsPlatform === 'eightfold'
    && config.pagination?.strategy === 'offset-limit'
    && (config.pagination.pageSize == null || config.pagination.pageSize === 10)
  ) {
    config.pagination.pageSize = 50
  }
  const jobs = []
  let state = createPaginationState(config.pagination)
  let browserSession = null
  let browserJsonFetcher = null
  let browserSessionPrimed = false

  const getBrowserJsonFetcher = async () => {
    if (fetchBrowserJson) {
      return fetchBrowserJson
    }

    if (browserJsonFetcher) {
      return browserJsonFetcher
    }

    browserSession = await createBrowserFetchSession({ userAgent: BROWSER_USER_AGENT })
    const warmupUrl = config.discovery.careerPageUrl || provider.companyCareerPage || null

    browserJsonFetcher = async (url, options = {}) => {
      if (!browserSessionPrimed) {
        browserSessionPrimed = true

        if (warmupUrl) {
          try {
            await browserSession.fetchPage(warmupUrl)
          } catch {
            // Best-effort warmup: the API request itself is the real signal.
          }
        }
      }

      const rawText = await browserSession.fetchText(url, {
        referer: warmupUrl || options?.headers?.Referer,
      })

      return parseBrowserJson(rawText, url)
    }

    return browserJsonFetcher
  }

  const fetchJsonWithFallback = async (url, options = {}) => {
    try {
      return await fetchJson(url, options)
    } catch (error) {
      if (!canUseBrowserJsonFallback(provider, url, options) || !isBrowserJsonFallbackError(error)) {
        throw error
      }

      const browserFetcher = await getBrowserJsonFetcher()
      return browserFetcher(url, options)
    }
  }

  try {
    while (true) {
      const nextPage = getNextPageRequest(config, state)
      if (!nextPage) break

      const url = new URL(config.discovery.listingApiUrl)
      Object.entries(config.request.query || {}).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
      Object.entries(nextPage.query || {}).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })

      const listingPayload = await fetchJsonWithFallback(url.toString(), {
        method: config.request.method,
        headers: config.request.headers,
        body: serializeRequestBody(
          mergeRequestBody(config.request.body, nextPage.body),
          config.request.headers,
        ),
      })
      const records = getValueAtPath(listingPayload, config.pagination.resultsPath) || []

      const mappedRecords = await mapWithConcurrency(
        records,
        config.detail.enabled ? (config.detail.concurrency || 1) : 1,
        async (record) => {
          let detailPayload = {}

          if (config.detail.enabled) {
            const detailUrl = expandTemplate(config.detail.urlTemplate, {
              jobId: getMappedValue(record, config.mapping.jobId),
              requisitionId: getMappedValue(record, config.mapping.requisitionId),
            })

            try {
              detailPayload = await fetchJsonWithFallback(detailUrl, {
                method: config.detail.method,
                headers: config.detail.headers,
                body: serializeRequestBody(config.detail.body, config.detail.headers),
              })
            } catch (error) {
              if (config.detail.required) throw error

              detailPayload = {
                sourceUrl: createFallbackDetailUrl(provider, record, config),
                applyUrl: createFallbackDetailUrl(provider, record, config),
                detailFetchError: error.message,
              }
            }
          }

          const mapped = mapRecord(record, provider, config, detailPayload)
          return mapped && passesResultFilter(mapped, config.resultFilter) ? mapped : null
        },
      )

      for (const mapped of mappedRecords) {
        if (mapped) jobs.push(mapped)
      }

      const hasMore = config.pagination.hasMorePath
        ? getValueAtPath(listingPayload, config.pagination.hasMorePath)
        : null
      const totalCount = config.pagination.totalCountPath
        ? getValueAtPath(listingPayload, config.pagination.totalCountPath)
        : null

      state = updatePaginationState(config.pagination, state, {
        hasMore,
        totalCount,
        resultCount: Array.isArray(records) ? records.length : 0,
        pageSize: config.pagination.pageSize,
      })
    }

    return jobs
  } catch (error) {
    if (
      jobs.length === 0
      && provider.atsPlatform === 'eightfold'
      && provider.companyCareerPage
      && isBlockedEightfoldInventoryError(error)
    ) {
      return [createBlockedEightfoldSignalJob(provider)]
    }

    throw error
  } finally {
    if (browserSession) {
      await browserSession.close()
    }
  }
}
