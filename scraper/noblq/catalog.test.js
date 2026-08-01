import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('NoblQ is registered against its first-party Zoho Recruit careers portal', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'noblq')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'NoblQ')
  assert.equal(provider.companyCareerPage, 'https://talent.noblq.com/jobs/Careers')
  assert.equal(provider.atsPlatform, 'zohorecruit')
  assert.equal(provider.paginationStrategy, 'single-public-json-feed')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-about-us-careers-handoff+verified-first-party-zoho-portal+zoho-public-jobs-api',
  )
  assert.equal(provider.companyDomain, 'talent.noblq.com')
  assert.match(provider.modulePath, /noblq[\\/]script\.js$/i)
})

test('NoblQ is runnable through the provider catalog and resolves the CSV company name without aliases', () => {
  const scraper = buildScrapers().find((item) => item.name === 'noblq')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'noblq')
  assert.match(scraper.dryRunFile, /noblq[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'NoblQ,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['NoblQ', 'noblq', 'NoblQ']],
  )
})
