import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const loadProviderContract = async () => {
  try {
    return (await import('../acmesolar/provider.json', { with: { type: 'json' } })).default
  } catch {
    assert.fail('Expected ACME Solar provider contract at ../acmesolar/provider.json')
  }
}

test('ACME Solar provider contract captures the verified official SPA no-public-jobs surface', async () => {
  const providerContract = await loadProviderContract()
  const provider = hydrateProviderCatalogEntry(providerContract)

  assert.equal(provider.source, 'acmesolar')
  assert.equal(provider.companyName, 'ACME Solar')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.acmesolar.in/career')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-openings')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'official-spa-careers-page-plus-career-form-bundle-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-spa+career-form-contact-no-public-listings-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'acmesolar.in')
  assert.equal(provider.verifiedOn, '2026-07-19')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.acmesolar\.in\/career/i)
  assert.match(provider.verifiedSurfaceSummary, /career_form/i)
  assert.match(provider.verifiedSurfaceSummary, /hr@acme\.in/i)
  assert.match(provider.verifiedSurfaceSummary, /no public job listings/i)
  assert.match(provider.modulePath, /acmesolar[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /acmesolar[\\/]jobs\.json$/i)
})

test('ACME Solar provider contract hydrates into company coverage matching', async () => {
  const providerContract = await loadProviderContract()
  const report = generateCompanyCoverageReport({
    csvText: 'ACME Solar\n',
    catalog: [hydrateProviderCatalogEntry(providerContract)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ACME Solar', 'acmesolar', 'ACME Solar']],
  )
})

test('buildScrapers and company coverage resolve ACME Solar from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'acmesolar')
  const scraper = buildScrapers().find((item) => item.name === 'acmesolar')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'ACME Solar')
  assert.equal(provider.companyCareerPage, 'https://www.acmesolar.in/career')
  assert.match(scraper.dryRunFile, /acmesolar[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'ACME Solar\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ACME Solar', 'acmesolar', 'ACME Solar']],
  )
})
