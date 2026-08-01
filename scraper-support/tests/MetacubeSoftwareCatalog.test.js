import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/metacubesoftware/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/metacubesoftware/catalog.js')
  } catch {
    assert.fail('Expected Metacube Software catalog module at ../../scraper/metacubesoftware/catalog.js')
  }
}

test('Metacube Software local catalog captures the verified fail-closed first-party careers shell', async () => {
  const { METACUBE_SOFTWARE_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(METACUBE_SOFTWARE_CATALOG)

  assert.equal(defaultCatalog, METACUBE_SOFTWARE_CATALOG)
  assert.equal(provider.source, 'metacubesoftware')
  assert.equal(provider.companyName, 'Metacube Software')
  assert.equal(provider.officialBrandName, 'Metacube')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.metacube.com/')
  assert.equal(provider.companyCareerPage, 'https://metacube.com/careers.php')
  assert.equal(provider.companyDomain, 'metacube.com')
  assert.equal(provider.atsPlatform, 'official-first-party-careers-shell-no-public-role-cards')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-shell-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-shell-without-trustworthy-public-role-cards-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /metacubesoftware[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/metacube\.com\/careers\.php/i)
  assert.match(provider.verifiedSurfaceSummary, /Open Positions General Application/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public role cards/i)
})

test('Metacube Software exact backlog row resolves from the local provider contract', async () => {
  const { METACUBE_SOFTWARE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Metacube Software\n',
    catalog: [hydrateProviderCatalogEntry(METACUBE_SOFTWARE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Metacube Software', 'metacubesoftware', 'Metacube Software']],
  )
})
