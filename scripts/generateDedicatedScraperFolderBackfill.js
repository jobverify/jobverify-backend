import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getScraperCatalog } from '../scraper/providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')
const repoDir = path.resolve(backendDir, '..')
const scraperDir = path.join(backendDir, 'scraper')
const providerExtensionDir = path.join(scraperDir, 'providers', 'providerExtensions')
const manifestPath = path.join(providerExtensionDir, 'zz-dedicated-scraper-folder-backfill.json')
const legacyManifestPath = path.join(providerExtensionDir, 'dedicated-scraper-folder-backfill.json')
const coverageArtifactPath = path.join(repoDir, 'artifacts', 'company-scraper-check-india-hiring-400.csv')

const TARGET_COVERAGE_TYPES = new Set(['provider_only', 'sentinel_placeholder'])

const parseCsvLine = (line) => {
  const columns = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === ',' && !insideQuotes) {
      columns.push(current)
      current = ''
      continue
    }

    current += char
  }

  columns.push(current)
  return columns
}

const parseCsvRows = (csvText) => {
  const lines = String(csvText || '')
    .trim()
    .split(/\r?\n/)

  if (lines.length === 0) return []

  const [headerLine, ...dataLines] = lines
  const headers = parseCsvLine(headerLine).map((value) => String(value || '').trim())

  return dataLines
    .filter(Boolean)
    .map((line) => {
      const values = parseCsvLine(line)
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
    })
}

const escapeCsv = (value) => {
  const text = String(value ?? '')

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

const toJsLiteral = (value) => JSON.stringify(value, null, 2)

const pickIfPresent = (target, key, value) => {
  if (value === undefined) return
  target[key] = value
}

const buildTargetManifestFromCoverage = ({ coverageRows, catalog }) => {
  const providersBySource = new Map(catalog.map((provider) => [provider.source, provider]))
  const seenSources = new Set()
  const manifest = []

  for (const row of coverageRows) {
    const coverageType = String(row.coverage_type || '').trim()
    const source = String(row.source || '').trim()
    if (!TARGET_COVERAGE_TYPES.has(coverageType) || !source || seenSources.has(source)) continue

    const provider = providersBySource.get(source)
    if (!provider) {
      throw new Error(`Unable to find catalog provider for targeted source: ${source}`)
    }

    const entry = {
      source,
      companyName: provider.companyName || provider.company || row.company || source,
      adapter: 'script',
      modulePath: `../${source}/script.js`,
      dryRunFile: `${source}/jobs.json`,
      companyCareerPage: provider.companyCareerPage || null,
      companyDomain: provider.companyDomain || null,
      atsPlatform:
        coverageType === 'provider_only'
          ? provider.atsPlatform || 'workday'
          : 'dedicated-local-empty-scraper',
      countryFilter: provider.countryFilter || 'India',
      paginationStrategy:
        coverageType === 'provider_only'
          ? provider.paginationStrategy || 'next-button'
          : 'local-dedicated-empty-wrapper',
      extractionStrategy:
        coverageType === 'provider_only'
          ? provider.extractionStrategy || 'dom+detail-page'
          : 'local-dedicated-empty-wrapper-return-empty',
      parser: coverageType === 'provider_only' ? provider.parser || 'workday' : 'custom-script',
      normalizationProfile: provider.normalizationProfile || 'engineering-default',
      verifiedOn: provider.verifiedOn || null,
      verifiedSurfaceSummary: provider.verifiedSurfaceSummary || null,
      backfillMode: coverageType === 'provider_only' ? 'workday' : 'sentinel',
      originalAdapter: provider.adapter || null,
      originalAtsPlatform: provider.atsPlatform || null,
      originalModulePath: provider.modulePath || null,
      originalDryRunFile: provider.dryRunFile || null,
    }

    pickIfPresent(entry, 'baseUrl', provider.baseUrl)
    pickIfPresent(entry, 'locationCountry', provider.locationCountry)
    pickIfPresent(entry, 'officialBrandName', provider.officialBrandName)
    pickIfPresent(entry, 'homepageUrl', provider.homepageUrl)
    pickIfPresent(entry, 'officialHomepageUrl', provider.officialHomepageUrl)

    manifest.push(entry)
    seenSources.add(source)
  }

  return manifest.sort((left, right) => left.source.localeCompare(right.source))
}

const createCatalogModuleObject = (provider) => {
  const catalogObject = {
    source: provider.source,
    companyName: provider.companyName,
    adapter: 'script',
    modulePath: '__MODULE_PATH__',
    dryRunFile: '__DRY_RUN_FILE__',
    companyCareerPage: provider.companyCareerPage ?? null,
    companyDomain: provider.companyDomain ?? null,
    atsPlatform: provider.atsPlatform ?? null,
    countryFilter: provider.countryFilter ?? 'India',
    paginationStrategy: provider.paginationStrategy ?? null,
    extractionStrategy: provider.extractionStrategy ?? null,
    parser: provider.parser ?? 'custom-script',
    normalizationProfile: provider.normalizationProfile ?? 'engineering-default',
    verifiedOn: provider.verifiedOn ?? null,
    verifiedSurfaceSummary: provider.verifiedSurfaceSummary ?? null,
    backfillMode: provider.backfillMode,
    originalAdapter: provider.originalAdapter ?? null,
    originalAtsPlatform: provider.originalAtsPlatform ?? null,
    originalModulePath: provider.originalModulePath ?? null,
    originalDryRunFile: provider.originalDryRunFile ?? null,
  }

  pickIfPresent(catalogObject, 'baseUrl', provider.baseUrl)
  pickIfPresent(catalogObject, 'locationCountry', provider.locationCountry)
  pickIfPresent(catalogObject, 'officialBrandName', provider.officialBrandName)
  pickIfPresent(catalogObject, 'homepageUrl', provider.homepageUrl)
  pickIfPresent(catalogObject, 'officialHomepageUrl', provider.officialHomepageUrl)

  return catalogObject
}

const renderCatalogModule = (provider) => {
  const serialized = toJsLiteral(createCatalogModuleObject(provider))
    .replace('"__MODULE_PATH__"', "path.join(currentDir, 'script.js')")
    .replace('"__DRY_RUN_FILE__"', "path.join(currentDir, 'jobs.json')")

  return `import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ${serialized}

export default PROVIDER_METADATA
`
}

const renderSentinelScriptModule = () => `import path from 'node:path'
import { fileURLToPath } from 'node:url'

import PROVIDER_METADATA from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }

// Preserve the current verified-empty behavior behind a dedicated local scraper module.
export const run = async () => []

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, PROVIDER_METADATA.source)
  }
}
`

const renderWorkdayScriptModule = () => `import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../myworkday/engine.js'

import PROVIDER_METADATA from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }

export const run = async ({ signal } = {}) =>
  runWorkdayScraper({
    company: PROVIDER_METADATA.companyName,
    baseUrl: PROVIDER_METADATA.baseUrl,
    locationCountry: PROVIDER_METADATA.locationCountry,
    source: PROVIDER_METADATA.source,
    scraperDir: currentDir,
    ...(signal === undefined ? {} : { signal }),
  })

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, PROVIDER_METADATA.source)
  }
}
`

const renderScriptModule = (provider) =>
  provider.backfillMode === 'workday'
    ? renderWorkdayScriptModule(provider)
    : renderSentinelScriptModule(provider)

const loadSeedManifest = (manifestPaths = []) =>
  manifestPaths
    .filter((candidatePath) => existsSync(candidatePath))
    .map((candidatePath) => JSON.parse(readFileSync(candidatePath, 'utf8')))
    .filter((value) => Array.isArray(value) && value.length > 0)
    .sort((left, right) => right.length - left.length)[0] || null

const materializeSourceDirectory = (provider) => {
  const sourceDir = path.join(scraperDir, provider.source)
  mkdirSync(sourceDir, { recursive: true })
  writeFileSync(path.join(sourceDir, 'catalog.js'), renderCatalogModule(provider), 'utf8')
  writeFileSync(path.join(sourceDir, 'script.js'), renderScriptModule(provider), 'utf8')
  writeFileSync(path.join(sourceDir, 'jobs.json'), '[]\n', 'utf8')
}

const classifyCoverageRow = ({ source, provider }) => {
  const hasSourceDir = existsSync(path.join(scraperDir, source))
  const isSharedSentinel =
    provider?.atsPlatform === 'workbook-exact-name-sentinel'
    || String(provider?.modulePath || '').includes('failClosedSentinel.js')

  if (isSharedSentinel) return 'sentinel_placeholder'
  if (hasSourceDir) return 'dedicated_source_dir'
  return 'provider_only'
}

const writeCoverageArtifact = ({ coverageRows, catalog }) => {
  const providersBySource = new Map(catalog.map((provider) => [provider.source, provider]))
  const headers = ['company', 'source', 'has_backend_scraper_folder', 'coverage_type']
  const lines = [headers.join(',')]

  for (const row of coverageRows) {
    const source = String(row.source || '').trim()
    const provider = providersBySource.get(source)
    const coverageType = classifyCoverageRow({ source, provider })
    const hasSourceDir = existsSync(path.join(scraperDir, source))

    lines.push([
      escapeCsv(row.company),
      escapeCsv(source),
      escapeCsv(hasSourceDir ? 'yes' : 'no'),
      escapeCsv(coverageType),
    ].join(','))
  }

  writeFileSync(coverageArtifactPath, `${lines.join('\n')}\n`, 'utf8')
}

export const generateDedicatedScraperFolderBackfill = ({
  coveragePath = coverageArtifactPath,
  outputManifestPath = manifestPath,
} = {}) => {
  const coverageRows = parseCsvRows(readFileSync(coveragePath, 'utf8'))
  const existingManifest = loadSeedManifest([outputManifestPath, legacyManifestPath])
  const initialCatalog = getScraperCatalog()
  const manifest = Array.isArray(existingManifest) && existingManifest.length > 0
    ? existingManifest
    : buildTargetManifestFromCoverage({
      coverageRows,
      catalog: initialCatalog,
    })

  mkdirSync(path.dirname(outputManifestPath), { recursive: true })
  writeFileSync(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  for (const provider of manifest) {
    materializeSourceDirectory(provider)
  }

  const updatedCatalog = getScraperCatalog()
  writeCoverageArtifact({ coverageRows, catalog: updatedCatalog })

  return {
    coveragePath,
    manifestPath: outputManifestPath,
    generatedSourceCount: manifest.length,
    generatedDirectoryCount: manifest.length,
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(generateDedicatedScraperFolderBackfill(), null, 2))
}
