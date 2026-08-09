import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/softura/catalog.js')
  } catch {
    assert.fail('Expected Softura catalog module at ../../scraper/softura/catalog.js')
  }
}

test('Softura local catalog captures the verified Cloudflare-blocked careers route', async () => {
  const { SOFTURA_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SOFTURA_CATALOG)

  assert.equal(provider.source, 'softura')
  assert.equal(provider.companyName, 'Softura')
  assert.equal(provider.companyCareerPage, 'https://www.softura.com/careers/')
  assert.equal(provider.atsPlatform, 'first-party-detail-pages-plus-zoho-links')
  assert.match(provider.verifiedSurfaceSummary, /Apply Now links/i)
  assert.match(provider.verifiedSurfaceSummary, /Java Developer in Chennai/i)
})

test('Softura backlog row matches directly through the local catalog', async () => {
  const { SOFTURA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Softura\n',
    catalog: [hydrateProviderCatalogEntry(SOFTURA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
