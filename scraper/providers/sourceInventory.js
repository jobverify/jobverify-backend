import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const scraperDir = path.resolve(currentDir, '..')

export const getDiskBackedScraperSources = ({
  catalog = [],
  scraperDirectories = readdirSync(scraperDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
} = {}) => {
  const scraperDirectorySet = new Set(scraperDirectories)
  const providersBySource = new Map(catalog.map((provider) => [provider.source, provider]))

  return [...new Set(catalog.map((provider) => provider.source))]
    .filter((source) => {
      const provider = providersBySource.get(source)

      return scraperDirectorySet.has(source)
        || (provider?.dryRunFile ? existsSync(provider.dryRunFile) : false)
    })
}
