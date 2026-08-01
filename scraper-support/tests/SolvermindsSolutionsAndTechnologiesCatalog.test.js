import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/solvermindssolutionsandtechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/solvermindssolutionsandtechnologies/catalog.js')
  } catch {
    assert.fail('Expected Solverminds Solutions and Technologies catalog module at ../../scraper/solvermindssolutionsandtechnologies/catalog.js')
  }
}

test('Solverminds Solutions and Technologies local catalog captures the verified login-gated candidate portal contract', async () => {
  const { SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'solvermindssolutionsandtechnologies')
  assert.equal(provider.companyName, 'Solverminds Solutions and Technologies')
  assert.equal(provider.officialBrandName, 'Solverminds Solutions and Technologies Pvt. Ltd.')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.solverminds.com/')
  assert.equal(provider.companyCareerPage, 'https://careers.solverminds.com/candidateportal?source=career')
  assert.equal(provider.aboutPageUrl, 'https://www.solverminds.com/about')
  assert.equal(provider.companyDomain, 'solverminds.com')
  assert.equal(provider.atsPlatform, 'official-company-site-blocked-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-about-plus-login-gated-candidate-portal-validation')
  assert.equal(provider.extractionStrategy, 'verified-homepage+verified-about-careers-copy+verified-login-gated-candidate-portal-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /solvermindssolutionsandtechnologies[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.solverminds\.com\/about/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.solverminds\.com\/candidateportal\?source=career/i)
  assert.match(provider.verifiedSurfaceSummary, /login-gated candidate portal/i)
})

test('Solverminds Solutions and Technologies exact backlog row resolves from the local provider contract', async () => {
  const { SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Solverminds Solutions and Technologies\n',
    catalog: [hydrateProviderCatalogEntry(SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Solverminds Solutions and Technologies', 'solvermindssolutionsandtechnologies', 'Solverminds Solutions and Technologies']],
  )
})
