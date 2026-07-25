import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../zycusinfotech/script.js')

test('Zycus Infotech local catalog captures the verified Talismatic microsite API', async () => {
  const { ZYCUS_INFOTECH_CATALOG, default: defaultCatalog } = await import('../zycusinfotech/catalog.js')
  const provider = hydrateProviderCatalogEntry(ZYCUS_INFOTECH_CATALOG)

  assert.equal(defaultCatalog, ZYCUS_INFOTECH_CATALOG)
  assert.equal(provider.source, 'zycusinfotech')
  assert.equal(provider.companyName, 'Zycus Infotech')
  assert.equal(provider.jobsApiUrl, 'https://careers-be.talismatic.com:5010/api/microsite/job-list')
  assert.equal(provider.atsPlatform, 'talismatic-microsite-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.modulePath, modulePath)
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /71 open Zycus jobs/i)
})
