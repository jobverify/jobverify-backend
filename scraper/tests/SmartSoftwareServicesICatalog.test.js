import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../smartsoftwareservices/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../smartsoftwareservices/catalog.js')
  } catch {
    assert.fail('Expected Smart Software Services catalog module at ../smartsoftwareservices/catalog.js')
  }
}

const buildProvider = (catalogEntry) => hydrateProviderCatalogEntry({ ...catalogEntry, modulePath })

test('Smart Software Services(I) local catalog captures the verified first-party open-role-count surface', async () => {
  const { SMART_SOFTWARE_SERVICES_CATALOG } = await loadCatalogModule()
  const provider = buildProvider(SMART_SOFTWARE_SERVICES_CATALOG)

  assert.equal(provider.source, 'smartsoftwareservices')
  assert.equal(provider.companyName, 'Smart Software Services(I)')
  assert.equal(provider.officialBrandName, 'Smart Software Services')
  assert.match(provider.verifiedSurfaceSummary, /4 open roles/i)
})

test('Smart Software Services(I) exact backlog row resolves from the local provider contract', async () => {
  const { SMART_SOFTWARE_SERVICES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Smart Software Services(I)\n',
    catalog: [buildProvider(SMART_SOFTWARE_SERVICES_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
