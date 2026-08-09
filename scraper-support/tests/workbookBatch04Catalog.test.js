import assert from 'node:assert/strict'
import test from 'node:test'

import workbookAliases from '../providers/companyAliasExtensions/zz-workbook-dedicated.json' with { type: 'json' }
import { generateCompanyCoverageReport, getCompanyAliasMap } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

const VERIFIED_CAREERS_EMPTY_SOURCES = [
  'nomuraindia',
  'openprise',
  'redcliffelabs',
  'securonixindia',
  'skitai',
  'slanglabs',
]
const BATCH_04_PROVIDER_SOURCES = [
  'nectarbits',
  'netmeds',
  'neuralgarage',
  'neuropixel',
  'nomuraindia',
  'openprise',
  'orbo',
  'optymyzeindia',
  'outgrow',
  'panasonicindiadigital',
  'paramai',
  'pebble',
  'photomathindia',
  'piramaleswasthya',
  'piramalpharmadigital',
  'puresoftware',
  'qburstindia',
  'quicko',
  'quiklyz',
  'quicksell',
  'rategain',
  'redcliffelabs',
  'revv',
  'sahamati',
  'sastasundar',
  'scapic',
  'securonixindia',
  'selfscribe',
  'simpliwork',
  'skitai',
  'slanglabs',
  'smartshift',
]
const PROVIDERS_BY_SOURCE = new Map(getScraperCatalog().map((provider) => [provider.source, provider]))
const manifest = {
  batch: '04',
  companies: [
    ...BATCH_04_PROVIDER_SOURCES.map((source) => PROVIDERS_BY_SOURCE.get(source)?.companyName ?? source),
    'Plum',
    'Saarthi AI',
    'Sattva',
  ],
}

test('workbook batch 04 companies all resolve to providers after dedicated aliases load', () => {
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  assert.equal(manifest.batch, '04')
  assert.equal(manifest.companies.length, 35)
  assert.equal(report.matchedCount, manifest.companies.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('workbook batch 04 alias extensions route the known renamed companies to existing providers', () => {
  assert.deepEqual({
    Plum: workbookAliases.Plum,
    'Saarthi AI': workbookAliases['Saarthi AI'],
    Sattva: workbookAliases.Sattva,
  }, {
    Plum: 'plumhq',
    'Saarthi AI': 'saarthi',
    Sattva: 'sattvamedia',
  })
})

test('workbook batch 04 promotes only verified exact-company careers snapshots from the generic sentinel', () => {
  const providers = getScraperCatalog().filter((provider) =>
    VERIFIED_CAREERS_EMPTY_SOURCES.includes(provider.source),
  )

  assert.equal(providers.length, VERIFIED_CAREERS_EMPTY_SOURCES.length)
  assert.deepEqual(
    providers.map((provider) => provider.source).sort(),
    [...VERIFIED_CAREERS_EMPTY_SOURCES].sort(),
  )

  for (const provider of providers) {
    assert.equal(provider.verifiedOn, '2026-07-25')
    assert.equal(provider.verifiedPublicJobCount, 0)
    assert.equal(provider.verifiedIndiaJobCount, 0)
    assert.equal(provider.atsPlatform, 'verified-first-party-careers-empty-result')
    assert.match(provider.modulePath, new RegExp(`${provider.source}[\\\\/]script\\.js$`, 'i'))
  }
})
