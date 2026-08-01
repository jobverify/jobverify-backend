import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/sureprep/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/sureprep/catalog.js')
  } catch {
    assert.fail('Expected SurePrep catalog module at ../../scraper/sureprep/catalog.js')
  }
}

test('SurePrep local catalog captures the verified no-public-jobs exact-name surface', async () => {
  const { default: catalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(catalog)

  assert.equal(provider.source, 'sureprep')
  assert.equal(provider.companyName, 'SurePrep')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://sureprep.com/')
  assert.equal(provider.companyDomain, 'sureprep.com')
  assert.equal(provider.atsPlatform, 'no-public-jobs-surface')
  assert.equal(provider.paginationStrategy, 'fail-closed')
  assert.equal(provider.extractionStrategy, 'verified-login-surface-without-public-jobs')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Thomson Reuters/i)
})
