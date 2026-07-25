import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const adda247ModulePath = path.resolve(currentDir, '../adda247/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../adda247/catalog.js')
  } catch {
    assert.fail('Expected Adda247 catalog module at ../adda247/catalog.js')
  }
}

const loadAdda247Module = async () => {
  try {
    return await import('../adda247/script.js')
  } catch {
    assert.fail('Expected Adda247 scraper module at ../adda247/script.js')
  }
}

test('Adda247 local catalog captures the verified first-party careers shell and external Keka handoff state', async () => {
  const { ADDA247_CATALOG } = await loadCatalogModule()
  const adda247 = await loadAdda247Module()

  assert.equal(ADDA247_CATALOG.source, 'adda247')
  assert.equal(ADDA247_CATALOG.companyName, 'Adda247')
  assert.equal(ADDA247_CATALOG.adapter, 'script')
  assert.equal(ADDA247_CATALOG.companyCareerPage, 'https://www.adda247.com/careers.html')
  assert.equal(ADDA247_CATALOG.companyDomain, 'adda247.com')
  assert.equal(ADDA247_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(ADDA247_CATALOG.countryFilter, 'India')
  assert.equal(
    ADDA247_CATALOG.paginationStrategy,
    'single-first-party-careers-page-with-external-ats-handoff',
  )
  assert.equal(
    ADDA247_CATALOG.extractionStrategy,
    'verified-first-party-careers-shell+external-keka-handoff-no-first-party-job-records',
  )
  assert.equal(ADDA247_CATALOG.parser, 'custom-script')
  assert.equal(ADDA247_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ADDA247_CATALOG.verifiedOn, '2026-07-14')
  assert.equal(ADDA247_CATALOG.externalHandoffUrl, 'https://adda247.kekahire.com/')
  assert.match(ADDA247_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.adda247\.com\/careers\.html/i)
  assert.match(ADDA247_CATALOG.verifiedSurfaceSummary, /https:\/\/adda247\.kekahire\.com\/?/i)
  assert.match(ADDA247_CATALOG.verifiedSurfaceSummary, /no public job records/i)
  assert.equal(ADDA247_CATALOG.modulePath, adda247ModulePath)

  assert.equal(adda247.PROVIDER_METADATA.source, ADDA247_CATALOG.source)
  assert.equal(adda247.PROVIDER_METADATA.companyName, ADDA247_CATALOG.companyName)
  assert.equal(
    adda247.PROVIDER_METADATA.companyCareerPage,
    ADDA247_CATALOG.companyCareerPage,
  )
  assert.equal(
    adda247.PROVIDER_METADATA.externalHandoffUrl,
    ADDA247_CATALOG.externalHandoffUrl,
  )
})

test('buildScrapers and company coverage resolve Adda247 from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'adda247')
  const scraper = buildScrapers().find((item) => item.name === 'adda247')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Adda247')
  assert.equal(provider.companyCareerPage, 'https://www.adda247.com/careers.html')
  assert.match(scraper.dryRunFile, /adda247[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Adda247\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Adda247', 'adda247', 'Adda247']],
  )
})
