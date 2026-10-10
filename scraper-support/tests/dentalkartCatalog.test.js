import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadDentalkartCatalog = async () => {
  try {
    return await import('../../scraper/dentalkart/catalog.js')
  } catch {
    assert.fail('Expected Dentalkart catalog module at ../../scraper/dentalkart/catalog.js')
  }
}

test('Dentalkart catalog captures the verified first-party Zoho active-jobs metadata', async () => {
  const {
    DENTALKART_CATALOG,
    VERIFIED_SURFACE_SUMMARY,
    default: defaultCatalog,
  } = await loadDentalkartCatalog()

  assert.equal(defaultCatalog, DENTALKART_CATALOG)
  assert.equal(DENTALKART_CATALOG.source, 'dentalkart')
  assert.equal(DENTALKART_CATALOG.companyName, 'Dentalkart')
  assert.equal(DENTALKART_CATALOG.adapter, 'script')
  assert.equal(DENTALKART_CATALOG.modulePath, '../../scraper/dentalkart/script.js')
  assert.equal(DENTALKART_CATALOG.companyCareerPage, 'https://www.dentalkart.com/careers')
  assert.equal(DENTALKART_CATALOG.homepageUrl, 'https://www.dentalkart.com/')
  assert.equal(DENTALKART_CATALOG.aboutPageUrl, 'https://www.dentalkart.com/about-us')
  assert.equal(DENTALKART_CATALOG.companyDomain, 'dentalkart.com')
  assert.equal(DENTALKART_CATALOG.atsPlatform, 'zoho-recruit')
  assert.equal(DENTALKART_CATALOG.countryFilter, 'India')
  assert.equal(
    DENTALKART_CATALOG.paginationStrategy,
    'complete-zoho-api-inventory-verified-against-public-portal',
  )
  assert.equal(
    DENTALKART_CATALOG.extractionStrategy,
    'verified-first-party-zoho-handoff+verified-legal-employer+complete-published-unlocked-india-inventory',
  )
  assert.equal(DENTALKART_CATALOG.parser, 'custom-script')
  assert.equal(DENTALKART_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(DENTALKART_CATALOG.verifiedOn, '2026-10-08')
  assert.equal(DENTALKART_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.dentalkart\.com\/\b/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.dentalkart\.com\/about-us\b/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.dentalkart\.com\/careers\b/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /24 published, unlocked India openings/i)
  assert.equal(DENTALKART_CATALOG.legalEmployerName, 'VASA Denticity Limited')
  assert.equal(DENTALKART_CATALOG.officialCareersHandoffUrl, 'https://dentalkart.zohorecruit.in/jobs/Careers')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Dentalkart'), false)
})

test('Dentalkart backlog matching works directly from the local catalog metadata', async () => {
  const { DENTALKART_CATALOG } = await loadDentalkartCatalog()

  const report = generateCompanyCoverageReport({
    csvText: 'Dentalkart\n',
    catalog: [DENTALKART_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dentalkart', 'dentalkart', 'Dentalkart']],
  )
})

test('buildScrapers and company coverage resolve Dentalkart from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dentalkart')
  const scraper = buildScrapers().find((item) => item.name === 'dentalkart')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Dentalkart')
  assert.equal(provider.companyCareerPage, 'https://www.dentalkart.com/careers')
  assert.match(scraper.dryRunFile, /dentalkart[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Dentalkart\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dentalkart', 'dentalkart', 'Dentalkart']],
  )
})
