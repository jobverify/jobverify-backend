import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes the Happiest Minds current Zwayam script provider with official metadata', () => {
  const catalog = getScraperCatalog()
  const happiestminds = catalog.find((provider) => provider.source === 'happiestminds')

  assert.ok(happiestminds)
  assert.equal(happiestminds.adapter, 'script')
  assert.equal(happiestminds.atsPlatform, 'zwayam')
  assert.equal(happiestminds.companyCareerPage, 'https://careers.happiestminds.com/')
  assert.equal(happiestminds.companyDomain, 'happiestminds.com')
  assert.equal(happiestminds.parser, 'custom-script')
  assert.match(happiestminds.modulePath, /happiestminds[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Happiest Minds script scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const happiestminds = scrapers.find((scraper) => scraper.name === 'happiestminds')

  assert.ok(happiestminds)
  assert.equal(typeof happiestminds.run, 'function')
  assert.equal(happiestminds.provider.adapter, 'script')
  assert.equal(happiestminds.provider.parser, 'custom-script')
  assert.equal(happiestminds.provider.companyCareerPage, 'https://careers.happiestminds.com/')
})

test('Happiest metadata exposes both current boards and explicitly limited coverage',()=>{
 const provider=getScraperCatalog().find(p=>p.source==='happiestminds')
 assert.equal(provider.companyDomain,'happiestminds.com')
 assert.equal(provider.publicListingApiUrl,'https://public.zwayam.com/jobs/search')
 assert.equal(provider.zwayamCompanyId,'MTU5NzQ=')
 assert.equal(provider.zwayamDetailCompanyId,'15974')
 assert.equal(provider.verifiedPublicListingRowCount,392)
 assert.equal(provider.verifiedIndiaListingRowCount,342)
 assert.equal(provider.additionalPublicJobsUrl,'https://smileshrms.darwinbox.com/ms/candidate/careers')
 assert.equal(provider.listingComplete,false)
 assert.equal(provider.indiaInventoryTotal,null)
 assert.equal(provider.verifiedPublicJobCount,null)
 assert.equal(provider.verifiedIndiaJobCount,null)
 assert.match(provider.verifiedSurfaceSummary,/incomplete|coverage-gap/)
})
