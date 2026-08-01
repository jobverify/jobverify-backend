import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Detroit Engineered Products is registered as a CEIPAL widget scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'detroitengineeredproducts')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Detroit Engineered Products')
  assert.equal(provider.companyCareerPage, 'https://depusa.com/index.php/careers-india')
  assert.equal(provider.atsPlatform, 'ceipal-widget')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.companyDomain, 'depusa.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /detroitengineeredproducts[\\/]script\.js$/i)
})

test('Detroit Engineering resolves through the alias map to the DEP scraper', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Detroit Engineering,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Detroit Engineering', 'detroitengineeredproducts', 'Detroit Engineered Products']],
  )
})

test('Detroit Engineered Products remains runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'detroitengineeredproducts')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /detroitengineeredproducts[\\/]jobs\.json$/i)
})
