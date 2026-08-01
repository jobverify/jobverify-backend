import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')
const repoDir = path.resolve(backendDir, '..')
const scraperDir = path.join(backendDir, 'scraper')
const manifestPath = path.join(
  scraperDir,
  'providers',
  'providerExtensions',
  'zz-dedicated-scraper-folder-backfill.json',
)
const coverageArtifactPath = path.join(repoDir, 'artifacts', 'company-scraper-check-india-hiring-400.csv')

const BACKFILL_MANIFEST = JSON.parse(readFileSync(manifestPath, 'utf8'))

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

  const [headerLine, ...dataLines] = lines
  const headers = parseCsvLine(headerLine)

  return dataLines.map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

test('generated dedicated scraper backfill manifest stays aligned with local folder files', () => {
  assert.equal(BACKFILL_MANIFEST.length, 378)

  for (const provider of BACKFILL_MANIFEST) {
    const sourceDir = path.join(scraperDir, provider.source)

    assert.equal(existsSync(path.join(sourceDir, 'catalog.js')), true, `${provider.source} should have catalog.js`)
    assert.equal(existsSync(path.join(sourceDir, 'script.js')), true, `${provider.source} should have script.js`)
    assert.equal(existsSync(path.join(sourceDir, 'jobs.json')), true, `${provider.source} should have jobs.json`)
  }
})

test('getScraperCatalog resolves backfilled sentinel and workday providers to local script modules', () => {
  const catalog = getScraperCatalog()
  const uniqueSources = new Set(catalog.map((provider) => provider.source))

  assert.equal(uniqueSources.size, catalog.length, 'catalog sources should remain unique after local overrides')

  const lucidya = catalog.find((provider) => provider.source === 'lucidya')
  assert.ok(lucidya)
  assert.equal(lucidya.adapter, 'script')
  assert.equal(lucidya.atsPlatform, 'dedicated-local-empty-scraper')
  assert.match(lucidya.modulePath, /lucidya[\\/]script\.js$/i)
  assert.match(lucidya.dryRunFile, /lucidya[\\/]jobs\.json$/i)

  const fortanix = catalog.find((provider) => provider.source === 'fortanix')
  assert.ok(fortanix)
  assert.equal(fortanix.adapter, 'script')
  assert.equal(fortanix.atsPlatform, 'dedicated-local-empty-scraper')
  assert.match(fortanix.modulePath, /fortanix[\\/]script\.js$/i)

  const alation = catalog.find((provider) => provider.source === 'alation')
  assert.ok(alation)
  assert.equal(alation.adapter, 'script')
  assert.equal(alation.atsPlatform, 'workday')
  assert.match(alation.modulePath, /alation[\\/]script\.js$/i)
  assert.match(alation.dryRunFile, /alation[\\/]jobs\.json$/i)

  const browserstack = catalog.find((provider) => provider.source === 'browserstack')
  assert.ok(browserstack)
  assert.equal(browserstack.adapter, 'script')
  assert.equal(browserstack.atsPlatform, 'workday')
  assert.match(browserstack.modulePath, /browserstack[\\/]script\.js$/i)
})

test('buildScrapers and the refreshed coverage artifact treat the backfilled set as dedicated local scrapers', () => {
  const scrapers = buildScrapers()

  assert.equal(scrapers.filter((scraper) => scraper.name === 'lucidya').length, 1)
  assert.equal(scrapers.filter((scraper) => scraper.name === 'alation').length, 1)
  assert.equal(scrapers.filter((scraper) => scraper.name === 'browserstack').length, 1)
  assert.equal(scrapers.filter((scraper) => scraper.name === 'fortanix').length, 1)

  const coverageRows = parseCsvRows(readFileSync(coverageArtifactPath, 'utf8'))

  assert.equal(coverageRows.length, 400)
  assert.ok(
    coverageRows.every((row) => row.has_backend_scraper_folder === 'yes'),
    'every tracked company should now have a dedicated scraper folder',
  )
  assert.ok(
    coverageRows.every((row) => row.coverage_type === 'dedicated_source_dir'),
    'every tracked company should now resolve as a dedicated source dir',
  )
})
