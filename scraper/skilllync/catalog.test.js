import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Skill-Lync is registered as a first-party current-openings shell sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'skilllync')

  assert.ok(provider, 'Expected Skill-Lync provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Skill-Lync')
  assert.equal(provider.companyCareerPage, 'https://skill-lync.com/careers/jobs')
  assert.equal(provider.atsPlatform, 'official-company-careers-shell')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-current-openings-shell-validation')
  assert.equal(provider.extractionStrategy, 'verified-careers-page-plus-current-openings-shell-without-rendered-job-cards')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'skill-lync.com')
  assert.match(provider.modulePath, /skilllync[\\/]script\.js$/i)
})

test('Skill-Lync resolves through company coverage and remains runnable in the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Skill-Lync,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Skill-Lync', 'skilllync', 'Skill-Lync']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'skilllync')

  assert.ok(scraper, 'Expected buildScrapers() to return the Skill-Lync scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'skilllync')
  assert.equal(scraper.provider.companyName, 'Skill-Lync')
  assert.match(scraper.dryRunFile, /skilllync[\\/]jobs\.json$/i)
})
