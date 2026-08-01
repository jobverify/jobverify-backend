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
const alliedModulePath = path.resolve(currentDir, '../../scraper/allieddigitalservices/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/allieddigitalservices/catalog.js')
  } catch {
    assert.fail('Expected Allied Digital Services catalog module at ../../scraper/allieddigitalservices/catalog.js')
  }
}

const loadAlliedModule = async () => {
  try {
    return await import('../../scraper/allieddigitalservices/script.js')
  } catch {
    assert.fail('Expected Allied Digital Services scraper module at ../../scraper/allieddigitalservices/script.js')
  }
}

test('Allied Digital Services local catalog captures the verified first-party India careers and Hiring Now surface', async () => {
  const { ALLIED_DIGITAL_SERVICES_CATALOG } = await loadCatalogModule()
  const allied = await loadAlliedModule()

  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.source, 'allieddigitalservices')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.companyName, 'Allied Digital Services')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.officialBrandName, 'Allied Digital Services Ltd')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.adapter, 'script')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.companyCareerPage, 'https://www.allieddigital.net/in/careers/')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.companyDomain, 'allieddigital.net')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.indiaHomeUrl, 'https://www.allieddigital.net/in/')
  assert.equal(
    ALLIED_DIGITAL_SERVICES_CATALOG.hiringNowPageUrl,
    'https://www.allieddigital.net/in/careers/hiring-now/',
  )
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.countryFilter, 'India')
  assert.equal(
    ALLIED_DIGITAL_SERVICES_CATALOG.paginationStrategy,
    'verified-root-geolocation-plus-single-first-party-hiring-now-page',
  )
  assert.equal(
    ALLIED_DIGITAL_SERVICES_CATALOG.extractionStrategy,
    'verified-root-geolocation+verified-india-careers-handoff+verified-hiring-now-tables+friendly-detail-link-when-present+listing-fallback-for-broken-request-links',
  )
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.parser, 'custom-script')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.dryRunFile, 'allieddigitalservices/jobs.json')
  assert.match(
    ALLIED_DIGITAL_SERVICES_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.allieddigital\.net\//i,
  )
  assert.match(
    ALLIED_DIGITAL_SERVICES_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.allieddigital\.net\/in\/careers\//i,
  )
  assert.match(
    ALLIED_DIGITAL_SERVICES_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.allieddigital\.net\/in\/careers\/hiring-now\//i,
  )
  assert.match(
    ALLIED_DIGITAL_SERVICES_CATALOG.verifiedSurfaceSummary,
    /senior-talent-acquisition-specialist-global/i,
  )
  assert.match(
    ALLIED_DIGITAL_SERVICES_CATALOG.verifiedSurfaceSummary,
    /jobdetails\?requestid=8154/i,
  )
  assert.match(
    ALLIED_DIGITAL_SERVICES_CATALOG.verifiedSurfaceSummary,
    /404/i,
  )
  assert.equal(ALLIED_DIGITAL_SERVICES_CATALOG.modulePath, alliedModulePath)

  assert.equal(allied.PROVIDER_METADATA.source, ALLIED_DIGITAL_SERVICES_CATALOG.source)
  assert.equal(allied.PROVIDER_METADATA.companyName, ALLIED_DIGITAL_SERVICES_CATALOG.companyName)
  assert.equal(allied.PROVIDER_METADATA.hiringNowPageUrl, ALLIED_DIGITAL_SERVICES_CATALOG.hiringNowPageUrl)
})

test('Allied Digital Services local catalog hydrates into coverage without needing a shared alias entry', async () => {
  const { ALLIED_DIGITAL_SERVICES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(ALLIED_DIGITAL_SERVICES_CATALOG)

  assert.equal(provider.companyName, 'Allied Digital Services')
  assert.equal(provider.companyDomain, 'allieddigital.net')
  assert.match(provider.modulePath, /allieddigitalservices[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /allieddigitalservices[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Allied Digital Services\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Allied Digital Services', 'allieddigitalservices', 'Allied Digital Services']],
  )
  assert.equal(
    Object.prototype.hasOwnProperty.call(companyAliases, 'Allied Digital Services'),
    false,
  )
})

test('buildScrapers and company coverage resolve Allied Digital Services from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'allieddigitalservices')
  const scraper = buildScrapers().find((item) => item.name === 'allieddigitalservices')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Allied Digital Services')
  assert.equal(provider.companyCareerPage, 'https://www.allieddigital.net/in/careers/')
  assert.match(scraper.dryRunFile, /allieddigitalservices[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Allied Digital Services\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Allied Digital Services', 'allieddigitalservices', 'Allied Digital Services']],
  )
})
