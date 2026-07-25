import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Koneru Lakshmaiah Education Foundation is registered as a verified first-party careers scraper without aliases', () => {
  const provider = getScraperCatalog().find(
    (item) => item.source === 'konerulakshmaiaheducationfoundation',
  )

  assert.ok(
    provider,
    'Expected Koneru Lakshmaiah Education Foundation provider to be registered in customProviders.json',
  )
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Koneru Lakshmaiah Education Foundation')
  assert.equal(provider.companyCareerPage, 'https://www.kluniversity.in/jobs.aspx')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'homepage-plus-academic-jobs-page-plus-faculty-form-plus-non-teaching-form',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+first-party-academic-disciplines-table+first-party-faculty-form+first-party-non-teaching-roles-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'kluniversity.in')
  assert.match(provider.modulePath, /konerulakshmaiaheducationfoundation[\\/]script\.js$/i)
  assert.equal(
    Object.prototype.hasOwnProperty.call(companyAliases, 'Koneru Lakshmaiah Education Foundation'),
    false,
  )
})

test('Koneru Lakshmaiah Education Foundation matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Koneru Lakshmaiah Education Foundation,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      [
        'Koneru Lakshmaiah Education Foundation',
        'konerulakshmaiaheducationfoundation',
        'Koneru Lakshmaiah Education Foundation',
      ],
    ],
  )
})

test('Koneru Lakshmaiah Education Foundation is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'konerulakshmaiaheducationfoundation')

  assert.ok(
    scraper,
    'Expected buildScrapers() to return the Koneru Lakshmaiah Education Foundation scraper',
  )
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'konerulakshmaiaheducationfoundation')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.kluniversity.in/jobs.aspx')
  assert.match(
    scraper.dryRunFile,
    /konerulakshmaiaheducationfoundation[\\/]jobs\.json$/i,
  )
})
