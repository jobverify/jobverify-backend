import test from 'node:test'
import assert from 'node:assert/strict'
import { getScraperCatalog } from '../../scraper-support/providers/index.js'

test('the effective registry selects the proven phase4 implementations without invented publication counts', () => {
  const catalog = getScraperCatalog()
  for (const [source, platform] of [['accellor', 'gem'], ['affirm', 'greenhouse'], ['aembit', 'bamboohr']]) {
    const rows = catalog.filter(row => row.source === source)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].adapter, 'script')
    assert.equal(rows[0].atsPlatform, platform)
    assert.equal(rows[0].zeroResultPolicy, 'evidence-required')
    assert.equal(rows[0].verifiedIndiaJobCount, null)
    assert.equal(rows[0].verifiedPublicJobCount, null)
  }
  assert.equal(catalog.find(row => row.source === 'aembit').positiveExtractionStatus, 'unverified-open-backlog')
})
