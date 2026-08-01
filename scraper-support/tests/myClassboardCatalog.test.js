import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('MyClassboard is registered only for the exact CSV company name', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'myclassboard')
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nMyClassboard\nMy Classboard\n',
    catalog: getScraperCatalog(),
  })

  assert.ok(provider)
  assert.equal(provider.companyName, 'MyClassboard')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.companyCareerPage, 'https://www.myclassboard.com/careers/')
  assert.equal(provider.companyDomain, 'myclassboard.com')
  assert.equal(report.matchedCount, 1)
  assert.equal(report.matched[0]?.source, 'myclassboard')
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['My Classboard'])
})

test('MyClassboard fails closed when its official careers page has no enumerable listings feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'myclassboard')

  assert.ok(scraper)
  assert.equal(scraper.provider.atsPlatform, 'official-first-party-careers-email-apply-only')
  assert.deepEqual(await scraper.run(), [])
})
