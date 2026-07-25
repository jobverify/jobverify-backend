import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Yellow Train School is registered as a first-party recruitment scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'yellowtrainschool')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Yellow Train School')
  assert.equal(provider.companyCareerPage, 'https://www.yellowtrainschool.com/recruitment')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.companyDomain, 'yellowtrainschool.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /yellowtrainschool[\\/]script\.js$/i)
})

test('Yellow Train School resolves directly through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Yellow Train School,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Yellow Train School', 'yellowtrainschool', 'Yellow Train School']],
  )
})

test('Yellow Train School remains runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'yellowtrainschool')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /yellowtrainschool[\\/]jobs\.json$/i)
})
