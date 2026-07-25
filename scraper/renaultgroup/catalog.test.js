import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Renault Group is registered as a verified first-party non-listing careers sentinel', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'renaultgroup')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Renault Group')
  assert.equal(provider.companyCareerPage, 'https://www.renaultgroup.com/en/careers/our-international-vacancies/')
  assert.equal(provider.atsPlatform, 'official-company-careers-nonlisting')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-and-offers-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-careers-page+verified-offers-page-without-public-job-records-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'renaultgroup.com')
  assert.match(provider.modulePath, /renaultgroup[\\/]script\.js$/i)
})

test('Renault Group resolves through company coverage to the exact-name sentinel provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Renault Group,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Renault Group', 'renaultgroup', 'Renault Group']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'renaultgroup')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'renaultgroup')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.renaultgroup.com/en/careers/our-international-vacancies/')
  assert.match(scraper.dryRunFile, /renaultgroup[\\/]jobs\.json$/i)
})
