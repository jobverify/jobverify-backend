import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/stellapps/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/stellapps/catalog.js')
  } catch {
    assert.fail('Expected Stellapps catalog module at ../../scraper/stellapps/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/stellapps/script.js')
  } catch {
    assert.fail('Expected Stellapps scraper module at ../../scraper/stellapps/script.js')
  }
}

test('Stellapps local catalog captures the verified archive and first-party detail page surface', async () => {
  const { STELLAPPS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const stellapps = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(STELLAPPS_CATALOG)

  assert.equal(defaultCatalog, STELLAPPS_CATALOG)
  assert.equal(provider.source, 'stellapps')
  assert.equal(provider.companyName, 'Stellapps')
  assert.equal(provider.officialBrandName, 'Stellapps')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.stellapps.com/jobopenings/')
  assert.equal(provider.officialCareersPageUrl, 'https://www.stellapps.com/career/')
  assert.equal(provider.jobOpeningsArchiveUrl, 'https://www.stellapps.com/jobopenings/')
  assert.equal(provider.companyDomain, 'stellapps.com')
  assert.equal(provider.atsPlatform, 'official-company-site-public-job-pages')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-verified-job-openings-archive-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-job-openings-archive+first-party-detail-pages',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /stellapps[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.stellapps\.com\/career\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.stellapps\.com\/jobopenings\//i)
  assert.match(provider.verifiedSurfaceSummary, /service-engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /program-manager/i)
  assert.match(provider.verifiedSurfaceSummary, /no separate public jobs api was required/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Stellapps'), false)

  assert.equal(stellapps.PROVIDER_METADATA.source, STELLAPPS_CATALOG.source)
  assert.equal(stellapps.PROVIDER_METADATA.companyName, STELLAPPS_CATALOG.companyName)
  assert.equal(
    stellapps.PROVIDER_METADATA.jobOpeningsArchiveUrl,
    STELLAPPS_CATALOG.jobOpeningsArchiveUrl,
  )
})

test('Stellapps exact backlog row matches directly from local provider metadata', async () => {
  const { STELLAPPS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Stellapps\n',
    catalog: [hydrateProviderCatalogEntry(STELLAPPS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Stellapps', 'stellapps', 'Stellapps']],
  )
})

test('Stellapps hydrated local catalog stays script-runner compatible for later shared-registry integration', async () => {
  const { STELLAPPS_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(STELLAPPS_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Stellapps')
  assert.equal(provider.companyCareerPage, 'https://www.stellapps.com/jobopenings/')
  assert.equal(provider.companyDomain, 'stellapps.com')
  assert.equal(provider.atsPlatform, 'official-company-site-public-job-pages')
  assert.match(provider.modulePath, /stellapps[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /stellapps[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
