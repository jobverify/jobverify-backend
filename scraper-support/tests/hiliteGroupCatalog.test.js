import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('HiLITE Group is registered as a first-party careers scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'hilitegroup')

  assert.ok(provider, 'Expected HiLITE Group provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'HiLITE Group')
  assert.equal(provider.companyCareerPage, 'https://hilitegroup.com/explore-careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage-plus-inline-job-sections-and-apply-anchors',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'hilitegroup.com')
  assert.match(provider.modulePath, /hilitegroup[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'HiLITE Group'), false)
})

test('HiLITE Group matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'HiLITE Group,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['HiLITE Group', 'hilitegroup', 'HiLITE Group']],
  )
})

test('HiLITE Group is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'hilitegroup')

  assert.ok(scraper, 'Expected buildScrapers() to return the HiLITE Group scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'hilitegroup')
  assert.equal(scraper.provider.companyCareerPage, 'https://hilitegroup.com/explore-careers/')
  assert.match(scraper.dryRunFile, /hilitegroup[\\/]jobs\.json$/i)
})
