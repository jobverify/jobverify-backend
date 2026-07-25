import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../monocept/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../monocept/catalog.js')
  } catch {
    assert.fail('Expected Monocept catalog module at ../monocept/catalog.js')
  }
}

test('Monocept local catalog captures the verified first-party handoff plus JS-shell blocker', async () => {
  const { default: catalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(catalog)

  assert.equal(provider.source, 'monocept')
  assert.equal(provider.companyName, 'Monocept')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.monocept.com/careers')
  assert.equal(provider.companyDomain, 'monocept.com')
  assert.equal(provider.atsPlatform, 'turbohire-js-shell')
  assert.equal(provider.paginationStrategy, 'fail-closed')
  assert.equal(provider.extractionStrategy, 'verified-first-party-handoff-but-no-server-rendered-jobs')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /TurboHire/i)
})
