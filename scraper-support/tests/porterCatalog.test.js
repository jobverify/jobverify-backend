import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Porter catalog captures the verified official Darwinbox careers handoff', () => {
  const porter = getScraperCatalog().find((provider) => provider.source === 'porter')

  assert.ok(porter)
  assert.equal(porter.companyName, 'Porter')
  assert.equal(porter.adapter, 'script')
  assert.equal(porter.atsPlatform, 'darwinbox')
  assert.equal(porter.companyCareerPage, 'https://porter.in/careers')
  assert.equal(porter.officialCareersHandoffUrl, 'https://porter.darwinbox.in/ms/candidate/careers')
  assert.equal(porter.darwinboxOrigin, 'https://porter.darwinbox.in')
  assert.equal(porter.darwinboxCompanyId, 'main')
})

test('Porter exact backlog rows resolve directly from local provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name,url_in_text,note\n1,Porter,,\n',
    catalog: getScraperCatalog(),
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Porter', 'porter', 'Porter']],
  )
})

test('Porter stays script-runner compatible for central registry integration', () => {
  const scraper = buildScrapers().find((candidate) => candidate.name === 'porter')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'porter')
  assert.match(scraper.dryRunFile, /porter[\\/]jobs\.json$/i)
})
