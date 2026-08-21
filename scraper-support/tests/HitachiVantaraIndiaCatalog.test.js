import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const hitachiVantaraIndiaModulePath = path.resolve(currentDir, '../../scraper/hitachivantaraindia/script.js')
const HITACHI_VANTARA_INDIA_SEARCH_URL =
  'https://careers.hitachi.com/search/hitachi-vantara-india-private-limited/jobs'

const loadHitachiVantaraIndiaCatalog = async () => {
  try {
    return await import('../../scraper/hitachivantaraindia/catalog.js')
  } catch {
    assert.fail('Expected Hitachi Vantara India catalog module at ../../scraper/hitachivantaraindia/catalog.js')
  }
}

test('Hitachi Vantara India local catalog captures the verified first-party Hitachi careers search contract', async () => {
  const { HITACHI_VANTARA_INDIA_CATALOG } = await loadHitachiVantaraIndiaCatalog()
  const provider = hydrateProviderCatalogEntry(HITACHI_VANTARA_INDIA_CATALOG)

  assert.equal(provider.source, 'hitachivantaraindia')
  assert.equal(provider.companyName, 'Hitachi Vantara India')
  assert.equal(provider.officialCompanyLabel, 'HITACHI VANTARA INDIA PRIVATE LIMITED')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, HITACHI_VANTARA_INDIA_SEARCH_URL)
  assert.equal(provider.companyDomain, 'careers.hitachi.com')
  assert.equal(provider.atsPlatform, 'talemetry-careersites+workday-handoff')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-company-filtered-search-page-or-cloudflare-challenge-sentinel',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-search-and-detail-pages-when-accessible+verified-cloudflare-challenge-empty-sentinel',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-08-14')
  assert.equal(provider.modulePath, hitachiVantaraIndiaModulePath)
  assert.match(provider.dryRunFile, /hitachivantaraindia[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /careers\.hitachi\.com\/search\/hitachi-vantara-india-private-limited\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare-managed HTTP 403 challenge pages titled "Just a moment\.\.\."/i)
  assert.match(provider.verifiedSurfaceSummary, /\bIndia 21\b/i)
})

test('Hitachi Vantara India backlog rows resolve from local provider metadata without alias churn', async () => {
  const { HITACHI_VANTARA_INDIA_CATALOG } = await loadHitachiVantaraIndiaCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'Hitachi Vantara India\n',
    catalog: [hydrateProviderCatalogEntry(HITACHI_VANTARA_INDIA_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Hitachi Vantara India', 'hitachivantaraindia', 'Hitachi Vantara India']],
  )
})

test('getScraperCatalog includes Hitachi Vantara India as a verified Hitachi careers provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'hitachivantaraindia')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Hitachi Vantara India')
  assert.equal(
    provider.companyCareerPage,
    'https://careers.hitachi.com/search/hitachi-vantara-india-private-limited/jobs',
  )
  assert.equal(provider.companyDomain, 'careers.hitachi.com')
  assert.equal(provider.atsPlatform, 'talemetry-careersites+workday-handoff')
  assert.equal(
    provider.extractionStrategy,
    'verified-search-and-detail-pages-when-accessible+verified-cloudflare-challenge-empty-sentinel',
  )
  assert.match(provider.modulePath, /hitachivantaraindia[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Hitachi Vantara India scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'hitachivantaraindia')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'hitachivantaraindia')
  assert.equal(scraper.provider.atsPlatform, 'talemetry-careersites+workday-handoff')
  assert.equal(
    scraper.provider.paginationStrategy,
    'verified-company-filtered-search-page-or-cloudflare-challenge-sentinel',
  )
  assert.match(scraper.dryRunFile, /hitachivantaraindia[\\/]jobs\.json$/i)
})
