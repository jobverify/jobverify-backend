import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/aurigo/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/aurigo/catalog.js')
  } catch {
    assert.fail('Expected Aurigo Software Technologies catalog module at ../../scraper/aurigo/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/aurigo/script.js')
  } catch {
    assert.fail('Expected Aurigo Software Technologies scraper module at ../../scraper/aurigo/script.js')
  }
}

test('Aurigo Software Technologies local catalog captures the verified first-party jobs search surface', async () => {
  const { AURIGO_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const aurigo = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(AURIGO_CATALOG)

  assert.equal(defaultCatalog, AURIGO_CATALOG)
  assert.equal(provider.source, 'aurigo')
  assert.equal(provider.companyName, 'Aurigo Software Technologies')
  assert.equal(provider.officialBrandName, 'Aurigo Software Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.aurigo.com/')
  assert.equal(provider.companyCareerPage, 'https://careers.aurigo.com/')
  assert.equal(
    provider.searchResultsUrl,
    'https://careers.aurigo.com/search/?createNewAlert=false&locationsearch=&q=',
  )
  assert.equal(provider.companyDomain, 'aurigo.com')
  assert.equal(provider.atsPlatform, 'official-first-party-search-results')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'page-number')
  assert.equal(provider.extractionStrategy, 'html-search-results')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /aurigo[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Explore open positions at Aurigo/i)
  assert.match(provider.verifiedSurfaceSummary, /Manager - Legal/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior Software Engineer I - DevOps/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Aurigo Software Technologies'), false)

  assert.equal(aurigo.PROVIDER_METADATA.source, AURIGO_CATALOG.source)
  assert.equal(aurigo.PROVIDER_METADATA.searchResultsUrl, AURIGO_CATALOG.searchResultsUrl)
})

test('Aurigo Software Technologies exact backlog row resolves from the local provider contract', async () => {
  const { AURIGO_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Aurigo Software Technologies\n',
    catalog: [hydrateProviderCatalogEntry(AURIGO_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aurigo Software Technologies', 'aurigo', 'Aurigo Software Technologies']],
  )
})
