import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes MediaTek as an eREC-backed script provider with official metadata', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'mediatek')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'mediatek-erec')
  assert.equal(provider.companyName, 'MediaTek')
  assert.equal(provider.companyCareerPage, 'https://careers.mediatek.com/en/jobs')
  assert.equal(provider.companyDomain, 'careers.mediatek.com')
  assert.match(provider.modulePath, /mediatek[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable MediaTek scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'mediatek')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /mediatek[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'mediatek')
  assert.equal(scraper.provider.atsPlatform, 'mediatek-erec')
})
