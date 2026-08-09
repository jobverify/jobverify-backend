import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/gardenreachshipbuilders/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/gardenreachshipbuilders/catalog.js')
  } catch {
    assert.fail('Expected Garden Reach Shipbuilders catalog module at ../../scraper/gardenreachshipbuilders/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/gardenreachshipbuilders/script.js')
  } catch {
    assert.fail('Expected Garden Reach Shipbuilders scraper module at ../../scraper/gardenreachshipbuilders/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Garden Reach Shipbuilders local catalog captures the verified first-party careers contract and no-active-openings status on August 2, 2026', async () => {
  const { GARDEN_REACH_SHIPBUILDERS_CATALOG } = await loadCatalogModule()
  const gardenReachShipbuilders = await loadScraperModule()
  const provider = buildCatalogReadyProvider(GARDEN_REACH_SHIPBUILDERS_CATALOG)

  assert.equal(provider.source, 'gardenreachshipbuilders')
  assert.equal(provider.companyName, 'Garden Reach Shipbuilders')
  assert.equal(provider.officialBrandName, 'Garden Reach Shipbuilders & Engineers Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.grse.in/')
  assert.equal(provider.companyCareerPage, 'https://www.grse.in/career/')
  assert.deepEqual(provider.verifiedApplyPortalUrls, [
    'https://jobapply.in/grse2026/',
    'https://jobapply.in/grse2025/',
  ])
  assert.equal(provider.companyDomain, 'grse.in')
  assert.equal(provider.atsPlatform, 'official-company-careers-with-linked-public-apply-portal')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page-with-notification-date-filter')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-careers-page+numbered-notification-blocks+effective-closing-date-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-08-02')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /gardenreachshipbuilders[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.grse\.in\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.grse\.in\/career\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/jobapply\.in\/grse2026\/?/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/jobapply\.in\/grse2025\/?/i)
  assert.match(provider.verifiedSurfaceSummary, /2026\/03\(O\)/i)
  assert.match(provider.verifiedSurfaceSummary, /2025\/08\(O\)/i)
  assert.match(provider.verifiedSurfaceSummary, /March 31, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /no active public openings remained on August 2, 2026/i)

  assert.equal(gardenReachShipbuilders.PROVIDER_METADATA.source, provider.source)
  assert.equal(gardenReachShipbuilders.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(
    gardenReachShipbuilders.PROVIDER_METADATA.companyCareerPage,
    provider.companyCareerPage,
  )
  assert.deepEqual(
    gardenReachShipbuilders.VERIFIED_APPLY_PORTAL_URLS,
    provider.verifiedApplyPortalUrls,
  )
})

test('Garden Reach Shipbuilders exact backlog row matches directly from the local provider contract without aliases', async () => {
  const { GARDEN_REACH_SHIPBUILDERS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Garden Reach Shipbuilders\n',
    catalog: [buildCatalogReadyProvider(GARDEN_REACH_SHIPBUILDERS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Garden Reach Shipbuilders', 'gardenreachshipbuilders', 'Garden Reach Shipbuilders']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Garden Reach Shipbuilders'), false)
})
