import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const oneMgModulePath = path.resolve(currentDir, '../1mg/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../1mg/catalog.js')
  } catch {
    assert.fail('Expected 1mg catalog module at ../1mg/catalog.js')
  }
}

const loadOneMgModule = async () => {
  try {
    return await import('../1mg/script.js')
  } catch {
    assert.fail('Expected 1mg scraper module at ../1mg/script.js')
  }
}

test('1mg local catalog captures the verified first-party Darwinbox-backed careers surface', async () => {
  const { ONE_MG_CATALOG } = await loadCatalogModule()
  const oneMg = await loadOneMgModule()

  assert.equal(ONE_MG_CATALOG.source, '1mg')
  assert.equal(ONE_MG_CATALOG.companyName, '1mg')
  assert.equal(ONE_MG_CATALOG.adapter, 'script')
  assert.equal(ONE_MG_CATALOG.companyCareerPage, 'https://www.1mg.com/jobs')
  assert.equal(ONE_MG_CATALOG.companyDomain, '1mg.com')
  assert.equal(ONE_MG_CATALOG.atsPlatform, 'darwinbox')
  assert.equal(ONE_MG_CATALOG.countryFilter, 'India')
  assert.equal(
    ONE_MG_CATALOG.paginationStrategy,
    'browser-session-darwinbox-pagination',
  )
  assert.equal(
    ONE_MG_CATALOG.extractionStrategy,
    'official-careers-page+darwinbox-listing-api',
  )
  assert.equal(ONE_MG_CATALOG.parser, 'custom-script')
  assert.equal(ONE_MG_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ONE_MG_CATALOG.officialCareersHandoffUrl, 'https://1mg.darwinbox.in/jobs')
  assert.equal(ONE_MG_CATALOG.darwinboxOrigin, 'https://1mg.darwinbox.in')
  assert.equal(ONE_MG_CATALOG.darwinboxCompanyId, 'main')
  assert.equal(ONE_MG_CATALOG.verifiedOn, '2026-07-14')
  assert.match(ONE_MG_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.1mg\.com\/jobs/i)
  assert.match(ONE_MG_CATALOG.verifiedSurfaceSummary, /https:\/\/1mg\.darwinbox\.in\/jobs/i)
  assert.match(ONE_MG_CATALOG.verifiedSurfaceSummary, /darwinbox/i)
  assert.equal(ONE_MG_CATALOG.modulePath, oneMgModulePath)

  assert.equal(oneMg.PROVIDER_METADATA.source, ONE_MG_CATALOG.source)
  assert.equal(oneMg.PROVIDER_METADATA.companyName, ONE_MG_CATALOG.companyName)
  assert.equal(oneMg.PROVIDER_METADATA.companyCareerPage, ONE_MG_CATALOG.companyCareerPage)
  assert.equal(
    oneMg.PROVIDER_METADATA.officialCareersHandoffUrl,
    ONE_MG_CATALOG.officialCareersHandoffUrl,
  )
  assert.equal(oneMg.PROVIDER_METADATA.darwinboxOrigin, ONE_MG_CATALOG.darwinboxOrigin)
})

test('buildScrapers and company coverage resolve 1mg plus Tata 1mg aliases from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === '1mg')
  const scraper = buildScrapers().find((item) => item.name === '1mg')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, '1mg')
  assert.equal(provider.companyCareerPage, 'https://www.1mg.com/jobs')
  assert.match(scraper.dryRunFile, /1mg[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: '1mg\nTata 1mg\nTata1mg\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 3)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['1mg', '1mg', '1mg'],
      ['Tata 1mg', '1mg', '1mg'],
      ['Tata1mg', '1mg', '1mg'],
    ],
  )
})
