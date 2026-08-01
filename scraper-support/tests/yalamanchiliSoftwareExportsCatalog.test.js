import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/yalamanchilisoftwareexports/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/yalamanchilisoftwareexports/catalog.js')
  } catch {
    assert.fail('Expected Yalamanchili Software Exports catalog module at ../../scraper/yalamanchilisoftwareexports/catalog.js')
  }
}

test('Yalamanchili Software Exports local catalog captures the exact-name sentinel state', async () => {
  const { YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG)

  assert.equal(defaultCatalog, YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG)
  assert.equal(provider.source, 'yalamanchilisoftwareexports')
  assert.equal(provider.companyName, 'Yalamanchili Software Exports')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.yalamanchili.co.in/')
  assert.equal(provider.companyDomain, 'yalamanchili.co.in')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.paginationStrategy, 'exact-name-domain-root-plus-common-careers-route-timeout-validation')
  assert.equal(provider.extractionStrategy, 'verified-exact-name-first-party-domain-without-trustworthy-public-jobs-return-empty')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /yalamanchili\.co\.in/i)
})

test('Yalamanchili Software Exports exact backlog row matches from the local catalog entry', async () => {
  const { YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Yalamanchili Software Exports\n',
    catalog: [hydrateProviderCatalogEntry(YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Yalamanchili Software Exports hydrated local catalog stays script-runner compatible', async () => {
  const { YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.match(provider.modulePath, /yalamanchilisoftwareexports[\\/]script\.js$/i)
  assert.equal(typeof module.run, 'function')
})
