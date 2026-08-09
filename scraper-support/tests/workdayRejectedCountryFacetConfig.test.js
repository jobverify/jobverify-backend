import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

const sourcesRejectingGenericCountryFacet = [
  'brenntagindia', 'broadridge', 'browserstack', 'cadence', 'calix', 'dow',
  'elsevier', 'epiqsystems', 'fox', 'fractal', 'genpact', 'hpinc', 'intel',
  'magnaautomotive', 'mastercard', 'ncrvoyix', 'nissandigitalindia', 'nvidia',
  'nxp', 'protiviti', 'q2ebanking', 'redhat', 'salesforce', 'spgi',
  'thoughtspot', 'weir', 'workday',
]

test('known Workday tenants that reject the generic country facet start with India search text', () => {
  for (const source of sourcesRejectingGenericCountryFacet) {
    const config = loadConfig(path.join(testsDir, `../../scraper/${source}.workday`))

    assert.equal(config.locationCountry, null, `${source} must omit the generic country facet`)
    assert.equal(config.searchText, 'India', `${source} must search India from the first request`)
  }
})
