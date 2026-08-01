import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const gokhanaModulePath = path.resolve(currentDir, '../../scraper/gokhana/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/gokhana/catalog.js')
  } catch {
    assert.fail('Expected GoKhana catalog module at ../../scraper/gokhana/catalog.js')
  }
}

const loadGoKhanaModule = async () => {
  try {
    return await import('../../scraper/gokhana/script.js')
  } catch {
    assert.fail('Expected GoKhana scraper module at ../../scraper/gokhana/script.js')
  }
}

test('GoKhana local catalog captures the verified official careers page with live openings', async () => {
  const { GOKHANA_CATALOG } = await loadCatalogModule()
  const gokhana = await loadGoKhanaModule()

  assert.deepEqual(GOKHANA_CATALOG, {
    source: 'gokhana',
    companyName: 'GoKhana',
    companyCareerPage: 'https://gokhana.com/careers/',
    companyDomain: 'gokhana.com',
    adapter: 'script',
    atsPlatform: 'official-company-careers-linkout',
    countryFilter: 'India',
    paginationStrategy: 'single-page-job-card-scan',
    extractionStrategy: 'official-careers-page+elementor-job-card-extraction+linkedin-apply-links',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    modulePath: gokhanaModulePath,
    verifiedOn: '2026-07-16',
    verifiedSurfaceSummary: 'Verified on July 16, 2026 that https://gokhana.com/careers/ is the current official GoKhana careers page and publicly lists 10 open positions on the first-party page with location, employment type, and LinkedIn apply links.',
    openingCount: 10,
    applyDomain: 'linkedin.com',
  })

  assert.equal(gokhana.PROVIDER_METADATA.source, GOKHANA_CATALOG.source)
  assert.equal(gokhana.PROVIDER_METADATA.companyName, GOKHANA_CATALOG.companyName)
  assert.equal(gokhana.PROVIDER_METADATA.companyCareerPage, GOKHANA_CATALOG.companyCareerPage)
  assert.equal(gokhana.PROVIDER_METADATA.openingCount, GOKHANA_CATALOG.openingCount)
})

test('GoKhana exact backlog row resolves directly from the local provider metadata without aliases', async () => {
  const { GOKHANA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'GoKhana\n',
    catalog: [GOKHANA_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['GoKhana', 'gokhana', 'GoKhana']],
  )
})

test('getScraperCatalog includes GoKhana as a verified live careers provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'gokhana')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'GoKhana')
  assert.equal(provider.companyCareerPage, 'https://gokhana.com/careers/')
  assert.equal(provider.companyDomain, 'gokhana.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-linkout')
  assert.match(provider.modulePath, /gokhana[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable GoKhana scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'gokhana')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'gokhana')
  assert.equal(scraper.provider.atsPlatform, 'official-company-careers-linkout')
  assert.match(scraper.dryRunFile, /gokhana[\\/]jobs\.json$/i)
})
