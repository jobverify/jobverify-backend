import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

test('getScraperCatalog includes Roche on the verified first-party careers page backed by Workday', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'roche')

  assert.ok(provider)
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyName, 'Roche')
  assert.equal(provider.companyCareerPage, 'https://careers.roche.com/global/en')
  assert.equal(provider.companyDomain, 'careers.roche.com')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.baseUrl, /roche\.wd3\.myworkdayjobs\.com\/en-US\/roche-ext/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.roche\.com\/global\/en/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.roche\.com\/global\/en\/india/i)
  assert.match(provider.verifiedSurfaceSummary, /roche\.wd3\.myworkdayjobs\.com\/en-US\/roche-ext/i)
  assert.match(provider.verifiedSurfaceSummary, /Technical Team Lead/i)
  assert.match(provider.verifiedSurfaceSummary, /Head of Engineering Applied AI/i)
  assert.match(provider.verifiedSurfaceSummary, /Head of Forward-Deployed Data Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /Hyderabad/i)
  assert.match(provider.verifiedSurfaceSummary, /Pune/i)
  assert.match(provider.verifiedSurfaceSummary, /Chennai/i)
})

test('buildScrapers and company coverage resolve Roche from the shared Workday catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'roche')
  const scraper = buildScrapers().find((item) => item.name === 'roche')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(scraper.provider.source, 'roche')
  assert.equal(scraper.provider.atsPlatform, 'workday')
  assert.match(scraper.dryRunFile, /myworkday[\\/]roche[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nRoche\n',
    catalog: getScraperCatalog(),
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Roche', 'roche', 'Roche']],
  )
})

test('Roche local Workday config uses the shared jobs API defaults with the India country facet', () => {
  const config = loadConfig(path.join(testsDir, '../myworkday/roche'))

  assert.equal(config.listingStrategy, 'jobs-api')
  assert.equal(config.countryFacetParameter, 'locationCountry')
  assert.equal(
    config.jobsApiUrl,
    'https://roche.wd3.myworkdayjobs.com/wday/cxs/roche/roche-ext/jobs',
  )
  assert.equal(
    config.detailUrlBase,
    'https://roche.wd3.myworkdayjobs.com/en-US/roche-ext',
  )
})
