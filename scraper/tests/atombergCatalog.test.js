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
const atombergModulePath = path.resolve(currentDir, '../atomberg/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../atomberg/catalog.js')
  } catch {
    assert.fail('Expected Atomberg catalog module at ../atomberg/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../atomberg/script.js')
  } catch {
    assert.fail('Expected Atomberg scraper module at ../atomberg/script.js')
  }
}

test('Atomberg local catalog captures the verified homepage, email-only careers page, and no-public-jobs sentinel state', async () => {
  const { ATOMBERG_CATALOG } = await loadCatalogModule()
  const atomberg = await loadScriptModule()

  assert.equal(ATOMBERG_CATALOG.source, 'atomberg')
  assert.equal(ATOMBERG_CATALOG.companyName, 'Atomberg')
  assert.equal(ATOMBERG_CATALOG.officialBrandName, 'Atomberg')
  assert.equal(ATOMBERG_CATALOG.adapter, 'script')
  assert.equal(ATOMBERG_CATALOG.companyCareerPage, 'https://atomberg.com/careers')
  assert.equal(ATOMBERG_CATALOG.homepageUrl, 'https://atomberg.com/')
  assert.equal(ATOMBERG_CATALOG.applicationEmail, 'career@atomberg.com')
  assert.equal(ATOMBERG_CATALOG.applicationUrl, 'mailto:career@atomberg.com')
  assert.deepEqual(ATOMBERG_CATALOG.noPublicJobRouteUrls, [
    'https://atomberg.com/jobs',
    'https://atomberg.com/pages/careers',
  ])
  assert.equal(ATOMBERG_CATALOG.brokenCareerRouteUrl, 'https://atomberg.com/career')
  assert.equal(ATOMBERG_CATALOG.companyDomain, 'atomberg.com')
  assert.equal(ATOMBERG_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(ATOMBERG_CATALOG.countryFilter, 'India')
  assert.equal(
    ATOMBERG_CATALOG.paginationStrategy,
    'verified-homepage-plus-resume-only-careers-page-plus-missing-route-validation',
  )
  assert.equal(
    ATOMBERG_CATALOG.extractionStrategy,
    'verified-homepage+verified-careers-page-email-resume-handoff-without-public-listings+verified-missing-job-routes-return-empty',
  )
  assert.equal(ATOMBERG_CATALOG.parser, 'custom-script')
  assert.equal(ATOMBERG_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ATOMBERG_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(ATOMBERG_CATALOG.dryRunFile, 'atomberg/jobs.json')
  assert.equal(ATOMBERG_CATALOG.modulePath, atombergModulePath)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /https:\/\/atomberg\.com\//i)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /https:\/\/atomberg\.com\/careers/i)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /career@atomberg\.com/i)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /https:\/\/atomberg\.com\/jobs/i)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /https:\/\/atomberg\.com\/career/i)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /404/i)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /500/i)
  assert.match(ATOMBERG_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)

  assert.equal(atomberg.PROVIDER_METADATA.source, ATOMBERG_CATALOG.source)
  assert.equal(atomberg.PROVIDER_METADATA.companyName, ATOMBERG_CATALOG.companyName)
  assert.equal(
    atomberg.PROVIDER_METADATA.applicationEmail,
    ATOMBERG_CATALOG.applicationEmail,
  )
  assert.equal(
    atomberg.PROVIDER_METADATA.brokenCareerRouteUrl,
    ATOMBERG_CATALOG.brokenCareerRouteUrl,
  )
})

test('Atomberg local catalog hydrates into coverage without needing an alias entry', async () => {
  const { ATOMBERG_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(ATOMBERG_CATALOG)

  assert.equal(provider.companyName, 'Atomberg')
  assert.equal(provider.companyDomain, 'atomberg.com')
  assert.match(provider.modulePath, /atomberg[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /atomberg[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Atomberg\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Atomberg', 'atomberg', 'Atomberg']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Atomberg'), false)
})

test('buildScrapers and company coverage resolve Atomberg from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'atomberg')
  const scraper = buildScrapers().find((item) => item.name === 'atomberg')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Atomberg')
  assert.equal(provider.companyCareerPage, 'https://atomberg.com/careers')
  assert.match(scraper.dryRunFile, /atomberg[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Atomberg\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Atomberg', 'atomberg', 'Atomberg']],
  )
})
