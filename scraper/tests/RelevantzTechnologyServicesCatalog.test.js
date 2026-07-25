import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../relevantztechnologyservices/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../relevantztechnologyservices/catalog.js')
  } catch {
    assert.fail('Expected Relevantz Technology Services catalog module at ../relevantztechnologyservices/catalog.js')
  }
}

const assertCatalogMatchesBacklogRow = ({ provider, companyName }) => {
  const report = generateCompanyCoverageReport({
    csvText: `${companyName}\n`,
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
}

const assertHydratedCatalogLoadsScript = async (provider) => {
  const module = await import(pathToFileURL(provider.modulePath).href)
  assert.equal(typeof module.run, 'function')
}

test('Relevantz Technology Services catalog captures the verified India openings surface on the exact-name careers page', async () => {
  const { RELEVANTZ_TECHNOLOGY_SERVICES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(RELEVANTZ_TECHNOLOGY_SERVICES_CATALOG)

  assert.equal(defaultCatalog, RELEVANTZ_TECHNOLOGY_SERVICES_CATALOG)
  assert.equal(provider.source, 'relevantztechnologyservices')
  assert.equal(provider.companyName, 'Relevantz Technology Services')
  assert.equal(provider.officialBrandName, 'Relevantz')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://relevantz.com/')
  assert.equal(provider.companyCareerPage, 'https://relevantz.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+india-section-inline-openings',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.companyDomain, 'relevantz.com')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Careers India/i)
  assert.match(provider.verifiedSurfaceSummary, /Java Full stack Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /Business Analyst/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Relevantz Technology Services',
  })
  await assertHydratedCatalogLoadsScript(provider)
})
