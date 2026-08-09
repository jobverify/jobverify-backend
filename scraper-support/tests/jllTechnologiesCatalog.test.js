import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

test('getScraperCatalog includes JLL Technologies on the scoped parent Workday board', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'jlltechnologies')

  assert.ok(provider)
  assert.equal(provider.adapter, 'workday')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.companyName, 'JLL Technologies')
  assert.equal(provider.companyCareerPage, 'https://www.jll.com/en-in/careers')
  assert.equal(provider.companyDomain, 'jll.com')
  assert.equal(provider.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.match(provider.baseUrl, /jll\.wd1\.myworkdayjobs\.com\/jllcareers/i)
  assert.match(provider.baseUrl, /jobFamilyGroup=f134f8e1c0811001fe9e2695d0c80000/i)
})

test('buildScrapers exposes a runnable JLL Technologies Workday scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'jlltechnologies')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /jlltechnologies.workday[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'jlltechnologies')
  assert.equal(scraper.provider.atsPlatform, 'workday')

  const report = generateCompanyCoverageReport({
    csvText: 'JLL Technologies,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['JLL Technologies', 'jlltechnologies', 'JLL Technologies']],
  )
})

test('JLL Technologies Workday local config switches the scraper onto the jobs API with scoped job families', () => {
  const config = loadConfig(path.join(testsDir, '../../scraper/jlltechnologies.workday'))

  assert.equal(config.listingStrategy, 'jobs-api')
  assert.equal(
    config.jobsApiUrl,
    'https://jll.wd1.myworkdayjobs.com/wday/cxs/jll/jllcareers/jobs',
  )
  assert.equal(
    config.detailUrlBase,
    'https://jll.wd1.myworkdayjobs.com/jllcareers',
  )
  assert.equal(config.countryFacetParameter, 'locationCountry')
})
