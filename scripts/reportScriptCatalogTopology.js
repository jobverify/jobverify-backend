import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getScraperCatalog } from '../scraper-support/providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')
const repoDir = path.resolve(backendDir, '..')
const scraperDir = path.join(backendDir, 'scraper')
const providersDir = path.join(scraperDir, 'providers')
const providerExtensionsDir = path.join(
  backendDir,
  'scraper-support',
  'providers',
  'providerExtensions',
)
const reportPath = path.join(backendDir, 'company_coverage_report.json')
const outputDir = path.join(backendDir, 'artifacts', 'scraper-catalog')
const SENTINEL_MODULE_BASENAME = 'failClosedSentinel.js'

const toRepoRelativePath = (value) =>
  path.relative(repoDir, value).replace(/\\/g, '/')

const readCoverageReportSources = () => {
  if (!existsSync(reportPath)) return null

  const report = JSON.parse(readFileSync(reportPath, 'utf8'))
  return new Set(
    (report.matched || []).map((item) => String(item.source || '').toLowerCase()),
  )
}

const getTopLevelScraperDirectories = () =>
  new Set(
    readdirSync(scraperDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name.toLowerCase()),
  )

const getProviderExtensionMetadataBySource = () => {
  const metadataBySource = new Map()
  const extensionFiles = readdirSync(providerExtensionsDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))

  for (const fileName of extensionFiles) {
    const filePath = path.join(providerExtensionsDir, fileName)
    const fileText = readFileSync(filePath, 'utf8')
    const fileLines = fileText.split(/\r?\n/)
    const parsed = JSON.parse(fileText)
    const entries = Array.isArray(parsed) ? parsed : [parsed]

    entries.forEach((entry, index) => {
      const source = String(entry?.source || '').toLowerCase()
      if (!source) return

      const sourceLineIndex = fileLines.findIndex((line) =>
        line.includes(`"source": "${entry.source}"`),
      )

      metadataBySource.set(source, {
        providerExtensionFile: toRepoRelativePath(filePath),
        providerExtensionEntryIndex: index,
        providerExtensionSourceLine: sourceLineIndex >= 0 ? sourceLineIndex + 1 : null,
        providerExtensionEntry: entry,
      })
    })
  }

  return metadataBySource
}

const resolveDryRunSummary = (dryRunFile) => {
  const absoluteDryRunFile = path.resolve(dryRunFile)
  const summary = {
    dryRunFile: toRepoRelativePath(absoluteDryRunFile),
    dryRunFileExists: false,
    dryRunFileSize: 0,
    dryRunJobCount: null,
  }

  if (!existsSync(absoluteDryRunFile)) return summary

  summary.dryRunFileExists = true
  summary.dryRunFileSize = statSync(absoluteDryRunFile).size

  try {
    const parsed = JSON.parse(readFileSync(absoluteDryRunFile, 'utf8'))
    summary.dryRunJobCount = Array.isArray(parsed) ? parsed.length : null
  } catch {
    summary.dryRunJobCount = null
  }

  return summary
}

const buildCatalogTopologyReport = () => {
  const reportSources = readCoverageReportSources()
  const topLevelDirectories = getTopLevelScraperDirectories()
  const providerExtensionMetadataBySource = getProviderExtensionMetadataBySource()

  const realModuleMappings = []
  const sentinelPlaceholderMappings = []

  for (const provider of getScraperCatalog()) {
    const source = String(provider.source || '').toLowerCase()
    if (!source) continue
    if (reportSources && !reportSources.has(source)) continue
    if (String(provider.adapter || '') !== 'script') continue
    if (topLevelDirectories.has(source)) continue

    const resolvedModulePath = path.resolve(providersDir, provider.modulePath || '')
    const extensionMetadata = providerExtensionMetadataBySource.get(source) || {
      providerExtensionFile: null,
      providerExtensionEntryIndex: null,
      providerExtensionSourceLine: null,
      providerExtensionEntry: null,
    }
    const mapping = {
      source,
      companyName: provider.companyName || provider.company || source,
      modulePath: provider.modulePath || null,
      resolvedModulePath: toRepoRelativePath(resolvedModulePath),
      ...resolveDryRunSummary(provider.dryRunFile),
      ...extensionMetadata,
    }

    if (path.basename(resolvedModulePath) === SENTINEL_MODULE_BASENAME) {
      sentinelPlaceholderMappings.push(mapping)
      continue
    }

    realModuleMappings.push(mapping)
  }

  realModuleMappings.sort((left, right) => left.source.localeCompare(right.source))
  sentinelPlaceholderMappings.sort((left, right) => left.source.localeCompare(right.source))

  const sentinelCountsByModule = sentinelPlaceholderMappings.reduce((accumulator, item) => {
    accumulator[item.resolvedModulePath] = (accumulator[item.resolvedModulePath] || 0) + 1
    return accumulator
  }, {})

  return {
    generatedAt: new Date().toISOString(),
    reportScope: reportSources ? 'company_coverage_report.json matched sources' : 'all catalog sources',
    realFileBackedSourcesWithoutTopLevelDirectory: realModuleMappings,
    sentinelPlaceholderSourcesWithoutTopLevelDirectory: sentinelPlaceholderMappings,
    summary: {
      realFileBackedSourceCount: realModuleMappings.length,
      sentinelPlaceholderSourceCount: sentinelPlaceholderMappings.length,
      sentinelCountsByModule,
      sentinelDryRunFilesAllEmpty: sentinelPlaceholderMappings.every(
        (item) => item.dryRunJobCount === 0,
      ),
    },
  }
}

export const writeCatalogTopologyArtifacts = ({
  outputDirectory = outputDir,
} = {}) => {
  mkdirSync(outputDirectory, { recursive: true })

  const report = buildCatalogTopologyReport()
  const summaryPath = path.join(outputDirectory, 'summary.json')
  const realMappingsPath = path.join(outputDirectory, 'real-dedicated-script-mappings.json')
  const sentinelMappingsPath = path.join(outputDirectory, 'sentinel-placeholder-mappings.json')

  writeFileSync(summaryPath, `${JSON.stringify(report.summary, null, 2)}\n`)
  writeFileSync(
    realMappingsPath,
    `${JSON.stringify(report.realFileBackedSourcesWithoutTopLevelDirectory, null, 2)}\n`,
  )
  writeFileSync(
    sentinelMappingsPath,
    `${JSON.stringify(report.sentinelPlaceholderSourcesWithoutTopLevelDirectory, null, 2)}\n`,
  )

  return {
    outputDirectory: toRepoRelativePath(outputDirectory),
    summaryPath: toRepoRelativePath(summaryPath),
    realMappingsPath: toRepoRelativePath(realMappingsPath),
    sentinelMappingsPath: toRepoRelativePath(sentinelMappingsPath),
    ...report.summary,
  }
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  console.log(JSON.stringify(writeCatalogTopologyArtifacts(), null, 2))
}
