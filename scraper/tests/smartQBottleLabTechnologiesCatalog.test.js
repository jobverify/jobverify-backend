import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../smartqbottlelabtechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../smartqbottlelabtechnologies/catalog.js')
  } catch {
    assert.fail('Expected SmartQ - Bottle Lab Technologies catalog module at ../smartqbottlelabtechnologies/catalog.js')
  }
}

test('SmartQ - Bottle Lab Technologies local catalog captures the verified first-party handoff without a trusted public board contract', async () => {
  const { SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'smartqbottlelabtechnologies')
  assert.equal(provider.companyName, 'SmartQ - Bottle Lab Technologies')
  assert.equal(provider.officialBrandName, 'SmartQ')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.thesmartq.com/careers')
  assert.equal(provider.jobsBoardUrl, 'https://careers.thesmartq.com')
  assert.equal(provider.companyDomain, 'thesmartq.com')
  assert.equal(provider.atsPlatform, 'official-careers-page-handoff-with-unverified-public-board')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-landing-page')
  assert.equal(provider.extractionStrategy, 'verified-careers-shell-plus-handoff-without-board-contract-return-empty')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Great food experiences start with great people/i)
  assert.match(provider.verifiedSurfaceSummary, /careers\.thesmartq\.com/i)
})

test('SmartQ - Bottle Lab Technologies exact backlog row matches from the local catalog entry', async () => {
  const { SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'SmartQ - Bottle Lab Technologies\n',
    catalog: [hydrateProviderCatalogEntry(SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('SmartQ - Bottle Lab Technologies hydrated local catalog stays script-runner compatible', async () => {
  const { SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.match(provider.modulePath, /smartqbottlelabtechnologies[\\/]script\.js$/i)
  assert.equal(typeof module.run, 'function')
})
