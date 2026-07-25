import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadAabasoftModule = async () => {
  try {
    return await import('../aabasoft/script.js')
  } catch {
    return null
  }
}

test('Aabasoft exports verified first-party careers metadata for the current aabasoft.com surface', async () => {
  const aabasoft = await loadAabasoftModule()
  assert.ok(aabasoft, 'Expected Aabasoft scraper module at ../aabasoft/script.js')

  assert.equal(aabasoft.SOURCE, 'aabasoft')
  assert.equal(aabasoft.COMPANY, 'Aabasoft')
  assert.equal(aabasoft.COMPANY_DOMAIN, 'aabasoft.com')
  assert.equal(aabasoft.VERIFIED_AT, '2026-07-14')
  assert.equal(aabasoft.HOMEPAGE_URL, 'https://www.aabasoft.com/in-en/')
  assert.equal(aabasoft.CAREERS_URL, 'https://www.aabasoft.com/in-en/career/')
  assert.deepEqual(aabasoft.SCRAPER_METADATA, {
    source: 'aabasoft',
    companyName: 'Aabasoft',
    companyCareerPage: 'https://www.aabasoft.com/in-en/career/',
    companyDomain: 'aabasoft.com',
    countryFilter: 'India',
    atsPlatform: 'official-company-careers',
    paginationStrategy: 'verified-single-page-careers-listing-plus-first-party-detail-pages',
    extractionStrategy:
      'verified-official-homepage+verified-careers-page+first-party-listing-cards+first-party-detail-pages',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
  })
})

test('buildScrapers and company coverage resolve Aabasoft from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'aabasoft')
  const scraper = buildScrapers().find((item) => item.name === 'aabasoft')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Aabasoft')
  assert.equal(provider.companyCareerPage, 'https://www.aabasoft.com/in-en/career/')
  assert.match(scraper.dryRunFile, /aabasoft[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Aabasoft\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aabasoft', 'aabasoft', 'Aabasoft']],
  )
})
