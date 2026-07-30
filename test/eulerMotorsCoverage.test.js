import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(currentDir, '..')
const extensionPath = path.resolve(
  backendDir,
  'scraper/providers/providerExtensions/eulermotors.json',
)
const csvPath = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Euler Motors exact provider extension covers only the literal CSV company row', () => {
  assert.equal(existsSync(extensionPath), true)

  const [provider] = JSON.parse(readFileSync(extensionPath, 'utf8'))
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(csvPath, 'utf8'),
    catalog: getScraperCatalog(),
  })
  const matches = report.matched.filter(({ companyName }) => companyName === 'Euler Motors')

  assert.equal(provider.companyName, 'Euler Motors')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(matches.length, 1)
  assert.equal(matches[0].source, 'eulermotors')
})
