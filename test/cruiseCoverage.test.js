import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionPath = path.join(backendDir, 'scraper-support/providers/providerExtensions/cruise.json')
const csvText = "company_name\nCruise\n"

test('Cruise exact provider extension covers only the literal CSV company row', () => {
  assert.equal(existsSync(extensionPath), true)

  const provider = JSON.parse(readFileSync(extensionPath, 'utf8'))
  const catalog = getScraperCatalog()
  const report = generateCompanyCoverageReport({
    csvText: csvText,
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nCruise India\nCruise Automation\n',
    catalog,
  })

  assert.equal(provider.companyName, 'Cruise')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter(({ companyName }) => companyName === 'Cruise').map((item) => item.source),
    ['cruise'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Cruise scraper fails closed without a verified enumerable extraction contract', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'cruise')

  assert.ok(scraper, 'Expected Cruise scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
