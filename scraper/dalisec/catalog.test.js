import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Dalisec is registered as a verified first-party zero-public-careers sentinel without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dalisec')

  assert.ok(provider, 'Expected Dalisec provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Dalisec')
  assert.equal(provider.companyCareerPage, 'https://dalisec.com/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'homepage-shell-plus-placeholder-sitemap-plus-app-bundle-plus-common-careers-404-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-gatsby-homepage-shell+verified-placeholder-sitemap+verified-marketing-app-bundle-without-jobs+verified-missing-first-party-careers-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'dalisec.com')
  assert.match(provider.modulePath, /dalisec[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Dalisec'), false)
})

test('Dalisec resolves directly from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Dalisec,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dalisec', 'dalisec', 'Dalisec']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'dalisec')

  assert.ok(scraper, 'Expected buildScrapers() to return the Dalisec sentinel scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'dalisec')
  assert.equal(scraper.provider.companyCareerPage, 'https://dalisec.com/')
  assert.match(scraper.dryRunFile, /dalisec[\\/]jobs\.json$/i)
})
