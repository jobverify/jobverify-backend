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
const INDIA_FACET_ID = 'c4f78be1a8f14da0ab49ce1162348a5e'

test('getScraperCatalog includes Alation on the verified first-party careers page backed by Workday', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'alation')

  assert.ok(provider)
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyName, 'Alation')
  assert.equal(provider.officialBrandName, 'Alation')
  assert.equal(provider.companyCareerPage, 'https://www.alation.com/careers/all-careers/')
  assert.equal(provider.companyDomain, 'alation.com')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.baseUrl, /alation\.wd503\.myworkdayjobs\.com\/en-US\/ExternalSite/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.alation\.com\/careers\/all-careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /alation\.wd503\.myworkdayjobs\.com\/en-US\/ExternalSite/i)
  assert.match(provider.verifiedSurfaceSummary, /People Operations Generalist/i)
  assert.match(provider.verifiedSurfaceSummary, /Software Engineer II/i)
  assert.match(provider.verifiedSurfaceSummary, /IND-CHENNAI/i)
})

test('buildScrapers and company coverage resolve Alation from the shared Workday catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'alation')
  const scraper = buildScrapers().find((item) => item.name === 'alation')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(scraper.provider.source, 'alation')
  assert.equal(scraper.provider.atsPlatform, 'workday')
  assert.match(scraper.dryRunFile, /myworkday[\\/]alation[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAlation\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Alation', 'alation', 'Alation']],
  )
})

test('Alation local Workday config skips the default India facet and relies on India location filtering', () => {
  const config = loadConfig(path.join(testsDir, '../myworkday/alation'))

  assert.equal(config.locationCountry, null)
  assert.match(config.locationPattern, /india|ind-|chennai/i)
  assert.deepEqual(
    buildWorkdayAppliedFacets(
      'https://alation.wd503.myworkdayjobs.com/en-US/ExternalSite',
      config.locationCountry,
      config.countryFacetParameter,
    ),
    {},
  )
})
