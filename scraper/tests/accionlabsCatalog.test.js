import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadAccionLabsModule = async () => {
  try {
    return await import('../accionlabs/script.js')
  } catch {
    return null
  }
}

test('Accion Labs exports verified no-public-jobs metadata for the current first-party careers surface', async () => {
  const accionLabs = await loadAccionLabsModule()
  assert.ok(accionLabs, 'Expected Accion Labs scraper module at ../accionlabs/script.js')

  assert.equal(accionLabs.SOURCE, 'accionlabs')
  assert.equal(accionLabs.COMPANY, 'Accion Labs')
  assert.equal(accionLabs.COMPANY_DOMAIN, 'accionlabs.com')
  assert.equal(accionLabs.VERIFIED_AT, '2026-07-14')
  assert.equal(accionLabs.HOMEPAGE_URL, 'https://www.accionlabs.com/')
  assert.equal(accionLabs.CAREERS_URL, 'https://www.accionlabs.com/careers')
  assert.equal(accionLabs.US_OPPORTUNITIES_URL, 'https://www.accionlabs.com/us-opportunities')
  assert.equal(
    accionLabs.PRAGUE_ENGINEERING_CENTER_URL,
    'https://www.accionlabs.com/prague-engineering-center',
  )
  assert.deepEqual(accionLabs.SCRAPER_METADATA, {
    source: 'accionlabs',
    companyName: 'Accion Labs',
    companyCareerPage: 'https://www.accionlabs.com/careers',
    companyDomain: 'accionlabs.com',
    countryFilter: 'India',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy:
      'verified-homepage-plus-resume-intake-careers-page-plus-supplemental-no-public-job-routes',
    extractionStrategy:
      'verified-first-party-homepage+verified-careers-intake-page+verified-supplemental-no-public-job-routes-return-empty',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
  })
})

test('buildScrapers and company coverage resolve Accion Labs from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'accionlabs')
  const scraper = buildScrapers().find((item) => item.name === 'accionlabs')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Accion Labs')
  assert.equal(provider.companyCareerPage, 'https://www.accionlabs.com/careers')
  assert.match(scraper.dryRunFile, /accionlabs[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Accion Labs\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Accion Labs', 'accionlabs', 'Accion Labs']],
  )
})
