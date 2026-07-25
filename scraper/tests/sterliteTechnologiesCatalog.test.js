import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../sterlitetechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../sterlitetechnologies/catalog.js')
  } catch {
    assert.fail('Expected Sterlite Technologies catalog module at ../sterlitetechnologies/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../sterlitetechnologies/script.js')
  } catch {
    assert.fail('Expected Sterlite Technologies scraper module at ../sterlitetechnologies/script.js')
  }
}

test('Sterlite Technologies local catalog captures the verified first-party careers handoff sentinel surface', async () => {
  const { STERLITE_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const sterliteTechnologies = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(STERLITE_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, STERLITE_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'sterlitetechnologies')
  assert.equal(provider.companyName, 'Sterlite Technologies')
  assert.equal(provider.officialBrandName, 'STL Tech')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://stl.tech/life/')
  assert.equal(provider.officialCareersPageUrl, 'https://stl.tech/life/')
  assert.equal(
    provider.linkedJobsPortalUrl,
    'https://stltech.ripplehire.com/candidate/?source=CAREERSITE&token=v0cOTxD3fgZqIF393gqj',
  )
  assert.equal(provider.linkedJobsPortalHost, 'stltech.ripplehire.com')
  assert.equal(provider.companyDomain, 'stl.tech')
  assert.equal(provider.atsPlatform, 'official-company-site-no-trustworthy-public-jobs-surface')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-careers-handoff-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+external-ripplehire-handoff+return-empty-when-no-trustworthy-public-jobs-surface',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /sterlitetechnologies[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/stl\.tech\/life\//i)
  assert.match(provider.verifiedSurfaceSummary, /stltech\.ripplehire\.com/i)
  assert.match(provider.verifiedSurfaceSummary, /Apply for your next job here/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy enumerable public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Sterlite Technologies'), false)

  assert.equal(
    sterliteTechnologies.PROVIDER_METADATA.source,
    STERLITE_TECHNOLOGIES_CATALOG.source,
  )
  assert.equal(
    sterliteTechnologies.PROVIDER_METADATA.companyName,
    STERLITE_TECHNOLOGIES_CATALOG.companyName,
  )
  assert.equal(
    sterliteTechnologies.PROVIDER_METADATA.linkedJobsPortalHost,
    STERLITE_TECHNOLOGIES_CATALOG.linkedJobsPortalHost,
  )
})

test('Sterlite Technologies exact backlog row matches directly from local provider metadata', async () => {
  const { STERLITE_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Sterlite Technologies\n',
    catalog: [hydrateProviderCatalogEntry(STERLITE_TECHNOLOGIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sterlite Technologies', 'sterlitetechnologies', 'Sterlite Technologies']],
  )
})

test('Sterlite Technologies hydrated local catalog stays script-runner compatible for later shared-registry integration', async () => {
  const { STERLITE_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(STERLITE_TECHNOLOGIES_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Sterlite Technologies')
  assert.equal(provider.companyCareerPage, 'https://stl.tech/life/')
  assert.equal(provider.companyDomain, 'stl.tech')
  assert.equal(provider.atsPlatform, 'official-company-site-no-trustworthy-public-jobs-surface')
  assert.match(provider.modulePath, /sterlitetechnologies[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /sterlitetechnologies[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
