import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Swelect is registered against its official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'swelect')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Swelect')
  assert.equal(provider.companyCareerPage, 'https://www.swelectes.com/career.php')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.companyDomain, 'swelectes.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /swelect[\\/]script\.js$/i)
})

test('Swelect matches the extracted CSV company row directly', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Swelect,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Swelect', 'swelect', 'Swelect']],
  )
})

test('Swelect is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'swelect')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /swelect[\\/]jobs\.json$/i)
})
