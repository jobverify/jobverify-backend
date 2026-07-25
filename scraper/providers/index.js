import path from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

import { expandApiPortalProviderTemplate } from './apiPortalTemplates.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const scraperDir = path.resolve(currentDir, '..')
const workdayCompanies = JSON.parse(
  readFileSync(path.resolve(scraperDir, 'myworkday/companies.json'), 'utf-8'),
)
const customProviders = JSON.parse(
  readFileSync(path.resolve(currentDir, 'customProviders.json'), 'utf-8'),
)
const wellfoundProviders = JSON.parse(
  readFileSync(path.resolve(currentDir, 'wellfoundProviders.json'), 'utf-8'),
)
const apiPortalProviders = JSON.parse(
  readFileSync(path.resolve(currentDir, 'apiPortalProviders.json'), 'utf-8'),
).map((provider) => expandApiPortalProviderTemplate(provider))

const getCompanyDomain = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

const normalizeCompanyDomain = (value) => {
  if (!value) return null
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
    return value.replace(/^www\./i, '').toLowerCase()
  }
  return getCompanyDomain(value)
}

const getDefaultDryRunFile = ({ source, adapter }) =>
  adapter === 'workday'
    ? path.join(scraperDir, `myworkday/${source}/jobs.json`)
    : path.join(scraperDir, `${source}/jobs.json`)

const PROVIDER_DEFAULTS = {
  workday: {
    atsPlatform: 'workday',
    countryFilter: 'India',
    paginationStrategy: 'next-button',
    extractionStrategy: 'dom+detail-page',
    parser: 'workday',
    normalizationProfile: 'engineering-default',
  },
  script: {
    atsPlatform: 'official-company-careers',
    countryFilter: 'India',
    paginationStrategy: 'custom',
    extractionStrategy: 'dom',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
  },
  apiPortal: {
    atsPlatform: 'official-company-careers',
    countryFilter: 'India',
    paginationStrategy: 'api-driven',
    extractionStrategy: 'api+optional-detail',
    parser: 'api-portal',
    normalizationProfile: 'engineering-default',
  },
  wellfoundDirectory: {
    atsPlatform: 'wellfound-directory',
    countryFilter: 'India',
    cityFilter: 'Bangalore',
    paginationStrategy: 'single-directory-company-jobs-link-or-aggregate-signal',
    extractionStrategy: 'directory-hiring-signal+optional-public-job-links+challenge-gated-aggregate-fallback',
    parser: 'directory-hiring-signal',
    normalizationProfile: 'engineering-default',
  },
}

export const hydrateProviderCatalogEntry = (provider = {}) => {
  const source = provider.source || provider.name
  const companyName = provider.companyName || provider.company
  const adapter = provider.adapter || 'workday'
  const defaults = PROVIDER_DEFAULTS[adapter] || {}
  const companyCareerPage = provider.companyCareerPage || provider.baseUrl || null
  const dryRunFile = provider.dryRunFile
    ? path.isAbsolute(provider.dryRunFile)
      ? provider.dryRunFile
      : path.join(scraperDir, provider.dryRunFile)
    : getDefaultDryRunFile({ source, adapter })

  return {
    ...defaults,
    ...provider,
    source,
    companyName,
    adapter,
    companyCareerPage,
    dryRunFile,
    companyDomain: normalizeCompanyDomain(
      provider.companyDomain || companyCareerPage || provider.baseUrl,
    ),
  }
}

const decorateJobWithProviderMetadata = (job, provider) => ({
  ...job,
  company: job.company || provider.companyName,
  source: job.source || provider.source,
  country: job.country || provider.countryFilter || 'India',
  companyCareerPage: job.companyCareerPage || provider.companyCareerPage,
  companyDomain: job.companyDomain || provider.companyDomain,
  atsPlatform: job.atsPlatform || provider.atsPlatform,
  applyUrl: job.applyUrl || job.link || null,
  sourceUrl: job.sourceUrl || job.link || null,
})

const buildAuthorizedOrigins = (provider = {}) => {
  const configuredOrigins = provider.config?.auth?.authorizedOrigins
  if (Array.isArray(configuredOrigins) && configuredOrigins.length > 0) {
    return configuredOrigins
      .map((value) => {
        try {
          return new URL(value).origin
        } catch {
          return null
        }
      })
      .filter(Boolean)
  }

  const fallbackCandidates = [
    provider.config?.auth?.tokenUrl,
    provider.config?.discovery?.listingApiUrl,
  ]

  return fallbackCandidates
    .map((value) => {
      try {
        return new URL(value).origin
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

const shouldAuthorizeRequest = (provider, requestUrl) => {
  if (provider.config?.auth?.strategy !== 'bearer-token-endpoint') return false

  try {
    return buildAuthorizedOrigins(provider).includes(new URL(requestUrl).origin)
  } catch {
    return false
  }
}

const getTokenValueFromPayload = (payload, tokenPath = 'token') =>
  String(tokenPath)
    .split('.')
    .reduce((current, key) => (current == null ? null : current[key]), payload) ?? null

const createAuthorizedFetchJson = (provider) => {
  const authConfig = provider.config?.auth || {}
  let cachedToken = null

  const fetchToken = async ({ forceRefresh = false } = {}) => {
    if (!forceRefresh && cachedToken) return cachedToken

    const response = await fetch(authConfig.tokenUrl, {
      method: authConfig.tokenMethod || 'GET',
      headers: authConfig.tokenHeaders,
      body: authConfig.tokenBody,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${authConfig.tokenUrl}`)
    }

    const payload = await response.json()
    cachedToken = getTokenValueFromPayload(payload, authConfig.tokenPath || 'token')

    if (!cachedToken) {
      throw new Error(`Missing bearer token in response from ${authConfig.tokenUrl}`)
    }

    return cachedToken
  }

  return async (url, options = {}) => {
    const executeRequest = async ({ forceRefresh = false } = {}) => {
      const headers = { ...(options.headers || {}) }

      if (shouldAuthorizeRequest(provider, url)) {
        const token = await fetchToken({ forceRefresh })
        headers.Authorization = `Bearer ${token}`
      }

      return fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
      })
    }

    let response = await executeRequest()
    if (
      shouldAuthorizeRequest(provider, url)
      && (response.status === 401 || response.status === 403)
    ) {
      response = await executeRequest({ forceRefresh: true })
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return response.json()
  }
}

export const getScraperCatalog = () => [
  ...workdayCompanies.map((item) => hydrateProviderCatalogEntry({
    ...item,
    adapter: 'workday',
  })),
  ...customProviders.map((item) => hydrateProviderCatalogEntry(item)),
  ...wellfoundProviders.map((item) => hydrateProviderCatalogEntry(item)),
  ...apiPortalProviders.map((item) => hydrateProviderCatalogEntry({
    ...item,
    adapter: 'apiPortal',
  })),
]

const createWorkdayScraper = (provider) => ({
  name: provider.source,
  dryRunFile: provider.dryRunFile,
  provider,
  run: async () => {
    const { runWorkdayScraper } = await import('../myworkday/engine.js')
    const jobs = await runWorkdayScraper({
      company: provider.companyName,
      baseUrl: provider.baseUrl,
      locationCountry: provider.locationCountry,
      source: provider.source,
      scraperDir: path.join(scraperDir, `myworkday/${provider.source}`),
    })

    return jobs.map((job) => decorateJobWithProviderMetadata(job, provider))
  },
})

const createScriptScraper = (provider) => ({
  name: provider.source,
  dryRunFile: provider.dryRunFile,
  provider,
  run: async () => {
    const module = await import(provider.modulePath)
    const jobs = await module.run()
    return jobs.map((job) => decorateJobWithProviderMetadata(job, provider))
  },
})

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const createApiPortalScraper = (provider) => ({
  name: provider.source,
  dryRunFile: provider.dryRunFile,
  provider,
  run: async () => {
    const { runApiPortalScraper } = await import('../apiPortal/engine.js')
    const jobs = await runApiPortalScraper({
      provider,
      fetchJson: provider.config?.auth?.strategy
        ? createAuthorizedFetchJson(provider)
        : fetchJson,
    })

    return jobs.map((job) => decorateJobWithProviderMetadata(job, provider))
  },
})

const createWellfoundDirectoryAdapterScraper = (provider) => ({
  name: provider.source,
  dryRunFile: provider.dryRunFile,
  provider,
  run: async () => {
    const { createWellfoundDirectoryScraper } = await import('../wellfoundDirectory/engine.js')
    const scraper = createWellfoundDirectoryScraper(provider)
    const jobs = await scraper.run()
    return jobs.map((job) => decorateJobWithProviderMetadata(job, provider))
  },
})

const ADAPTER_FACTORIES = {
  workday: createWorkdayScraper,
  script: createScriptScraper,
  apiPortal: createApiPortalScraper,
  wellfoundDirectory: createWellfoundDirectoryAdapterScraper,
}

export const buildScrapers = () =>
  getScraperCatalog().map((provider) => {
    const factory = ADAPTER_FACTORIES[provider.adapter]
    if (!factory) {
      throw new Error(`Unsupported scraper adapter: ${provider.adapter}`)
    }

    return factory(provider)
  })
