import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const liciousModulePath = path.resolve(currentDir, '../../scraper/licious/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/licious/catalog.js')
  } catch {
    assert.fail('Expected Licious catalog module at ../../scraper/licious/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/licious/script.js')
  } catch {
    assert.fail('Expected Licious scraper module at ../../scraper/licious/script.js')
  }
}

test('Licious local catalog captures the verified official careers handoff plus public Darwinbox jobs API contract', async () => {
  const { LICIOUS_CATALOG } = await loadCatalogModule()
  const licious = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(LICIOUS_CATALOG)

  assert.equal(provider.source, 'licious')
  assert.equal(provider.companyName, 'Licious')
  assert.equal(provider.officialBrandName, 'Licious')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.licious.com/')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://licious.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    provider.publicPortalUrl,
    'https://licious.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    provider.darwinboxListingApiUrl,
    'https://licious.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(provider.darwinboxOrigin, 'https://licious.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.companyDomain, 'careers.licious.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-careers-page-plus-darwinbox-listing-api',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-page-handoff+darwinbox-listing-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /licious[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, liciousModulePath)
  assert.match(provider.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.licious\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/licious\.darwinbox\.in\/ms\/candidate\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/licious\.darwinbox\.in\/ms\/candidateapi\/job\/alljobs\?companyId=main/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Licious'), false)

  assert.equal(licious.PROVIDER_METADATA.source, LICIOUS_CATALOG.source)
  assert.equal(licious.PROVIDER_METADATA.companyName, LICIOUS_CATALOG.companyName)
  assert.equal(
    licious.PROVIDER_METADATA.officialCareersHandoffUrl,
    LICIOUS_CATALOG.officialCareersHandoffUrl,
  )
})

test('Licious backlog row matches directly from the local catalog without alias churn', async () => {
  const { LICIOUS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Licious\n',
    catalog: [hydrateProviderCatalogEntry(LICIOUS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Licious', 'licious', 'Licious']],
  )
})
