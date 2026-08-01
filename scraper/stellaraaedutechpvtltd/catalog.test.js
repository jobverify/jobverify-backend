import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

const SOURCE = 'stellaraaedutechpvtltd'
const COMPANY = 'Stellaraa Edutech Pvt. Ltd.'
const CAREERS_URL = 'https://www.linkedin.com/jobs/search/?f_C=104439273&geoId=102713980'

test('Stellaraa Edutech Pvt. Ltd. is registered as a verified LinkedIn guest-search scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === SOURCE)

  assert.ok(provider, 'Expected Stellaraa Edutech Pvt. Ltd. provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyCareerPage, CAREERS_URL)
  assert.equal(provider.atsPlatform, 'linkedin-guest-search')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-company-search-page')
  assert.equal(
    provider.extractionStrategy,
    'official-homepage-linkedin-handoff+public-company-page+guest-search+public-detail-jsonld',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'stellaraa.com')
  assert.match(provider.modulePath, /stellaraaedutechpvtltd[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Stellaraa Edutech Pvt. Ltd'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, COMPANY), false)
})

test('Stellaraa Edutech Pvt. Ltd resolves directly from provider metadata and remains runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Stellaraa Edutech Pvt. Ltd,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Stellaraa Edutech Pvt. Ltd', SOURCE, COMPANY]],
  )

  const scraper = buildScrapers().find((item) => item.name === SOURCE)

  assert.ok(scraper, 'Expected buildScrapers() to return the Stellaraa Edutech Pvt. Ltd. scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, SOURCE)
  assert.equal(scraper.provider.companyCareerPage, CAREERS_URL)
  assert.match(scraper.dryRunFile, /stellaraaedutechpvtltd[\\/]jobs\.json$/i)
})
