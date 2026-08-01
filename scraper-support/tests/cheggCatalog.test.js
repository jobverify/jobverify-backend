import assert from 'node:assert/strict'
import test from 'node:test'

import { getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Chegg on the verified official jobs page and Workday handoff', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'chegg')

  assert.ok(provider, 'Expected Chegg provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Chegg')
  assert.equal(provider.companyCareerPage, 'https://www.chegg.com/about/working-at-chegg/jobs/')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-careers-handoff-plus-workday-runner')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-page+verified-workday-handoff+workday-detail-pages',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'chegg.com')
  assert.match(provider.modulePath, /chegg[\\/]script\.js$/i)
})
