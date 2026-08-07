import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadPractoCatalog = async () => {
  try {
    return await import('../../scraper/practo/catalog.js')
  } catch {
    assert.fail('Expected Practo catalog module at ../../scraper/practo/catalog.js')
  }
}

test('Practo catalog captures the verified July 26, 2026 hidden-and-closed careers contract', async () => {
  const { PRACTO_CATALOG } = await loadPractoCatalog()

  assert.equal(PRACTO_CATALOG.source, 'practo')
  assert.equal(PRACTO_CATALOG.companyName, 'Practo')
  assert.equal(PRACTO_CATALOG.officialBrandName, 'Practo')
  assert.equal(PRACTO_CATALOG.adapter, 'script')
  assert.equal(PRACTO_CATALOG.homepageUrl, 'https://www.practo.com/')
  assert.equal(PRACTO_CATALOG.companyCareerPage, 'https://careers.practo.com/practo/')
  assert.equal(PRACTO_CATALOG.companyDomain, 'practo.com')
  assert.equal(PRACTO_CATALOG.atsPlatform, 'zwayam-no-public-jobs-sentinel')
  assert.equal(PRACTO_CATALOG.countryFilter, 'India')
  assert.equal(
    PRACTO_CATALOG.paginationStrategy,
    'official-careers-shell-plus-zwayam-search-contract-validation',
  )
  assert.equal(
    PRACTO_CATALOG.extractionStrategy,
    'verified-careers-shell+verified-zwayam-search-hidden-closed-only-return-empty',
  )
  assert.equal(PRACTO_CATALOG.parser, 'custom-script')
  assert.equal(PRACTO_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(PRACTO_CATALOG.verifiedOn, '2026-07-26')
  assert.equal(PRACTO_CATALOG.officialSearchApiUrl, 'https://public.zwayam.com/jobs/search')
  assert.equal(PRACTO_CATALOG.zwayamCompanyId, 'MTYzMDI=')
  assert.equal(PRACTO_CATALOG.zwayamDetailCompanyId, '16302')
  assert.match(PRACTO_CATALOG.verifiedSurfaceSummary, /Sunday, July 26, 2026/i)
  assert.match(PRACTO_CATALOG.verifiedSurfaceSummary, /app-root shell/i)
  assert.match(PRACTO_CATALOG.verifiedSurfaceSummary, /Practo \| Careers/i)
  assert.match(PRACTO_CATALOG.verifiedSurfaceSummary, /Hidden/i)
  assert.match(PRACTO_CATALOG.verifiedSurfaceSummary, /Closed/i)
  assert.match(PRACTO_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.match(PRACTO_CATALOG.modulePath, /scraper[\\/]practo[\\/]script\.js$/i)
  assert.match(PRACTO_CATALOG.dryRunFile, /practo[\\/]jobs\.json$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Practo'), false)
})

test('getScraperCatalog exposes Practo as a runnable shared provider without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'practo')
  const scraper = buildScrapers().find((item) => item.name === 'practo')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Practo')
  assert.equal(provider.companyCareerPage, 'https://careers.practo.com/practo/')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Practo'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'Practo\n',
    catalog: getScraperCatalog(),
    aliasMap: companyAliases,
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Practo', 'practo', 'Practo']],
  )
})
