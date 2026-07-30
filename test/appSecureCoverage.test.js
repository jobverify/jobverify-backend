import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

test('AppSecure resolves only to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAppSecure\nAppSure\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['AppSecure', 'appsecure', 'AppSecure']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['AppSure'])
})

test('AppSecure fails closed when its official site has no verified public careers feed', async () => {
  const modulePath = new URL('../scraper/appsecure/script.js', import.meta.url)
  assert.equal(existsSync(modulePath), true)

  const { run } = await import(modulePath)
  assert.deepEqual(await run(), [])
})
