import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes Jubilant FoodWorks on the verified official Oracle careers surface with the CSV typo alias', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'jubilantfoodworks')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Jubilant FoodWorks')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.jubilantfoodworks.com/careers/work-with-us')
  assert.equal(provider.companyDomain, 'jubilantfoodworks.com')
  assert.match(provider.modulePath, /jubilantfoodworks[\\/]script\.js$/i)
  assert.equal(companyAliases['Jubliant foodWorks'], 'jubilantfoodworks')
})

test('buildScrapers and company coverage resolve the Jubliant foodWorks CSV row to the Jubilant FoodWorks source', () => {
  const scraper = buildScrapers().find((item) => item.name === 'jubilantfoodworks')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'jubilantfoodworks')

  const report = generateCompanyCoverageReport({
    csvText: 'Jubliant foodWorks,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Jubliant foodWorks', 'jubilantfoodworks', 'Jubilant FoodWorks']],
  )
})
