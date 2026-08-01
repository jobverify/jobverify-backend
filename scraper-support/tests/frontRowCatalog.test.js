import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const frontRowModulePath = path.resolve(currentDir, '../../scraper/frontrow/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/frontrow/catalog.js')
  } catch {
    assert.fail('Expected FrontRow catalog module at ../../scraper/frontrow/catalog.js')
  }
}

const loadFrontRowModule = async () => {
  try {
    return await import('../../scraper/frontrow/script.js')
  } catch {
    assert.fail('Expected FrontRow scraper module at ../../scraper/frontrow/script.js')
  }
}

test('FrontRow local catalog captures the verified shutdown redirect and no-public-jobs contract', async () => {
  const { FRONTROW_CATALOG } = await loadCatalogModule()
  const frontRow = await loadFrontRowModule()

  assert.equal(FRONTROW_CATALOG.source, 'frontrow')
  assert.equal(FRONTROW_CATALOG.companyName, 'FrontRow')
  assert.equal(FRONTROW_CATALOG.officialBrandName, 'FrontRow')
  assert.equal(FRONTROW_CATALOG.adapter, 'script')
  assert.equal(FRONTROW_CATALOG.homepageUrl, 'https://frontrow.co.in/')
  assert.equal(FRONTROW_CATALOG.companyCareerPage, 'https://frontrow.co.in/')
  assert.equal(
    FRONTROW_CATALOG.shutdownUpdateUrl,
    'https://medium.com/@frontrowblog/frontrow-update-6ac848595ed2',
  )
  assert.equal(FRONTROW_CATALOG.companyDomain, 'frontrow.co.in')
  assert.equal(FRONTROW_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(FRONTROW_CATALOG.countryFilter, 'India')
  assert.equal(FRONTROW_CATALOG.paginationStrategy, 'verified-homepage-shutdown-redirect-plus-verified-update-article')
  assert.equal(
    FRONTROW_CATALOG.extractionStrategy,
    'verified-homepage-redirect-to-official-shutdown-update-return-empty',
  )
  assert.equal(FRONTROW_CATALOG.parser, 'custom-script')
  assert.equal(FRONTROW_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(FRONTROW_CATALOG.verifiedOn, '2026-07-15')
  assert.match(FRONTROW_CATALOG.dryRunFile, /frontrow[\\/]jobs\.json$/i)
  assert.equal(FRONTROW_CATALOG.modulePath, frontRowModulePath)
  assert.match(FRONTROW_CATALOG.verifiedSurfaceSummary, /https:\/\/frontrow\.co\.in\//i)
  assert.match(
    FRONTROW_CATALOG.verifiedSurfaceSummary,
    /https:\/\/medium\.com\/@frontrowblog\/frontrow-update-6ac848595ed2/i,
  )
  assert.match(FRONTROW_CATALOG.verifiedSurfaceSummary, /shut down a few months ago/i)
  assert.match(FRONTROW_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)

  assert.equal(frontRow.PROVIDER_METADATA.source, FRONTROW_CATALOG.source)
  assert.equal(frontRow.PROVIDER_METADATA.companyName, FRONTROW_CATALOG.companyName)
  assert.equal(frontRow.PROVIDER_METADATA.companyCareerPage, FRONTROW_CATALOG.companyCareerPage)
})

test('FrontRow exact backlog row resolves directly from local provider metadata without aliases', async () => {
  const { FRONTROW_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'FrontRow\n',
    catalog: [FRONTROW_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['FrontRow', 'frontrow', 'FrontRow']],
  )
})
