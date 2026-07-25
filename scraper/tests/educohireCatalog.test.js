import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes EducoHire as a verified public Zoho Recruit scraper', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'educohire')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'zoho-public-careers-api')
  assert.equal(provider.companyCareerPage, 'https://job.educohire.com/jobs/Careers')
  assert.equal(provider.companyDomain, 'educohire.com')
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /educohire[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable EducoHire scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const provider = scrapers.find((scraper) => scraper.name === 'educohire')

  assert.ok(provider)
  assert.equal(typeof provider.run, 'function')
  assert.equal(provider.provider.adapter, 'script')
  assert.equal(provider.provider.parser, 'custom-script')
})
