import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Okta catalog resolves Okta India through the shared first-party Okta provider', () => {
  const okta = getScraperCatalog().find((provider) => provider.source === 'okta')

  assert.ok(okta)
  assert.equal(okta.companyName, 'Okta')
  assert.equal(okta.adapter, 'script')
  assert.equal(okta.atsPlatform, 'official-first-party-drupal-job-board')
  assert.equal(okta.companyCareerPage, 'https://www.okta.com/en-in/company/careers/')
  assert.equal(okta.publicBoardUrl, 'https://www.okta.com/company/careers/job-listing/')
  assert.equal(companyAliases['Okta India'], 'okta')

  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name,url_in_text,note\n1,Okta,,\n2,Okta India,,\n',
    catalog: getScraperCatalog(),
    aliasMap: companyAliases,
  })

  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['Okta', 'okta', 'Okta'],
      ['Okta India', 'okta', 'Okta'],
    ],
  )
})

test('Okta catalog keeps one runnable Okta scraper without a duplicate Okta India runner', () => {
  const oktaIndia = getScraperCatalog().find((provider) => provider.source === 'oktaindia')
  const scraper = buildScrapers().find((candidate) => candidate.name === 'okta')

  assert.equal(oktaIndia, undefined)
  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'okta')
  assert.match(scraper.dryRunFile, /okta[\\/]jobs\.json$/i)
})
