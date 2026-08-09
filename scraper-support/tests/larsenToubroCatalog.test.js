import assert from 'node:assert/strict'
import test from 'node:test'

import { getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Larsen & Toubro as a PeopleStrong script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'larsentoubro')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Larsen & Toubro')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'peoplestrong')
  assert.equal(provider.companyCareerPage, 'https://www.larsentoubro.com/corporate/careers')
  assert.equal(provider.companyDomain, 'larsentoubrocareers.peoplestrong.com')
  assert.equal(provider.extractionStrategy, 'peoplestrong-jobs-api')
  assert.match(provider.modulePath, /larsentoubro[\\/]script\.js$/i)
})
