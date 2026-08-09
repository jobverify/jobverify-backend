import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes the Qualcomm apiPortal provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const qualcomm = catalog.find((provider) => provider.source === 'qualcomm')

  assert.ok(qualcomm)
  assert.equal(qualcomm.adapter, 'apiPortal')
  assert.equal(qualcomm.atsPlatform, 'eightfold')
  assert.match(qualcomm.companyCareerPage, /careers\.qualcomm\.com\/careers/i)
  assert.equal(qualcomm.companyDomain, 'careers.qualcomm.com')
  assert.match(qualcomm.config.discovery.listingApiUrl, /careers\.qualcomm\.com\/api\/pcsx\/search/i)
  assert.equal(qualcomm.config.request.headers.Accept, 'application/json, text/plain, */*')
  assert.match(qualcomm.config.request.headers['User-Agent'], /Mozilla\/5\.0/)
  assert.equal(
    qualcomm.config.request.headers.Referer,
    'https://careers.qualcomm.com/careers?domain=qualcomm.com',
  )
  assert.equal(qualcomm.config.request.headers.Origin, 'https://careers.qualcomm.com')
  assert.deepEqual(qualcomm.config.detail.headers, qualcomm.config.request.headers)
})

test('buildScrapers exposes a runnable Qualcomm apiPortal scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const qualcomm = scrapers.find((scraper) => scraper.name === 'qualcomm')

  assert.ok(qualcomm)
  assert.equal(typeof qualcomm.run, 'function')
  assert.match(qualcomm.dryRunFile, /qualcomm[\\/]jobs\.json$/)
  assert.equal(qualcomm.provider.source, 'qualcomm')
  assert.equal(qualcomm.provider.atsPlatform, 'eightfold')
})
