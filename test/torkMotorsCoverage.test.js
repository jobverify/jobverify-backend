import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'

test('Tork Motors resolves only to its exact-name official-domain provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nTork Motors\nTork Motor\nTork Motors India\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Tork Motors', 'torkmotors', 'Tork Motors']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), [
    'Tork Motor',
    'Tork Motors India',
  ])
})

test('Tork Motors fails closed without a verified public careers feed', async () => {
  const modulePath = new URL('../scraper/torkmotors/script.js', import.meta.url)
  assert.equal(existsSync(modulePath), true)

  const { run } = await import(modulePath)
  assert.deepEqual(await run(), [])
})
