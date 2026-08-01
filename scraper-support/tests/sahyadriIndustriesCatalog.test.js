import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Sahyadri Industries is registered as a verified first-party careers scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'sahyadriindustries')

  assert.ok(provider, 'Expected Sahyadri Industries provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Sahyadri Industries')
  assert.equal(provider.companyCareerPage, 'https://www.silworld.in/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-wordpress-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-page+job-popup-details+shared-first-party-application-popup',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'silworld.in')
  assert.match(provider.modulePath, /sahyadriindustries[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Sahyadri Industries'), false)
})

test('Sahyadri Industries matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Sahyadri Industries,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sahyadri Industries', 'sahyadriindustries', 'Sahyadri Industries']],
  )
})

test('Sahyadri Industries is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'sahyadriindustries')

  assert.ok(scraper, 'Expected buildScrapers() to return the Sahyadri Industries scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'sahyadriindustries')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.silworld.in/careers/')
  assert.match(scraper.dryRunFile, /sahyadriindustries[\\/]jobs\.json$/i)
})
