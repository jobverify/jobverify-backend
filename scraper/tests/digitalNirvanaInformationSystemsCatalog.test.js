import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../digitalnirvanainformationsystems/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../digitalnirvanainformationsystems/catalog.js')
  } catch {
    assert.fail('Expected Digital Nirvana Information Systems catalog module at ../digitalnirvanainformationsystems/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../digitalnirvanainformationsystems/script.js')
  } catch {
    assert.fail('Expected Digital Nirvana Information Systems scraper module at ../digitalnirvanainformationsystems/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Digital Nirvana Information Systems local catalog captures the verified homepage careers fragments and unresolved listing contract', async () => {
  const { DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const digitalNirvana = await loadScriptModule()
  const provider = buildCatalogReadyProvider(DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG)

  assert.equal(defaultCatalog, DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG)
  assert.equal(provider.source, 'digitalnirvanainformationsystems')
  assert.equal(provider.companyName, 'Digital Nirvana Information Systems')
  assert.equal(provider.officialBrandName, 'Digital Nirvana')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://digital-nirvana.com/')
  assert.equal(provider.companyCareerPage, 'https://digital-nirvana.com/')
  assert.equal(provider.atsPlatform, 'official-company-site-unresolved-listing-contract')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-first-party-homepage-careers-fragments-without-public-job-links',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-careers-fragments-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'digital-nirvana.com')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/digital-nirvana\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /Careers/i)
  assert.match(provider.verifiedSurfaceSummary, /Required skill set/i)
  assert.match(provider.verifiedSurfaceSummary, /Apply Now/i)
  assert.match(provider.verifiedSurfaceSummary, /no stable public job titles or job detail links/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /digitalnirvanainformationsystems[\\/]jobs\.json$/i)

  assert.equal(digitalNirvana.PROVIDER_METADATA.source, provider.source)
  assert.equal(digitalNirvana.PROVIDER_METADATA.companyName, provider.companyName)
})

test('Digital Nirvana Information Systems exact backlog row resolves from the local provider contract without alias churn', async () => {
  const { DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Digital Nirvana Information Systems\n',
    catalog: [buildCatalogReadyProvider(DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Digital Nirvana Information Systems', 'digitalnirvanainformationsystems', 'Digital Nirvana Information Systems']],
  )
})
