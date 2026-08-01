import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/ikya/catalog.js')
  } catch {
    assert.fail('Expected Ikya catalog module at ../../scraper/ikya/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/ikya/script.js')
  } catch {
    assert.fail('Expected Ikya scraper module at ../../scraper/ikya/script.js')
  }
}

test('Ikya local catalog captures the verified SmartRecruiters empty-board sentinel contract', async () => {
  const { IKYA_CATALOG } = await loadCatalogModule()
  const ikya = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(IKYA_CATALOG)

  assert.equal(IKYA_CATALOG.source, 'ikya')
  assert.equal(IKYA_CATALOG.companyName, 'Ikya')
  assert.equal(IKYA_CATALOG.officialBrandName, 'Ikya')
  assert.equal(IKYA_CATALOG.adapter, 'script')
  assert.equal(IKYA_CATALOG.homepageUrl, 'https://www.ikya.com/')
  assert.equal(IKYA_CATALOG.companyCareerPage, 'https://careers.smartrecruiters.com/Ikya1')
  assert.equal(IKYA_CATALOG.companyDomain, 'ikya.com')
  assert.equal(IKYA_CATALOG.atsPlatform, 'smartrecruiters-empty-board')
  assert.equal(IKYA_CATALOG.countryFilter, 'India')
  assert.equal(
    IKYA_CATALOG.paginationStrategy,
    'single-smartrecruiters-board-verification-plus-homepage-placeholder-check',
  )
  assert.equal(
    IKYA_CATALOG.extractionStrategy,
    'verified-empty-smartrecruiters-board+non-html-homepage-placeholder-return-empty',
  )
  assert.equal(IKYA_CATALOG.parser, 'custom-script')
  assert.equal(IKYA_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(IKYA_CATALOG.modulePath, '../../scraper/ikya/script.js')
  assert.equal(IKYA_CATALOG.dryRunFile, 'ikya/jobs.json')
  assert.equal(IKYA_CATALOG.verifiedOn, '2026-07-16')
  assert.match(IKYA_CATALOG.verifiedSurfaceSummary, /careers\.smartrecruiters\.com\/Ikya1/i)
  assert.match(IKYA_CATALOG.verifiedSurfaceSummary, /No job postings are currently available/i)
  assert.match(IKYA_CATALOG.verifiedSurfaceSummary, /2-byte non-HTML placeholder/i)

  assert.equal(provider.source, 'ikya')
  assert.equal(provider.companyName, 'Ikya')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.smartrecruiters.com/Ikya1')
  assert.equal(provider.companyDomain, 'ikya.com')
  assert.match(provider.modulePath, /ikya[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /ikya[\\/]jobs\.json$/i)

  assert.equal(ikya.PROVIDER_METADATA.source, provider.source)
  assert.equal(ikya.CAREERS_URL, provider.companyCareerPage)
  assert.equal(ikya.HOMEPAGE_URL, provider.homepageUrl)
})

test('Ikya exact-name backlog rows resolve directly from local provider metadata without shared aliases', async () => {
  const { IKYA_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Ikya\n',
    catalog: [hydrateProviderCatalogEntry(IKYA_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Ikya', 'ikya', 'Ikya']],
  )
})

test('getScraperCatalog includes Ikya as a verified SmartRecruiters empty-board provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ikya')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Ikya')
  assert.equal(provider.companyCareerPage, 'https://careers.smartrecruiters.com/Ikya1')
  assert.equal(provider.companyDomain, 'ikya.com')
  assert.equal(provider.atsPlatform, 'smartrecruiters-empty-board')
  assert.match(provider.modulePath, /ikya[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Ikya scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'ikya')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'ikya')
  assert.equal(scraper.provider.atsPlatform, 'smartrecruiters-empty-board')
  assert.match(scraper.dryRunFile, /ikya[\\/]jobs\.json$/i)
})
