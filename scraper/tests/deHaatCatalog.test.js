import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const deHaatModulePath = path.resolve(currentDir, '../dehaat/script.js')

const loadDeHaatCatalog = async () => {
  try {
    return await import('../dehaat/catalog.js')
  } catch {
    assert.fail('Expected DeHaat catalog module at ../dehaat/catalog.js')
  }
}

const loadDeHaatModule = async () => {
  try {
    return await import('../dehaat/script.js')
  } catch {
    assert.fail('Expected DeHaat scraper module at ../dehaat/script.js')
  }
}

test('DeHaat local catalog captures the verified first-party handoff to the public Workable surface', async () => {
  const { DEHAAT_CATALOG } = await loadDeHaatCatalog()
  const dehaat = await loadDeHaatModule()

  assert.equal(DEHAAT_CATALOG.source, 'dehaat')
  assert.equal(DEHAAT_CATALOG.companyName, 'DeHaat')
  assert.equal(DEHAAT_CATALOG.officialBrandName, 'DeHaat')
  assert.equal(DEHAAT_CATALOG.adapter, 'script')
  assert.equal(DEHAAT_CATALOG.homepageUrl, 'https://agrevolution.in/')
  assert.equal(DEHAAT_CATALOG.companyCareerPage, 'https://agrevolution.in/careers')
  assert.equal(DEHAAT_CATALOG.careersPageUrl, 'https://agrevolution.in/careers')
  assert.equal(DEHAAT_CATALOG.workableBoardUrl, 'https://apply.workable.com/agrevolution/')
  assert.equal(DEHAAT_CATALOG.jobsFeedUrl, 'https://apply.workable.com/agrevolution/jobs.md')
  assert.equal(
    DEHAAT_CATALOG.widgetApiUrl,
    'https://apply.workable.com/api/v1/widget/accounts/agrevolution',
  )
  assert.equal(DEHAAT_CATALOG.companyDomain, 'agrevolution.in')
  assert.equal(DEHAAT_CATALOG.atsPlatform, 'first-party-handoff-workable')
  assert.equal(DEHAAT_CATALOG.countryFilter, 'India')
  assert.equal(
    DEHAAT_CATALOG.paginationStrategy,
    'first-party-homepage-handoff-plus-workable-markdown-feed',
  )
  assert.equal(
    DEHAAT_CATALOG.extractionStrategy,
    'verified-first-party-homepage+verified-first-party-careers-page+verified-workable-board+verified-workable-jobs-feed+widget-api-empty-state',
  )
  assert.equal(DEHAAT_CATALOG.parser, 'custom-script')
  assert.equal(DEHAAT_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(DEHAAT_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(DEHAAT_CATALOG.dryRunFile, 'dehaat/jobs.json')
  assert.equal(DEHAAT_CATALOG.modulePath, deHaatModulePath)
  assert.match(DEHAAT_CATALOG.verifiedSurfaceSummary, /https:\/\/agrevolution\.in\//i)
  assert.match(DEHAAT_CATALOG.verifiedSurfaceSummary, /https:\/\/agrevolution\.in\/careers/i)
  assert.match(DEHAAT_CATALOG.verifiedSurfaceSummary, /https:\/\/apply\.workable\.com\/agrevolution\//i)
  assert.match(DEHAAT_CATALOG.verifiedSurfaceSummary, /https:\/\/apply\.workable\.com\/agrevolution\/jobs\.md/i)
  assert.match(
    DEHAAT_CATALOG.verifiedSurfaceSummary,
    /https:\/\/apply\.workable\.com\/api\/v1\/widget\/accounts\/agrevolution/i,
  )
  assert.match(DEHAAT_CATALOG.verifiedSurfaceSummary, /0 current openings/i)
  assert.match(DEHAAT_CATALOG.verifiedSurfaceSummary, /Workable/i)

  assert.equal(dehaat.PROVIDER_METADATA.source, DEHAAT_CATALOG.source)
  assert.equal(dehaat.PROVIDER_METADATA.companyName, DEHAAT_CATALOG.companyName)
  assert.equal(dehaat.PROVIDER_METADATA.companyCareerPage, DEHAAT_CATALOG.companyCareerPage)
  assert.equal(dehaat.PROVIDER_METADATA.jobsFeedUrl, DEHAAT_CATALOG.jobsFeedUrl)
})

test('DeHaat backlog row hydrates locally without needing a shared alias entry', async () => {
  const { DEHAAT_CATALOG } = await loadDeHaatCatalog()
  const provider = hydrateProviderCatalogEntry(DEHAAT_CATALOG)

  assert.equal(provider.companyName, 'DeHaat')
  assert.equal(provider.companyDomain, 'agrevolution.in')
  assert.match(provider.modulePath, /dehaat[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /dehaat[\\/]jobs\.json$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'DeHaat'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'DeHaat\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['DeHaat', 'dehaat', 'DeHaat']],
  )
})

test('buildScrapers and company coverage resolve DeHaat from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dehaat')
  const scraper = buildScrapers().find((item) => item.name === 'dehaat')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'DeHaat')
  assert.equal(provider.companyCareerPage, 'https://agrevolution.in/careers')
  assert.match(scraper.dryRunFile, /dehaat[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'DeHaat\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['DeHaat', 'dehaat', 'DeHaat']],
  )
})
