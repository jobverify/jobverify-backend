import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Finolex Industries Limited as an official empty-state careers sentinel', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'finolexindustrieslimited')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-site-empty-state-careers')
  assert.equal(provider.companyName, 'Finolex Industries Limited')
  assert.equal(provider.companyCareerPage, 'https://www.finolexpipes.com/career/')
  assert.equal(provider.companyDomain, 'finolexpipes.com')
  assert.equal(provider.verifiedOn, '2026-08-07')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(provider.verifiedIndiaJobCount, 0)
  assert.equal(provider.officialCareersEmail, 'career@finolexind.com')
  assert.match(provider.verifiedSurfaceSummary, /Friday, August 7, 2026/i)
  assert.match(provider.modulePath, /finolexindustrieslimited[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Finolex Industries Limited scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'finolexindustrieslimited')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'finolexindustrieslimited')
  assert.equal(scraper.provider.atsPlatform, 'official-company-site-empty-state-careers')
  assert.match(scraper.dryRunFile, /finolexindustrieslimited[\\/]jobs\.json$/)
})
