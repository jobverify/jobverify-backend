import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Bhagwati Products Limited is registered against its verified first-party jobs portal without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bhagwatiproductslimited')

  assert.ok(
    provider,
    'Expected Bhagwati Products Limited provider to be registered in customProviders.json',
  )
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Bhagwati Products Limited')
  assert.equal(provider.companyCareerPage, 'https://ess.bhagwati.co/rms')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-handoff-plus-first-party-portal')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-careers-handoff+first-party-job-cards+detail-modals+apply-form-validation',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'ess.bhagwati.co')
  assert.match(provider.modulePath, /bhagwatiproductslimited[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Bhagwati Products Limited'), false)
})

test('Bhagwati Products Limited matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Bhagwati Products Limited,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bhagwati Products Limited', 'bhagwatiproductslimited', 'Bhagwati Products Limited']],
  )
})

test('Bhagwati Products Limited is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bhagwatiproductslimited')

  assert.ok(
    scraper,
    'Expected buildScrapers() to return the Bhagwati Products Limited scraper',
  )
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'bhagwatiproductslimited')
  assert.equal(scraper.provider.companyCareerPage, 'https://ess.bhagwati.co/rms')
  assert.match(scraper.dryRunFile, /bhagwatiproductslimited[\\/]jobs\.json$/i)
})
