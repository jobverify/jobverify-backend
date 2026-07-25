import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Muthoot Finance is registered against its verified official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'muthootfinance')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Muthoot Finance')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyCareerPage, 'https://www.muthootfinance.com/careers')
  assert.equal(provider.companyDomain, 'muthootfinance.com')
})

test('Muthoot Finance resolves in company coverage and exposes a runnable scraper', () => {
  const catalog = getScraperCatalog()
  const report = generateCompanyCoverageReport({
    csvText: `row,company_name,url_in_text,note
1,Muthoot Finance Ltd.,,`,
    catalog,
  })
  const scraper = buildScrapers().find((item) => item.name === 'muthootfinance')

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'muthootfinance')
  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /muthootfinance[\\/]jobs\.json$/)
})
