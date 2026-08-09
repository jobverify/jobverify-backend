import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('BLASTLINE INDIA PVT LTD is registered against the verified first-party careers page without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'blastlineindiapvtltd')

  assert.ok(provider, 'Expected BLASTLINE INDIA PVT LTD provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'BLASTLINE INDIA PVT LTD')
  assert.equal(provider.companyCareerPage, 'https://blastlineindia.com/about-us/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-first-party-careers-page-plus-wordpress-page-payload')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-careers-page+verified-wordpress-page-payload+inline-openings+same-page-apply-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'blastlineindia.com')
  assert.match(provider.modulePath, /blastlineindiapvtltd[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'BLASTLINE INDIA PVT LTD'), false)
})

test('BLASTLINE INDIA PVT LTD matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'BLASTLINE INDIA PVT LTD,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['BLASTLINE INDIA PVT LTD', 'blastlineindiapvtltd', 'BLASTLINE INDIA PVT LTD']],
  )
})

test('BLASTLINE INDIA PVT LTD is runnable through the shared scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'blastlineindiapvtltd')

  assert.ok(scraper, 'Expected buildScrapers() to return the BLASTLINE INDIA PVT LTD scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'blastlineindiapvtltd')
  assert.equal(scraper.provider.companyCareerPage, 'https://blastlineindia.com/about-us/careers/')
  assert.match(scraper.dryRunFile, /blastlineindiapvtltd[\\/]jobs\.json$/i)
})
