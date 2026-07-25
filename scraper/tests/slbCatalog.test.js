import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes SLB as an Eightfold apiPortal provider with Cameron and Schlumberger alias metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'slb')

  assert.ok(provider)
  assert.equal(provider.adapter, 'apiPortal')
  assert.equal(provider.atsPlatform, 'eightfold')
  assert.equal(provider.companyName, 'SLB')
  assert.equal(provider.companyCareerPage, 'https://careers.slb.com/job-listing')
  assert.equal(provider.companyDomain, 'slb.com')
  assert.match(provider.config.discovery.listingApiUrl, /apply\.slb\.com\/api\/pcsx\/search/i)
  assert.equal(provider.config.request.query.domain, 'slb.com')
  assert.equal(provider.config.request.query.location, 'India')
  assert.equal(provider.config.mapping.location, 'locations.0')
  assert.equal(provider.config.mapping.sourceUrl.template, 'https://apply.slb.com/careers/job/{{jobId}}')
  assert.equal(provider.config.mapping.sourceUrl.values.jobId, 'id')
  assert.equal(provider.config.mapping.applyUrl.template, 'https://apply.slb.com/careers/apply?pid={{jobId}}&domain=slb.com')
  assert.equal(provider.config.mapping.applyUrl.values.jobId, 'id')
  assert.equal(companyAliases.Cameron, 'slb')
  assert.equal(companyAliases.Schlumberger, 'slb')
})

test('buildScrapers exposes a runnable SLB apiPortal scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'slb')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /slb[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'slb')
  assert.equal(scraper.provider.atsPlatform, 'eightfold')
})
