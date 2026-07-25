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

test('getScraperCatalog includes Fox Corporation on the official India careers page backed by Workday', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'fox')

  assert.ok(provider)
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyName, 'Fox Corporation')
  assert.equal(
    provider.companyCareerPage,
    'https://www.foxcareers.com/Search/SearchResults?country=India',
  )
  assert.equal(provider.companyDomain, 'foxcareers.com')
  assert.equal(provider.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.equal(provider.baseUrl, 'https://fox.wd1.myworkdayjobs.com/en-US/Domestic')
})

test('buildScrapers exposes a runnable Fox Workday scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'fox')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /myworkday[\\/]fox[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'fox')
  assert.equal(scraper.provider.atsPlatform, 'workday')
})

test('Fox Workday local config switches the scraper onto the jobs API', () => {
  const config = loadConfig(path.join(testsDir, '../myworkday/fox'))

  assert.equal(config.listingStrategy, 'jobs-api')
  assert.equal(
    config.jobsApiUrl,
    'https://fox.wd1.myworkdayjobs.com/wday/cxs/fox/Domestic/jobs',
  )
  assert.equal(
    config.detailUrlBase,
    'https://fox.wd1.myworkdayjobs.com/en-US/Domestic',
  )
})

test('generateCompanyCoverageReport resolves the CSV row Fox to the Fox Corporation Workday provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Fox,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [
      item.companyName,
      item.source,
      item.provider?.companyName ?? null,
    ]),
    [['Fox', 'fox', 'Fox Corporation']],
  )
})
