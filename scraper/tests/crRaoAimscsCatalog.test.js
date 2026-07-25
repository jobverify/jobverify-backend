import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('CR Rao AIMSCS is registered as a verified first-party careers-page scraper without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'crraoaimscs')

  assert.ok(provider, 'Expected CR Rao AIMSCS provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)')
  assert.equal(provider.companyCareerPage, 'https://crraoaimscs.res.in/careers.php')
  assert.equal(provider.atsPlatform, 'official-institute-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-first-party-careers-page+inline-recruitment-tables+advertisement-and-application-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'crraoaimscs.res.in')
  assert.match(provider.modulePath, /crraoaimscs[\\/]script\.js$/i)
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      companyAliases,
      'CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)',
    ),
    false,
  )
})

test('CR Rao AIMSCS matches company coverage directly from provider metadata and is runnable via buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS),\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[
      'CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)',
      'crraoaimscs',
      'CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)',
    ]],
  )

  const scraper = buildScrapers().find((item) => item.name === 'crraoaimscs')
  assert.ok(scraper, 'Expected buildScrapers() to return the CR Rao AIMSCS scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'crraoaimscs')
  assert.equal(scraper.provider.companyCareerPage, 'https://crraoaimscs.res.in/careers.php')
  assert.match(scraper.dryRunFile, /crraoaimscs[\\/]jobs\.json$/i)
})
