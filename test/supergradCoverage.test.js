import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'

test('Supergrad resolves approved case variants to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nSupergrad\nSuperGrad\nSupergrads\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['Supergrad', 'supergrad', 'Supergrad'],
      ['SuperGrad', 'supergrad', 'Supergrad'],
    ],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Supergrads'])
})

test('Supergrad fails closed without a verified public first-party careers feed', async () => {
  const modulePath = new URL('../scraper/supergrad/script.js', import.meta.url)
  assert.equal(existsSync(modulePath), true)

  const { run } = await import(modulePath)
  assert.deepEqual(await run(), [])
})
