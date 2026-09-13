import path from 'path'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { pathToFileURL } from 'url'

import { expandApiPortalProviderTemplate } from './apiPortalTemplates.js'
import { CANONICAL_CITIES } from '../utils/cities.js'
import {
  getDefaultDryRunRelativePath,
  getDefaultScriptModulePath,
  isWorkdayBackedProvider,
  resolveScraperSourceDirectory,
} from './sourcePaths.js'
import {
  LEGACY_PROVIDER_BASE_DIR,
  SCRAPER_DIR,
  SUPPORT_PROVIDER_DIR,
} from '../supportPaths.js'
import { TARGETED_OPENING_PROVIDERS } from './targetedOpeningProviders.js'
import { attachInventoryEvidence, readInventoryEvidence } from '../utils/inventoryEvidence.js'

const currentDir = SUPPORT_PROVIDER_DIR
const scraperDir = SCRAPER_DIR
export const DEFAULT_PROVIDER_EXTENSION_DIR = path.join(SUPPORT_PROVIDER_DIR, 'providerExtensions')
const WORKDAY_AUTHORITATIVE_EMPTY = Symbol.for('jobverify.workday.authoritative-empty')
const workdayCompanies = JSON.parse(
  readFileSync(path.resolve(currentDir, '../myworkday/companies.json'), 'utf-8'),
)
const customProviders = JSON.parse(
  readFileSync(path.resolve(currentDir, 'customProviders.json'), 'utf-8'),
)
const apiPortalProviders = JSON.parse(
  readFileSync(path.resolve(currentDir, 'apiPortalProviders.json'), 'utf-8'),
).map((provider) => expandApiPortalProviderTemplate(provider))

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const MONGODB_SHARED_INDIA_LOCATION_LABELS = Object.freeze([
  'India',
  'India Offsite',
  'IND-Trivandrum-Equifax Analytics-PEC',
])
const MONGODB_INDIA_LOCATION_PATTERN = [
  ...new Set([
    ...Object.keys(CANONICAL_CITIES),
    ...Object.values(CANONICAL_CITIES),
    ...MONGODB_SHARED_INDIA_LOCATION_LABELS,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)),
]
  .sort((left, right) => right.length - left.length || left.localeCompare(right))
  .map((value) => escapeRegex(value))
  .join('|')

export const loadProviderExtensions = (
  extensionDir = DEFAULT_PROVIDER_EXTENSION_DIR,
) => {
  if (!existsSync(extensionDir)) return []

  return readdirSync(extensionDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .flatMap((fileName) => {
      const filePath = path.join(extensionDir, fileName)
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))

      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') return [parsed]
      return []
    })
}

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

const applyProviderSpecificOverrides = (provider = {}) => {
  if (provider.source !== 'mongodb') return provider

  const include = Array.isArray(provider.config?.resultFilter?.include)
    ? provider.config.resultFilter.include
    : []
  const hasLocationInclude = include.some((rule) => rule?.field === 'location')

  if (!hasLocationInclude) return provider

  return {
    ...provider,
    config: {
      ...(provider.config || {}),
      resultFilter: {
        ...(provider.config?.resultFilter || {}),
        include: include.map((rule) => (
          rule?.field === 'location'
            ? { ...rule, pattern: MONGODB_INDIA_LOCATION_PATTERN }
            : rule
        )),
      },
    },
  }
}

const getDefaultDryRunFile = (provider = {}) =>
  path.join(scraperDir, getDefaultDryRunRelativePath(provider))

const isWithinDirectory = (filePath, directoryPath) => {
  const normalizedFilePath = path.resolve(filePath)
  const normalizedDirectoryPath = path.resolve(directoryPath)
  const relativePath = path.relative(normalizedDirectoryPath, normalizedFilePath)

  return relativePath === ''
    || (
      relativePath
      && !relativePath.startsWith('..')
      && !path.isAbsolute(relativePath)
    )
}

const resolveProviderDryRunFile = (provider = {}) => {
  const defaultDryRunFile = getDefaultDryRunFile(provider)
  if (!provider.dryRunFile) {
    if (provider.adapter === 'script') {
      const resolvedModulePath = resolveProviderModulePath(provider)
      if (resolvedModulePath && path.isAbsolute(resolvedModulePath)) {
        const moduleDir = path.dirname(resolvedModulePath)
        if (isWithinDirectory(moduleDir, scraperDir)) {
          return path.join(moduleDir, 'jobs.json')
        }
      }
    }

    return defaultDryRunFile
  }

  if (!path.isAbsolute(provider.dryRunFile)) {
    return path.join(scraperDir, provider.dryRunFile)
  }

  return isWithinDirectory(provider.dryRunFile, scraperDir)
    ? provider.dryRunFile
    : defaultDryRunFile
}

const resolveProviderModuleFilePath = (modulePath) => (
  path.isAbsolute(modulePath)
    ? modulePath
    : path.resolve(LEGACY_PROVIDER_BASE_DIR, modulePath)
)

const resolveProviderModulePath = (provider = {}) => {
  if (provider.adapter !== 'script') {
    return provider.modulePath || null
  }

  if (isWorkdayBackedProvider(provider)) {
    if (provider.modulePath && path.isAbsolute(provider.modulePath)) {
      return path.join(
        resolveScraperSourceDirectory(provider, { baseDir: scraperDir }),
        'script.js',
      )
    }

    return resolveProviderModuleFilePath(getDefaultScriptModulePath(provider))
  }

  if (provider.modulePath) {
    return resolveProviderModuleFilePath(provider.modulePath)
  }

  return resolveProviderModuleFilePath(getDefaultScriptModulePath(provider, { workday: false }))
}

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
}

const ZERO_RESULT_POLICIES = new Set([
  'coverage-gap',
  'discovery-only',
  'evidence-required',
])

export const resolveZeroResultPolicy = (provider = {}) => {
  if (ZERO_RESULT_POLICIES.has(provider.zeroResultPolicy)) {
    return provider.zeroResultPolicy
  }

  const inventoryMetadata = [
    provider.atsPlatform,
    provider.backfillMode,
    provider.extractionStrategy,
    provider.paginationStrategy,
  ].filter(Boolean).join(' ')

  return /sentinel|verified-empty-state|exact-name-sentinel/i.test(inventoryMetadata)
    ? 'coverage-gap'
    : 'evidence-required'
}

export const hydrateProviderCatalogEntry = (provider = {}) => {
  const source = provider.source || provider.name
  const companyName = provider.companyName || provider.company
  const adapter = provider.adapter || 'workday'
  const defaults = PROVIDER_DEFAULTS[adapter] || {}
  const companyCareerPage = provider.companyCareerPage || provider.baseUrl || null
  const normalizedProvider = applyProviderSpecificOverrides({
    ...provider,
    source,
  })
  const draftProvider = {
    ...defaults,
    ...normalizedProvider,
    source,
    companyName,
    adapter,
    companyCareerPage,
  }
  const modulePath = resolveProviderModulePath(draftProvider)
  const sourceDirectory = (
    draftProvider.adapter === 'script'
      && modulePath
      && path.isAbsolute(modulePath)
      && isWithinDirectory(path.dirname(modulePath), scraperDir)
  )
    ? path.dirname(modulePath)
    : resolveScraperSourceDirectory(draftProvider, { baseDir: scraperDir })
  const dryRunFile = resolveProviderDryRunFile(draftProvider)

  return {
    ...draftProvider,
    zeroResultPolicy: resolveZeroResultPolicy(draftProvider),
    dryRunFile,
    modulePath,
    sourceDirectory,
    companyDomain: normalizeCompanyDomain(
      provider.companyDomain || companyCareerPage || provider.baseUrl,
    ),
  }
}

const decorateJobWithProviderMetadata = (job, provider) => ({
  ...job,
  company: job.company || provider.companyName,
  source: job.source || provider.source,
  country: Object.hasOwn(job, 'country') ? job.country : provider.countryFilter || 'India',
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

export const getScraperCatalog = ({
  providerExtensionDir = DEFAULT_PROVIDER_EXTENSION_DIR,
  providerExtensions = loadProviderExtensions(providerExtensionDir),
} = {}) => dedupeCatalogBySource([
  ...workdayCompanies.map((item) => ({
    ...item,
    adapter: 'workday',
  })),
  ...customProviders,
  ...providerExtensions,
  ...apiPortalProviders.map((item) => ({
    ...item,
    adapter: 'apiPortal',
  })),
  ...TARGETED_OPENING_PROVIDERS.map((item) => expandApiPortalProviderTemplate(item)),
]).map((provider) => hydrateProviderCatalogEntry(provider))

export const decorateJobsWithProviderMetadata = (jobs, provider) => {
  const decoratedJobs = jobs.map((job) => decorateJobWithProviderMetadata(job, provider))
  const inventoryEvidence = readInventoryEvidence(jobs)
  if (inventoryEvidence) attachInventoryEvidence(decoratedJobs, inventoryEvidence)
  if (jobs[WORKDAY_AUTHORITATIVE_EMPTY] === true) {
    Object.defineProperty(decoratedJobs, WORKDAY_AUTHORITATIVE_EMPTY, {
      value: true,
    })
  }
  return decoratedJobs
}

const createWorkdayScraper = (provider) => ({
  name: provider.source,
  dryRunFile: provider.dryRunFile,
  provider,
  run: async ({ signal } = {}) => {
    const { runWorkdayScraper } = await import('../myworkday/engine.js')
    const jobs = await runWorkdayScraper({
      company: provider.companyName,
      baseUrl: provider.baseUrl,
      locationCountry: provider.locationCountry,
      source: provider.source,
      scraperDir: provider.sourceDirectory,
      boardIdentityVerified: provider.boardIdentityVerified === true,
      ...(signal === undefined ? {} : { signal }),
    })

    return decorateJobsWithProviderMetadata(jobs, provider)
  },
})

const createScriptScraper = (provider) => ({
  name: provider.source,
  dryRunFile: provider.dryRunFile,
  provider,
  run: async (runOptions = {}) => {
    const moduleSpecifier = path.isAbsolute(provider.modulePath)
      ? pathToFileURL(provider.modulePath).href
      : provider.modulePath
    const module = await import(moduleSpecifier)
    const jobs = await module.run(runOptions)
    return decorateJobsWithProviderMetadata(jobs, provider)
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

const ADAPTER_FACTORIES = {
  workday: createWorkdayScraper,
  script: createScriptScraper,
  apiPortal: createApiPortalScraper,
}

const dedupeCatalogBySource = (providers = []) => {
  const providersBySource = new Map()

  for (const provider of providers) {
    const source = provider.source || provider.name
    if (!source) continue

    const existing = providersBySource.get(source)
    if (!existing) {
      providersBySource.set(source, provider)
      continue
    }

    providersBySource.set(source, {
      ...existing,
      ...provider,
    })
  }

  return [...providersBySource.values()]
}

export const buildScrapers = () =>
  getScraperCatalog().map((provider) => {
    const factory = ADAPTER_FACTORIES[provider.adapter]
    if (!factory) {
      throw new Error(`Unsupported scraper adapter: ${provider.adapter}`)
    }

    return factory(provider)
  })
