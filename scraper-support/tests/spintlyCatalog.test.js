import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/spintly/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/spintly/catalog.js')
  } catch {
    assert.fail('Expected Spintly catalog module at ../../scraper/spintly/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/spintly/script.js')
  } catch {
    assert.fail('Expected Spintly scraper module at ../../scraper/spintly/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Spintly local catalog captures the verified first-party inline jobs surface', async () => {
  const { SPINTLY_CATALOG } = await loadCatalogModule()
  const spintly = await loadScriptModule()
  const provider = buildCatalogReadyProvider(SPINTLY_CATALOG)

  assert.equal(provider.source, 'spintly')
  assert.equal(provider.companyName, 'Spintly')
  assert.equal(provider.officialBrandName, 'Spintly')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://spintly.com/')
  assert.equal(provider.companyCareerPage, 'https://spintly.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page-text-sections')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+inline-job-sections+shared-apply-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'spintly.com')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/spintly\.com\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /Job Openings/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /spintly[\\/]jobs\.json$/i)

  assert.equal(spintly.PROVIDER_METADATA.source, provider.source)
  assert.equal(spintly.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(spintly.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
})

test('Spintly exact backlog row resolves from the local provider contract without alias churn', async () => {
  const { SPINTLY_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Spintly\n',
    catalog: [buildCatalogReadyProvider(SPINTLY_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Spintly', 'spintly', 'Spintly']],
  )
})
