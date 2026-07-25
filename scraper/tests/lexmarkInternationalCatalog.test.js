import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../lexmarkinternational/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../lexmarkinternational/catalog.js')
  } catch {
    assert.fail('Expected Lexmark International catalog module at ../lexmarkinternational/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../lexmarkinternational/script.js')
  } catch {
    assert.fail('Expected Lexmark International scraper module at ../lexmarkinternational/script.js')
  }
}

test('Lexmark International local catalog captures the verified careers handoff and Workday outage sentinel', async () => {
  const { LEXMARK_INTERNATIONAL_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const lexmark = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(LEXMARK_INTERNATIONAL_CATALOG)

  assert.equal(defaultCatalog, LEXMARK_INTERNATIONAL_CATALOG)
  assert.equal(provider.source, 'lexmarkinternational')
  assert.equal(provider.companyName, 'Lexmark International')
  assert.equal(provider.officialBrandName, 'Lexmark')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.lexmark.com/')
  assert.equal(provider.companyCareerPage, 'https://www.lexmark.com/en_us/about-us/careers.html')
  assert.equal(provider.officialCareersPageUrl, 'https://www.lexmark.com/en_us/about-us/careers.html')
  assert.equal(provider.officialWorkdayBoardUrl, 'https://lexmark.wd1.myworkdayjobs.com/Lexmark')
  assert.equal(provider.workdayOutageCanonicalUrl, 'https://community.workday.com/outage-page/40755')
  assert.equal(provider.companyDomain, 'lexmark.com')
  assert.equal(provider.atsPlatform, 'official-careers-page-workday-outage-sentinel')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-first-party-careers-page-plus-workday-outage-sentinel',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-workday-handoff+verified-workday-outage+return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.lexmark\.com\/en_us\/about-us\/careers\.html/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/lexmark\.wd1\.myworkdayjobs\.com\/Lexmark/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/community\.workday\.com\/outage-page\/40755/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /lexmarkinternational[\\/]jobs\.json$/i)

  assert.equal(lexmark.PROVIDER_METADATA.source, provider.source)
  assert.equal(lexmark.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
})

test('Lexmark International exact backlog row resolves from the local provider contract without aliases', async () => {
  const { LEXMARK_INTERNATIONAL_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Lexmark International\n',
    catalog: [hydrateProviderCatalogEntry(LEXMARK_INTERNATIONAL_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lexmark International', 'lexmarkinternational', 'Lexmark International']],
  )
})
