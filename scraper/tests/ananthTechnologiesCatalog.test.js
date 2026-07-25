import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const ananthModulePath = path.resolve(currentDir, '../ananthtechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../ananthtechnologies/catalog.js')
  } catch {
    assert.fail('Expected Ananth Technologies catalog module at ../ananthtechnologies/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../ananthtechnologies/script.js')
  } catch {
    assert.fail('Expected Ananth Technologies scraper module at ../ananthtechnologies/script.js')
  }
}

test('Ananth Technologies local catalog captures the verified first-party resume-only careers surface', async () => {
  const { ANANTH_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const ananth = await loadScriptModule()

  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.source, 'ananthtechnologies')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.companyName, 'Ananth Technologies')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.officialBrandName, 'Ananth Technologies')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.adapter, 'script')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.companyCareerPage, 'https://ananthtech.com/careers/')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.careersEntryUrl, 'https://ananthtech.com/careers')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.homepageUrl, 'https://ananthtech.com/')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.applicationEmail, 'jobs@ananthtech.com')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.applicationUrl, 'mailto:jobs@ananthtech.com')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.companyDomain, 'ananthtech.com')
  assert.equal(
    ANANTH_TECHNOLOGIES_CATALOG.atsPlatform,
    'official-company-site-no-public-careers',
  )
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.countryFilter, 'India')
  assert.equal(
    ANANTH_TECHNOLOGIES_CATALOG.paginationStrategy,
    'verified-homepage-plus-resume-only-careers-page-plus-403-job-route-validation',
  )
  assert.equal(
    ANANTH_TECHNOLOGIES_CATALOG.extractionStrategy,
    'verified-homepage+verified-careers-page-email-resume-handoff-without-public-listings+verified-403-job-routes-return-empty',
  )
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.parser, 'custom-script')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.dryRunFile, 'ananthtechnologies/jobs.json')
  assert.equal(ANANTH_TECHNOLOGIES_CATALOG.modulePath, ananthModulePath)
  assert.match(ANANTH_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /https:\/\/ananthtech\.com\//i)
  assert.match(ANANTH_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /https:\/\/ananthtech\.com\/careers\//i)
  assert.match(ANANTH_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /https:\/\/ananthtech\.com\/jobs/i)
  assert.match(ANANTH_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /jobs@ananthtech\.com/i)
  assert.match(ANANTH_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /403/i)
  assert.match(
    ANANTH_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary,
    /no trustworthy public jobs surface/i,
  )

  assert.equal(ananth.PROVIDER_METADATA.source, ANANTH_TECHNOLOGIES_CATALOG.source)
  assert.equal(ananth.PROVIDER_METADATA.companyName, ANANTH_TECHNOLOGIES_CATALOG.companyName)
  assert.equal(
    ananth.PROVIDER_METADATA.companyCareerPage,
    ANANTH_TECHNOLOGIES_CATALOG.companyCareerPage,
  )
  assert.equal(
    ananth.PROVIDER_METADATA.applicationEmail,
    ANANTH_TECHNOLOGIES_CATALOG.applicationEmail,
  )
})

test('Ananth Technologies local catalog hydrates into coverage without needing an alias entry', async () => {
  const { ANANTH_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(ANANTH_TECHNOLOGIES_CATALOG)

  assert.equal(provider.companyName, 'Ananth Technologies')
  assert.equal(provider.companyDomain, 'ananthtech.com')
  assert.match(provider.modulePath, /ananthtechnologies[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /ananthtechnologies[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Ananth Technologies\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Ananth Technologies', 'ananthtechnologies', 'Ananth Technologies']],
  )
  assert.equal(
    Object.prototype.hasOwnProperty.call(companyAliases, 'Ananth Technologies'),
    false,
  )
})

test('buildScrapers and company coverage resolve Ananth Technologies from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ananthtechnologies')
  const scraper = buildScrapers().find((item) => item.name === 'ananthtechnologies')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Ananth Technologies')
  assert.equal(provider.companyCareerPage, 'https://ananthtech.com/careers/')
  assert.match(scraper.dryRunFile, /ananthtechnologies[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Ananth Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Ananth Technologies', 'ananthtechnologies', 'Ananth Technologies']],
  )
})
