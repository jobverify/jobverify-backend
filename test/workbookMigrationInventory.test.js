import assert from 'node:assert/strict'
import test from 'node:test'

import dedicatedProviders from '../scraper-support/providers/providerExtensions/zz-dedicated-scraper-folder-backfill.json' with { type: 'json' }
import {
  buildCanonicalWorkbookInventory,
  loadWorkbookBatchAliases,
  loadWorkbookBatchProviders,
} from '../scripts/lib/workbookMigrationInventory.js'

test('buildCanonicalWorkbookInventory merges all workbook sources without duplication', () => {
  const workbookProviders = loadWorkbookBatchProviders()
  const workbookAliases = loadWorkbookBatchAliases()
  const result = buildCanonicalWorkbookInventory({ workbookProviders, dedicatedProviders })

  assert.equal(workbookProviders.length, 1880)
  assert.equal(result.stats.uniqueWorkbookSourceCount, 1880)
  assert.equal(result.stats.overlapWithDedicatedCount, 580)
  assert.equal(result.stats.batchOnlyCount, 1300)
  assert.equal(result.dedicatedOnlyProviders.length, 6)
  assert.deepEqual(result.conflicts, [])
  assert.equal(result.canonicalProviders.length, 1886)
  assert.equal(workbookAliases.Cibil, 'transunioncibil')
  assert.equal(workbookAliases['Amazon Development Center'], 'amazon')
})
