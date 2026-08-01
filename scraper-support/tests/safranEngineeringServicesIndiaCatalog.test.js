import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Safran Engineering Services India is registered against the verified Safran first-party India jobs surface without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'safranengineeringservicesindia')

  assert.ok(provider, 'Expected Safran Engineering Services India provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Safran Engineering Services India')
  assert.equal(provider.modulePath, '../../scraper/safranengineeringservicesindia/script.js')
  assert.equal(
    provider.companyCareerPage,
    'https://www.safran-group.com/jobs?companies%5B%5D=636-safran-engineering-services&countries%5B%5D=1083-india',
  )
  assert.equal(provider.companyDomain, 'safran-group.com')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-company-page-plus-india-filtered-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-company-page+verified-india-jobs-listing+jobposting-jsonld+first-party-apply-routes',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(
    Object.prototype.hasOwnProperty.call(companyAliases, 'Safran Engineering Services India'),
    false,
  )
})

test('Safran Engineering Services India matches company coverage directly and is runnable via buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Safran Engineering Services India,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[
      'Safran Engineering Services India',
      'safranengineeringservicesindia',
      'Safran Engineering Services India',
    ]],
  )

  const scraper = buildScrapers().find((item) => item.name === 'safranengineeringservicesindia')

  assert.ok(scraper, 'Expected buildScrapers() to return the Safran Engineering Services India scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'safranengineeringservicesindia')
  assert.equal(scraper.provider.adapter, 'script')
  assert.match(scraper.dryRunFile, /safranengineeringservicesindia[\\/]jobs\.json$/i)
})
