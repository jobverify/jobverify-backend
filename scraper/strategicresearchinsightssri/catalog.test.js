import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Strategic Research Insights is registered against the verified first-party careers grid with the CSV SRI alias', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'strategicresearchinsightssri')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Strategic Research Insights')
  assert.equal(provider.companyCareerPage, 'https://www.srinsights.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-grid-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-careers-grid+india-filtered-detail-pages+mailto-apply',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'srinsights.com')
  assert.match(provider.modulePath, /strategicresearchinsightssri[\\/]script\.js$/i)
  assert.equal(
    companyAliases['Strategic Research Insights(SRI)'],
    'strategicresearchinsightssri',
  )
})

test('Strategic Research Insights(SRI) matches company coverage through the explicit CSV alias and stays runnable', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Strategic Research Insights(SRI)\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[
      'Strategic Research Insights(SRI)',
      'strategicresearchinsightssri',
      'Strategic Research Insights',
    ]],
  )

  const scraper = buildScrapers().find((item) => item.name === 'strategicresearchinsightssri')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'strategicresearchinsightssri')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.srinsights.com/careers/')
  assert.match(scraper.dryRunFile, /strategicresearchinsightssri[\\/]jobs\.json$/i)
})
