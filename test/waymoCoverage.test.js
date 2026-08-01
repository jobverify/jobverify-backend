import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionPath = path.join(backendDir, 'scraper-support/providers/providerExtensions/waymo.json')
const csvPath = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Waymo coverage matches only the literal CSV company name', () => {
  assert.equal(existsSync(extensionPath), true)

  const provider = JSON.parse(readFileSync(extensionPath, 'utf8'))
  const catalog = getScraperCatalog()
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(csvPath, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nWaymo Technologies\nWaymo, Inc.\n',
    catalog,
  })

  assert.equal(provider.companyName, 'Waymo')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter(({ companyName }) => companyName === 'Waymo').map((item) => item.source),
    ['waymo'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Waymo scraper fails closed without a verified enumerable extraction contract', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'waymo')

  assert.ok(scraper, 'Expected Waymo scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
