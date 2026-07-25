import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../mahindralogistics/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../mahindralogistics/catalog.js')
  } catch {
    assert.fail('Expected Mahindra Logistics catalog module at ../mahindralogistics/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../mahindralogistics/script.js')
  } catch {
    assert.fail('Expected Mahindra Logistics scraper module at ../mahindralogistics/script.js')
  }
}

test('Mahindra Logistics local catalog captures the verified official careers handoff plus public Darwinbox jobs surface', async () => {
  const { MAHINDRA_LOGISTICS_CATALOG } = await loadCatalogModule()
  const mahindraLogistics = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(MAHINDRA_LOGISTICS_CATALOG)

  assert.equal(provider.source, 'mahindralogistics')
  assert.equal(provider.companyName, 'Mahindra Logistics')
  assert.equal(provider.officialBrandName, 'Mahindra Logistics')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://mahindralogistics.com/work-with-us/')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://nectar.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    provider.publicPortalUrl,
    'https://nectar.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    provider.darwinboxListingApiUrl,
    'https://nectar.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(provider.darwinboxOrigin, 'https://nectar.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.companyDomain, 'mahindralogistics.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-work-with-us-page-plus-darwinbox-listing-api',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-work-with-us-page-handoff+darwinbox-listing-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /mahindralogistics[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/mahindralogistics\.com\/work-with-us\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/nectar\.darwinbox\.in\/ms\/candidate\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/nectar\.darwinbox\.in\/ms\/candidateapi\/job\/alljobs\?companyId=main/i)
  assert.match(provider.verifiedSurfaceSummary, /\b41 open jobs\b/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Mahindra Logistics'), false)

  assert.equal(
    mahindraLogistics.PROVIDER_METADATA.source,
    MAHINDRA_LOGISTICS_CATALOG.source,
  )
  assert.equal(
    mahindraLogistics.PROVIDER_METADATA.companyName,
    MAHINDRA_LOGISTICS_CATALOG.companyName,
  )
  assert.equal(
    mahindraLogistics.PROVIDER_METADATA.officialCareersHandoffUrl,
    MAHINDRA_LOGISTICS_CATALOG.officialCareersHandoffUrl,
  )
})

test('Mahindra Logistics backlog row matches directly from the local catalog without alias churn', async () => {
  const { MAHINDRA_LOGISTICS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Mahindra Logistics\n',
    catalog: [hydrateProviderCatalogEntry(MAHINDRA_LOGISTICS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Mahindra Logistics', 'mahindralogistics', 'Mahindra Logistics']],
  )
})
