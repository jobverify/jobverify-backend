import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadDailyRoundsModule = async () => {
  try {
    return await import('../dailyrounds/script.js')
  } catch {
    return null
  }
}

test('getScraperCatalog includes Daily Rounds as a verified first-party careers scraper', async () => {
  const dailyRounds = await loadDailyRoundsModule()
  assert.ok(dailyRounds, 'Expected Daily Rounds scraper module at ../dailyrounds/script.js')
  const provider = getScraperCatalog().find((item) => item.source === 'dailyrounds')

  assert.ok(provider)
  assert.equal(provider.source, 'dailyrounds')
  assert.equal(provider.companyName, 'Daily Rounds')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://dailyrounds.org/careers')
  assert.equal(provider.companyDomain, 'dailyrounds.org')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.paginationStrategy, 'verified-careers-pages-plus-first-party-json-apis')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-careers-pages+same-origin-first-party-listing-apis+same-origin-first-party-detail-apis',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-14')
  assert.match(provider.verifiedSurfaceSummary, /13 usable India roles/i)
  assert.match(provider.modulePath, /dailyrounds[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /dailyrounds[\\/]jobs\.json$/i)
  assert.equal(dailyRounds.SOURCE, 'dailyrounds')
  assert.equal(dailyRounds.COMPANY, 'Daily Rounds')
  assert.equal(dailyRounds.COMPANY_DOMAIN, 'dailyrounds.org')
  assert.equal(dailyRounds.VERIFIED_AT, '2026-07-14')
  assert.equal(dailyRounds.HOMEPAGE_URL, 'https://dailyrounds.org/')
  assert.equal(dailyRounds.CAREERS_URL, 'https://dailyrounds.org/careers')
  assert.equal(dailyRounds.DOCTOR_CAREERS_URL, 'https://dailyrounds.org/careers/doctor')
  assert.equal(dailyRounds.CAREERS_API_URL, 'https://dailyrounds.org/api/careers')
  assert.equal(dailyRounds.DOCTOR_CAREERS_API_URL, 'https://dailyrounds.org/api/careers/doctor')
  assert.equal(
    dailyRounds.buildProfilePageUrl({ slug: 'SDEI', context: 'general' }),
    'https://dailyrounds.org/careers/profile/SDEI',
  )
  assert.equal(
    dailyRounds.buildProfilePageUrl({ slug: 'medical_writer', context: 'doctor' }),
    'https://dailyrounds.org/careers/doctor_profile/medical_writer',
  )
  assert.deepEqual(dailyRounds.buildApiRequestHeaders(dailyRounds.CAREERS_URL), {
    'User-Agent': dailyRounds.USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Origin: 'https://dailyrounds.org',
    Referer: 'https://dailyrounds.org/careers',
  })
  assert.deepEqual(dailyRounds.SCRAPER_METADATA, {
    source: 'dailyrounds',
    companyName: 'Daily Rounds',
    companyCareerPage: 'https://dailyrounds.org/careers',
    companyDomain: 'dailyrounds.org',
    countryFilter: 'India',
    atsPlatform: 'official-company-careers',
    paginationStrategy: 'verified-careers-pages-plus-first-party-json-apis',
    extractionStrategy:
      'verified-official-homepage+verified-careers-pages+same-origin-first-party-listing-apis+same-origin-first-party-detail-apis',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
  })
})

test('buildScrapers and company coverage resolve Daily Rounds from the shared catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'dailyrounds')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'dailyrounds')
  assert.match(scraper.dryRunFile, /dailyrounds[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Daily Rounds,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Daily Rounds', 'dailyrounds', 'Daily Rounds']],
  )
})
