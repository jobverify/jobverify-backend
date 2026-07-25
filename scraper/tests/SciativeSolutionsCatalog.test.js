import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../sciative/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../sciative/catalog.js')
  } catch {
    assert.fail('Expected Sciative Solutions catalog module at ../sciative/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../sciative/script.js')
  } catch {
    assert.fail('Expected Sciative Solutions scraper module at ../sciative/script.js')
  }
}

test('Sciative Solutions local catalog captures the verified first-party talent-community-only surface', async () => {
  const { SCIATIVE_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const sciative = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(SCIATIVE_SOLUTIONS_CATALOG)

  assert.equal(defaultCatalog, SCIATIVE_SOLUTIONS_CATALOG)
  assert.equal(provider.source, 'sciative')
  assert.equal(provider.companyName, 'Sciative Solutions')
  assert.equal(provider.officialBrandName, 'Sciative')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://sciative.com/')
  assert.equal(provider.companyCareerPage, 'https://sciative.com/about-us')
  assert.equal(provider.companyDomain, 'sciative.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-homepage-plus-about-page-talent-community-scan')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-about-page-talent-community-without-public-openings-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/sciative\.com\/about-us/i)
  assert.match(provider.verifiedSurfaceSummary, /Join Our Talent Community/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public job listings/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /sciative[\\/]jobs\.json$/i)

  assert.equal(sciative.PROVIDER_METADATA.source, provider.source)
  assert.equal(sciative.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
})

test('Sciative Solutions exact backlog row resolves from the local provider contract', async () => {
  const { SCIATIVE_SOLUTIONS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Sciative Solutions\n',
    catalog: [hydrateProviderCatalogEntry(SCIATIVE_SOLUTIONS_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sciative Solutions', 'sciative', 'Sciative Solutions']],
  )
})
