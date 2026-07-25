import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog registers Decathlon Sports India with official Cegid metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'decathlon')

  assert.ok(provider)
  assert.equal(provider.adapter, 'apiPortal')
  assert.equal(provider.atsPlatform, 'cegid-digitalrecruiters')
  assert.equal(provider.companyCareerPage, 'https://joinus.decathlon.in/en')
  assert.equal(provider.companyDomain, 'joinus.decathlon.in')
  assert.equal(
    provider.config.discovery.listingApiUrl,
    'https://api.digitalrecruiters.com/public/v1/careers-site/job-ads',
  )
  assert.equal(provider.config.request.query.domainName, 'joinus.decathlon.in')
  assert.equal(provider.config.request.query.locale, 'en_GB')
})

test('buildScrapers exposes a runnable Decathlon Sports India scraper', () => {
  const scraper = buildScrapers().find((item) => item.name === 'decathlon')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /decathlon[\\/]jobs\.json$/)
})

test('company coverage resolves Decathlon Sports India and its Decathlon alias', () => {
  const report = generateCompanyCoverageReport({
    csvText: `row,company_name,url_in_text,note
1,Decathlon Sports India,,
2,Decathlon,,
`,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source]),
    [
      ['Decathlon Sports India', 'decathlon'],
      ['Decathlon', 'decathlon'],
    ],
  )
})
