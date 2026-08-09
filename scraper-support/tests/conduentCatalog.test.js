import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('registers Conduent against its official Phenom careers site', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'conduent')
  const scraper = buildScrapers().find((item) => item.name === 'conduent')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Conduent')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'phenom')
  assert.equal(provider.companyCareerPage, 'https://careers.conduent.com/us/en/search-results')
  assert.equal(provider.companyDomain, 'careers.conduent.com')
  assert.match(provider.modulePath, /conduent[\\/]script\.js$/)

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /conduent[\\/]jobs\.json$/)
})

test('resolves the Conduent company-name alias to the Conduent scraper', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Conduent\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(report.matched.map((item) => [item.companyName, item.source]), [
    ['Conduent', 'conduent'],
  ])
  assert.equal(report.unmatchedCount, 0)
})
