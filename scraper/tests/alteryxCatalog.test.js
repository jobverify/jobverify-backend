import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildWorkdayAppliedFacets } from '../myworkday/engine.js'
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

test('getScraperCatalog includes Alteryx on the verified first-party careers page backed by Workday', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'alteryx')

  assert.ok(provider)
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyName, 'Alteryx')
  assert.equal(provider.companyCareerPage, 'https://www.alteryx.com/about-us/careers')
  assert.equal(provider.companyDomain, 'alteryx.com')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.baseUrl, /alteryx\.wd108\.myworkdayjobs\.com\/en-US\/AlteryxCareers/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.alteryx\.com\/about-us\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /alteryx\.wd108\.myworkdayjobs\.com\/en-US\/AlteryxCareers/i)
  assert.match(provider.verifiedSurfaceSummary, /returned 74 total postings/i)
  assert.match(provider.verifiedSurfaceSummary, /c4f78be1a8f14da0ab49ce1162348a5e/i)
  assert.match(provider.verifiedSurfaceSummary, /count 6/i)
  assert.match(provider.verifiedSurfaceSummary, /Sr\. Workday Integration Specialist/i)
  assert.match(provider.verifiedSurfaceSummary, /Learning Programs Specialist/i)
  assert.match(provider.verifiedSurfaceSummary, /CX Operations Specialist/i)
})

test('buildScrapers and company coverage resolve Alteryx from the shared Workday catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'alteryx')
  const scraper = buildScrapers().find((item) => item.name === 'alteryx')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(scraper.provider.source, 'alteryx')
  assert.equal(scraper.provider.atsPlatform, 'workday')
  assert.match(scraper.dryRunFile, /myworkday[\\/]alteryx[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAlteryx\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Alteryx', 'alteryx', 'Alteryx']],
  )
})

test('Alteryx local Workday config uses the verified locationCountry facet expected by its public jobs API', () => {
  const config = loadConfig(path.join(testsDir, '../myworkday/alteryx'))

  assert.equal(config.countryFacetParameter, 'locationCountry')
  assert.deepEqual(
    buildWorkdayAppliedFacets(
      'https://alteryx.wd108.myworkdayjobs.com/en-US/AlteryxCareers',
      'c4f78be1a8f14da0ab49ce1162348a5e',
      config.countryFacetParameter,
    ),
    {
      locationCountry: ['c4f78be1a8f14da0ab49ce1162348a5e'],
    },
  )
})
