import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('WizKlub resolves exactly to its first-party fail-closed provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'wizklub')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })

  assert.ok(provider, 'Expected a WizKlub provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'WizKlub')
  assert.equal(provider.companyDomain, 'dev.wizklub.com')
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'WizKlub').map((item) => item.source),
    ['wizklub'],
  )
})

test('WizKlub fails closed without an enumerable official careers feed', async () => {
  let module
  try {
    module = await import('../scraper/wizklub/script.js')
  } catch {
    module = null
  }

  assert.ok(module, 'Expected WizKlub scraper script')
  assert.equal(typeof module.run, 'function')
  assert.deepEqual(await module.run(), [])
})
