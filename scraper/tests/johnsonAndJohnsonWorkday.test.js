import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

test('Johnson & Johnson resolves to the verified first-party Workday scraper and exact CSV name', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'johnsonandjohnson')
  const scraper = buildScrapers().find((item) => item.name === 'johnsonandjohnson')
  const report = generateCompanyCoverageReport({
    csvText: 'Johnson & Johnson,\n',
    catalog: getScraperCatalog(),
  })

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Johnson & Johnson')
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyCareerPage, 'https://www.careers.jnj.com/en/jobs')
  assert.equal(provider.companyDomain, 'careers.jnj.com')
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /myworkday[\\/]johnsonandjohnson[\\/]jobs\.json$/i)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Johnson & Johnson uses the public Workday jobs API with India location coverage', () => {
  const config = loadConfig(path.join(testsDir, '../myworkday/johnsonandjohnson'))

  assert.equal(config.listingStrategy, 'jobs-api')
  assert.equal(config.jobsApiUrl, 'https://jj.wd5.myworkdayjobs.com/wday/cxs/jj/JJ/jobs')
  assert.equal(config.detailUrlBase, 'https://jj.wd5.myworkdayjobs.com/JJ')
  assert.match(config.locationPattern, /india/i)
})
