import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../grab/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../grab/catalog.js')
  } catch {
    assert.fail('Expected Grab catalog module at ../grab/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../grab/script.js')
  } catch {
    assert.fail('Expected Grab scraper module at ../grab/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Grab local catalog captures the verified first-party jobs board and India location surfaces', async () => {
  const { GRAB_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const grab = await loadScriptModule()
  const provider = buildCatalogReadyProvider(GRAB_CATALOG)

  assert.equal(defaultCatalog, GRAB_CATALOG)
  assert.equal(provider.source, 'grab')
  assert.equal(provider.companyName, 'Grab')
  assert.equal(provider.officialBrandName, 'Grab')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.grab.careers/en/')
  assert.equal(provider.companyCareerPage, 'https://www.grab.careers/jobs')
  assert.equal(provider.indiaLocationPageUrl, 'https://www.grab.careers/en/locations/india/')
  assert.equal(
    provider.sampleIndiaJobUrl,
    'https://www.grab.careers/en/jobs/744000109177995/senior-techno-functional-oracle-integration-specialist/',
  )
  assert.equal(
    provider.sampleSecondaryIndiaJobUrl,
    'https://www.grab.careers/en/jobs/744000138121215/solutions-specialist-epm-finance-systems/',
  )
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-jobs-board-plus-india-location-page-html-cards')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-jobs-board+verified-india-location-page+india-location-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'grab.careers')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.grab\.careers\/en\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.grab\.careers\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.grab\.careers\/en\/locations\/india\//i)
  assert.match(provider.verifiedSurfaceSummary, /Senior Techno-Functional Oracle Integration Specialist/i)
  assert.match(provider.verifiedSurfaceSummary, /Bengaluru, India/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /grab[\\/]jobs\.json$/i)

  assert.equal(grab.PROVIDER_METADATA.source, provider.source)
  assert.equal(grab.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(grab.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
})

test('Grab exact backlog row resolves from the local provider contract without alias churn', async () => {
  const { GRAB_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Grab\n',
    catalog: [buildCatalogReadyProvider(GRAB_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Grab', 'grab', 'Grab']],
  )
})
