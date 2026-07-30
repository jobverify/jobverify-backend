import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

test('FarmTheory resolves only to its literal exact-name provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nFarmTheory\nFarmtheory\nFarm Theory\nFarmTheory Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['FarmTheory', 'farmtheory', 'FarmTheory']],
  )
  assert.deepEqual(
    report.unmatched.map((item) => item.companyName),
    ['Farmtheory', 'Farm Theory', 'FarmTheory Technologies'],
  )
})

test('FarmTheory fails closed when no verified official careers feed is available', async () => {
  const modulePath = new URL('../scraper/farmtheory/script.js', import.meta.url)
  assert.equal(existsSync(modulePath), true)

  const { run } = await import(modulePath)
  assert.deepEqual(await run(), [])
})
