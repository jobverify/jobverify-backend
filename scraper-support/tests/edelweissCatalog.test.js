import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const edelweissModulePath = path.resolve(currentDir, '../../scraper/edelweiss/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/edelweiss/catalog.js')
  } catch {
    assert.fail('Expected Edelweiss catalog module at ../../scraper/edelweiss/catalog.js')
  }
}

test('Edelweiss local catalog captures the verified first-party careers page and blocked direct-fetch contract', async () => {
  const {
    EDELWEISS_CATALOG,
    VERIFIED_SURFACE_SUMMARY,
  } = await loadCatalogModule()

  assert.equal(EDELWEISS_CATALOG.source, 'edelweiss')
  assert.equal(EDELWEISS_CATALOG.companyName, 'Edelweiss')
  assert.equal(EDELWEISS_CATALOG.officialBrandName, 'Edelweiss')
  assert.equal(EDELWEISS_CATALOG.adapter, 'script')
  assert.equal(EDELWEISS_CATALOG.modulePath, edelweissModulePath)
  assert.equal(EDELWEISS_CATALOG.dryRunFile, 'edelweiss/jobs.json')
  assert.equal(EDELWEISS_CATALOG.homepageUrl, 'https://www.edelweissfin.com/')
  assert.equal(
    EDELWEISS_CATALOG.companyCareerPage,
    'https://www.edelweissfin.com/edelweisscareers',
  )
  assert.equal(EDELWEISS_CATALOG.companyDomain, 'edelweissfin.com')
  assert.equal(
    EDELWEISS_CATALOG.applicationEmail,
    'GroupTalent.Acquisition@edelweissfin.com',
  )
  assert.equal(
    EDELWEISS_CATALOG.applicationUrl,
    'mailto:GroupTalent.Acquisition@edelweissfin.com',
  )
  assert.equal(EDELWEISS_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(EDELWEISS_CATALOG.countryFilter, 'India')
  assert.equal(
    EDELWEISS_CATALOG.paginationStrategy,
    'verified-homepage-plus-browser-verified-careers-page-plus-akamai-blocked-direct-fetch-routes',
  )
  assert.equal(
    EDELWEISS_CATALOG.extractionStrategy,
    'verified-first-party-homepage+verified-browser-careers-page-email-resume-handoff-without-public-listings+verified-akamai-blocked-direct-fetch-routes-return-empty',
  )
  assert.equal(EDELWEISS_CATALOG.parser, 'custom-script')
  assert.equal(EDELWEISS_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(EDELWEISS_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(EDELWEISS_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.edelweissfin\.com\//i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.edelweissfin\.com\/edelweisscareers/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /GroupTalent\.Acquisition@edelweissfin\.com/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Akamai/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Access Denied|403/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
})

test('Edelweiss local catalog hydrates into coverage without needing an alias entry', async () => {
  const { EDELWEISS_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(EDELWEISS_CATALOG)

  assert.equal(provider.companyName, 'Edelweiss')
  assert.equal(provider.companyDomain, 'edelweissfin.com')
  assert.match(provider.modulePath, /edelweiss[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /edelweiss[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Edelweiss\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Edelweiss', 'edelweiss', 'Edelweiss']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Edelweiss'), false)
})
