import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('L&T EduTech is registered as a filtered PeopleStrong scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'landtedutech')

  assert.ok(provider, 'Expected L&T EduTech provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'L&T EduTech')
  assert.equal(
    provider.companyCareerPage,
    'https://larsentoubrocareers.peoplestrong.com/job/joblist',
  )
  assert.equal(provider.atsPlatform, 'peoplestrong')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-shell-validation-plus-offset-limit-api')
  assert.equal(
    provider.extractionStrategy,
    'official-homepage-link-to-peoplestrong-shell-plus-edutech-organizationunit-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'lntedutech.com')
  assert.match(provider.modulePath, /landtedutech[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'L&T EduTech'), false)
})

test('L&T EduTech matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'L&T EduTech,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['L&T EduTech', 'landtedutech', 'L&T EduTech']],
  )
})

test('L&T EduTech is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'landtedutech')

  assert.ok(scraper, 'Expected buildScrapers() to return the L&T EduTech scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'landtedutech')
  assert.equal(
    scraper.provider.companyCareerPage,
    'https://larsentoubrocareers.peoplestrong.com/job/joblist',
  )
  assert.match(scraper.dryRunFile, /landtedutech[\\/]jobs\.json$/i)
})
