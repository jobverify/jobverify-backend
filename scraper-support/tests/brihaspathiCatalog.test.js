import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Brihaspathi is registered on the verified first-party careers page and public Strapi API', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'brihaspathi')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Brihaspathi Technologies Limited')
  assert.equal(provider.companyCareerPage, 'https://www.brihaspathi.com/careers')
  assert.equal(provider.atsPlatform, 'first-party-strapi-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'reviewed-native-first-100-ceiling-and-full-closing-snapshot-before-cap')
  assert.equal(
    provider.extractionStrategy,
    'current-native-react-client+public-strapi-role-cards+native-modal-identity',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'brihaspathi.com')
  assert.equal(provider.sourceScopeComplete, false)
  assert.equal(provider.lifecycleCleanupAllowed, false)
  assert.equal(provider.verifiedIndiaJobCount, null)
  assert.match(provider.modulePath, /brihaspathi[\\/]script\.js$/i)
  assert.equal(companyAliases.Brihaspathi, 'brihaspathi')
})

test('Brihaspathi matches company coverage through the explicit CSV alias', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Brihaspathi,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Brihaspathi', 'brihaspathi', 'Brihaspathi Technologies Limited']],
  )
})

test('Brihaspathi is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'brihaspathi')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'brihaspathi')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.brihaspathi.com/careers')
  assert.match(scraper.dryRunFile, /brihaspathi[\\/]jobs\.json$/i)
})
