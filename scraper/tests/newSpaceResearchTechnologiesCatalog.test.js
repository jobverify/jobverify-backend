import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes New Space Research Technologies as a verified homepage plus public Freshteam provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'newspaceresearchtechnologies')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'New Space Research Technologies')
  assert.equal(provider.modulePath, '../newspaceresearchtechnologies/script.js')
  assert.equal(provider.companyCareerPage, 'https://newspace-talent.freshteam.com/jobs')
  assert.equal(provider.companyDomain, 'newspace.co.in')
  assert.equal(provider.atsPlatform, 'freshteam')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-homepage-plus-public-board')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-public-freshteam-board-metadata+detail-page-apply-surface',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
})

test('New Space Research Technologies matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'New Space Research Technologies,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[
      'New Space Research Technologies',
      'newspaceresearchtechnologies',
      'New Space Research Technologies',
    ]],
  )
})

test('buildScrapers exposes a runnable New Space Research Technologies scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'newspaceresearchtechnologies')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /newspaceresearchtechnologies[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'newspaceresearchtechnologies')
  assert.equal(scraper.provider.adapter, 'script')
  assert.equal(scraper.provider.modulePath, '../newspaceresearchtechnologies/script.js')
  assert.equal(scraper.provider.atsPlatform, 'freshteam')
  assert.equal(scraper.provider.countryFilter, 'India')
  assert.equal(scraper.provider.paginationStrategy, 'verified-homepage-plus-public-board')
  assert.equal(
    scraper.provider.extractionStrategy,
    'verified-official-homepage+verified-public-freshteam-board-metadata+detail-page-apply-surface',
  )
  assert.equal(scraper.provider.parser, 'custom-script')
  assert.equal(scraper.provider.companyCareerPage, 'https://newspace-talent.freshteam.com/jobs')
  assert.equal(scraper.provider.companyDomain, 'newspace.co.in')
})
