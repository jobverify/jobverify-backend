import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const eslSteelModulePath = path.resolve(currentDir, '../eslsteel/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../eslsteel/catalog.js')
  } catch {
    assert.fail('Expected ESL Steel catalog module at ../eslsteel/catalog.js')
  }
}

const loadEslSteelModule = async () => {
  try {
    return await import('../eslsteel/script.js')
  } catch {
    assert.fail('Expected ESL Steel scraper module at ../eslsteel/script.js')
  }
}

test('ESL Steel local catalog captures the verified first-party jobs archive and detail contract', async () => {
  const { ESL_STEEL_CATALOG } = await loadCatalogModule()
  const eslSteel = await loadEslSteelModule()

  assert.equal(ESL_STEEL_CATALOG.source, 'eslsteel')
  assert.equal(ESL_STEEL_CATALOG.companyName, 'ESL Steel')
  assert.equal(ESL_STEEL_CATALOG.officialBrandName, 'ESL Steel Limited')
  assert.equal(ESL_STEEL_CATALOG.adapter, 'script')
  assert.equal(ESL_STEEL_CATALOG.officialHomepageUrl, 'https://www.eslsteel.com/')
  assert.equal(ESL_STEEL_CATALOG.officialCareerLandingUrl, 'https://www.eslsteel.com/career/')
  assert.equal(ESL_STEEL_CATALOG.officialJobsArchiveUrl, 'https://www.eslsteel.com/jobs/')
  assert.equal(ESL_STEEL_CATALOG.companyCareerPage, 'https://www.eslsteel.com/jobs/')
  assert.equal(
    ESL_STEEL_CATALOG.verifiedJobDetailExampleUrl,
    'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
  )
  assert.equal(
    ESL_STEEL_CATALOG.verifiedSecondJobDetailExampleUrl,
    'https://www.eslsteel.com/jobs/product-head-dip/',
  )
  assert.equal(ESL_STEEL_CATALOG.atsPlatform, 'official-company-site')
  assert.equal(ESL_STEEL_CATALOG.countryFilter, 'India')
  assert.equal(ESL_STEEL_CATALOG.paginationStrategy, 'single-first-party-jobs-archive-html')
  assert.equal(
    ESL_STEEL_CATALOG.extractionStrategy,
    'verified-homepage+verified-first-party-jobs-archive+first-party-job-detail-pages+onsite-apply-form',
  )
  assert.equal(ESL_STEEL_CATALOG.parser, 'custom-script')
  assert.equal(ESL_STEEL_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ESL_STEEL_CATALOG.companyDomain, 'eslsteel.com')
  assert.equal(ESL_STEEL_CATALOG.verifiedOn, '2026-07-15')
  assert.match(ESL_STEEL_CATALOG.dryRunFile, /eslsteel[\\/]jobs\.json$/i)
  assert.equal(ESL_STEEL_CATALOG.modulePath, eslSteelModulePath)
  assert.match(ESL_STEEL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.eslsteel\.com\/career\//i)
  assert.match(ESL_STEEL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.eslsteel\.com\/jobs\//i)
  assert.match(
    ESL_STEEL_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.eslsteel\.com\/jobs\/shift-in-charge-blast-furnace\//i,
  )
  assert.match(
    ESL_STEEL_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.eslsteel\.com\/jobs\/product-head-dip\//i,
  )
  assert.match(ESL_STEEL_CATALOG.verifiedSurfaceSummary, /Apply For This Job/i)
  assert.match(ESL_STEEL_CATALOG.verifiedSurfaceSummary, /Shift In-charge Blast Furnace/i)
  assert.match(ESL_STEEL_CATALOG.verifiedSurfaceSummary, /Product Head/i)

  assert.equal(eslSteel.PROVIDER_METADATA.source, ESL_STEEL_CATALOG.source)
  assert.equal(eslSteel.PROVIDER_METADATA.companyName, ESL_STEEL_CATALOG.companyName)
  assert.equal(eslSteel.PROVIDER_METADATA.companyCareerPage, ESL_STEEL_CATALOG.companyCareerPage)
  assert.equal(
    eslSteel.PROVIDER_METADATA.verifiedJobDetailExampleUrl,
    ESL_STEEL_CATALOG.verifiedJobDetailExampleUrl,
  )
})

test('ESL Steel backlog row resolves directly from local provider metadata without an alias entry', async () => {
  const { ESL_STEEL_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'ESL Steel\n',
    catalog: [ESL_STEEL_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ESL Steel', 'eslsteel', 'ESL Steel']],
  )
})
