import assert from 'node:assert/strict'
import test from 'node:test'
import * as audit from '../scripts/auditCatalogExtractions.js'

const catalog = [
  { source: 'alpha', adapter: 'publicAts' },
  { source: 'bravo', adapter: 'workday' },
  { source: 'placeholder', adapter: 'script' },
]
const classifyImplementation = provider => ({ type: provider.source === 'placeholder' ? 'sentinel' : 'shared-adapter' })

test('database unavailability retains every executable source for isolated auditing', () => {
  assert.equal(typeof audit.selectCatalogExtractionAuditProviders, 'function')
  const result = audit.selectCatalogExtractionAuditProviders(catalog, {
    runtime: { databaseAvailable: false, inventory: null }, classifyImplementation,
  })
  assert.deepEqual(result.map(row => row.source), ['alpha', 'bravo'])
})

test('only known visible sources can be skipped and an explicit inclusion rechecks them', () => {
  assert.equal(typeof audit.selectCatalogExtractionAuditProviders, 'function')
  const options = { runtime: { databaseAvailable: true, inventory: [{ source: 'alpha', visibleJobs: 2 }] }, classifyImplementation }
  assert.deepEqual(audit.selectCatalogExtractionAuditProviders(catalog, options).map(row => row.source), ['bravo'])
  assert.deepEqual(audit.selectCatalogExtractionAuditProviders(catalog, { ...options, includePublished: true }).map(row => row.source), ['alpha', 'bravo'])
})

test('an unknown requested source fails selection before any subprocess can start', () => {
  assert.equal(typeof audit.selectCatalogExtractionAuditProviders, 'function')
  assert.throws(() => audit.selectCatalogExtractionAuditProviders(catalog, { sourceIds: ['typo'], classifyImplementation }), /Unknown.*typo/)
})
