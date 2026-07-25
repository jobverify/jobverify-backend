import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Remunance Services Pvt. Ltd. is registered against its verified first-party public jobs archive without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'remunanceservicespvtltd')

  assert.ok(provider, 'Expected Remunance Services Pvt. Ltd. provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Remunance Services Pvt. Ltd.')
  assert.equal(provider.companyCareerPage, 'https://remunance.com/jobs/')
  assert.equal(provider.atsPlatform, 'wp-job-openings')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-expanded-public-html-load-more-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-jobs-archive+browser-load-more+detail-table+inline-apply-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'remunance.com')
  assert.match(provider.modulePath, /remunanceservicespvtltd[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Remunance Services Pvt. Ltd.'), false)
})

test('Remunance Services Pvt. Ltd. matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Remunance Services Pvt. Ltd.,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Remunance Services Pvt. Ltd.', 'remunanceservicespvtltd', 'Remunance Services Pvt. Ltd.']],
  )
})

test('Remunance Services Pvt. Ltd. is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'remunanceservicespvtltd')

  assert.ok(scraper, 'Expected buildScrapers() to return the Remunance Services Pvt. Ltd. scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'remunanceservicespvtltd')
  assert.equal(scraper.provider.companyCareerPage, 'https://remunance.com/jobs/')
  assert.match(scraper.dryRunFile, /remunanceservicespvtltd[\\/]jobs\.json$/i)
})
