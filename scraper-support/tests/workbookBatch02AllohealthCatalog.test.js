import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Allo Health is wired to a verified exact-name no-public-careers scraper instead of the generic sentinel', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'allohealth')
  const scraper = buildScrapers().find((item) => item.name === 'allohealth')

  assert.ok(provider)
  assert.ok(scraper)

  assert.equal(provider.companyName, 'Allo Health')
  assert.equal(provider.companyCareerPage, 'https://www.allohealth.com/about')
  assert.equal(provider.companyDomain, 'allohealth.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(
    provider.paginationStrategy,
    'verified-homepage-plus-about-page-plus-missing-careers-route-and-non-www-alias-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-exact-name-homepage+verified-about-page+verified-missing-careers-route-return-empty',
  )
  assert.equal(provider.verifiedOn, '2026-07-30')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(provider.verifiedIndiaJobCount, 0)
  assert.match(provider.modulePath, /allohealth\.js$/)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, July 30, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.allohealth\.com\/about/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.allohealth\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /structured healthcare ecosystem/i)

  assert.equal(scraper.provider.modulePath, provider.modulePath)
})
