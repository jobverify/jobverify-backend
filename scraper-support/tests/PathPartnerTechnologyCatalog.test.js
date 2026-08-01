import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/pathpartnertechnology/catalog.js')
  } catch {
    assert.fail('Expected PathPartner Technology catalog module at ../../scraper/pathpartnertechnology/catalog.js')
  }
}

test('PathPartner Technology local catalog captures the verified blocked first-party careers route', async () => {
  const { PATHPARTNER_TECHNOLOGY_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(PATHPARTNER_TECHNOLOGY_CATALOG)

  assert.equal(defaultCatalog, PATHPARTNER_TECHNOLOGY_CATALOG)
  assert.equal(provider.source, 'pathpartnertechnology')
  assert.equal(provider.companyName, 'PathPartner Technology')
  assert.equal(provider.companyCareerPage, 'https://www.pathpartnertech.com/career/')
  assert.equal(provider.companyDomain, 'pathpartnertech.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-blocked')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /connection-reset \/ TLS-channel error/i)
})

test('PathPartner Technology backlog row matches directly through the local catalog', async () => {
  const { PATHPARTNER_TECHNOLOGY_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'PathPartner Technology\n',
    catalog: [hydrateProviderCatalogEntry(PATHPARTNER_TECHNOLOGY_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.matched.map((item) => item.source), ['pathpartnertechnology'])
})
