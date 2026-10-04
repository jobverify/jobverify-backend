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

const validateInventory = (payload, records, rules) => {
  if (!rules) return
  if (!Array.isArray(records) || records.length < (rules.minRecords ?? 0)) {
    throw new Error('API portal inventory validation failed: missing or short listing array')
  }
  if (
    rules.totalCountPath
    && getValueAtPath(payload, rules.totalCountPath) !== records.length
  ) {
    throw new Error('API portal inventory validation failed: total count mismatch')
  }
  if (
    rules.sourcePath
    && getValueAtPath(payload, rules.sourcePath) !== rules.expectedSource
  ) {
    throw new Error('API portal inventory validation failed: source marker mismatch')
  }

  const seen = new Set()
  for (const record of records) {
    if (!record || typeof record !== 'object') {
      throw new Error('API portal inventory validation failed: malformed listing')
    }
    for (const field of rules.requiredFields || []) {
      const value = getValueAtPath(record, field)
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`API portal inventory validation failed: missing ${field}`)
      }
    }
    if (rules.uniqueField) {
      const value = getValueAtPath(record, rules.uniqueField)
      if (seen.has(value)) {
        throw new Error('API portal inventory validation failed: duplicate listing ID')
      }
      seen.add(value)
    }
    if (rules.urlField) {
      try {
        const url = new URL(getValueAtPath(record, rules.urlField))
        if (
          url.origin !== rules.allowedUrlOrigin
          || !url.pathname.startsWith(rules.urlPathPrefix)
        ) {
          throw new Error('untrusted URL')
        }
      } catch {
        throw new Error('API portal inventory validation failed: untrusted listing URL')
      }
    }
  }
}

export const runApiPortalScraper = async ({ provider, fetchJson, fetchBrowserJson }) => {
  const config = normalizeApiPortalConfig(provider.config || {})
  if (
    provider.atsPlatform === 'eightfold'
    && config.pagination?.strategy === 'offset-limit'
    && (config.pagination.pageSize == null || config.pagination.pageSize === 10)
    && !Number.isInteger(provider.templateOptions?.pageSize)
  ) {
    config.pagination.pageSize = 50
  }
  let lastRequestStartedAt = 0
  const fetchPortalJson = async (url, options) => {
    const policy = config.rateLimit
    if (!policy) return fetchJson(url, options)

    const maxRetries = Math.max(0, Number(policy.maxRetries) || 0)
    for (let attempt = 0; ; attempt += 1) {
      const waitMs = Math.max(0, (Number(policy.minimumIntervalMs) || 0) - (Date.now() - lastRequestStartedAt))
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
      lastRequestStartedAt = Date.now()
      try {
        return await fetchJson(url, options)
      } catch (error) {
        if (attempt >= maxRetries || !(/HTTP 429\b/i.test(String(error?.message)) || error?.status === 429)) {
          throw error
        }
        const backoffMs = Math.min(
          Number(policy.maxDelayMs) || 30000,
          (Number(policy.baseDelayMs) || 2000) * (2 ** attempt),
        )
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
      }
    }
  }
  const jobs = []
  let state = createPaginationState(config.pagination)

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

      const listingPayload = await fetchPortalJson(url.toString(), {
        method: config.request.method,
        headers: config.request.headers,
        body: serializeRequestBody(
          mergeRequestBody(config.request.body, nextPage.body),
          config.request.headers,
        ),
      })
      const records = getValueAtPath(listingPayload, config.pagination.resultsPath)
      validateInventory(listingPayload, records, config.inventoryValidation)
      const listingRecords = records || []

      const mappedRecords = await mapWithConcurrency(
        listingRecords,
        config.detail.enabled ? (config.detail.concurrency || 1) : 1,
        async (record) => {
          let detailPayload = {}

          if (config.detail.enabled) {
            const detailUrl = expandTemplate(config.detail.urlTemplate, {
              jobId: getMappedValue(record, config.mapping.jobId),
              requisitionId: getMappedValue(record, config.mapping.requisitionId),
            })

            try {
              detailPayload = await fetchPortalJson(detailUrl, {
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
        resultCount: Array.isArray(listingRecords) ? listingRecords.length : 0,
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
  }
}
