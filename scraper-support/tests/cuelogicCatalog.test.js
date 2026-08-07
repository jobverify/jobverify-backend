import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadCuelogicCatalogModule = async () => {
  try {
    return await import('../../scraper/cuelogic/catalog.js')
  } catch {
    assert.fail('Expected Cuelogic catalog module at ../../scraper/cuelogic/catalog.js')
  }
}

test('Cuelogic local catalog pins the August 4, 2026 upstream TLS outage contract', async () => {
  const cuelogicCatalog = await loadCuelogicCatalogModule()

  assert.equal(cuelogicCatalog.CUELOGIC_CATALOG.source, 'cuelogic')
  assert.equal(cuelogicCatalog.CUELOGIC_CATALOG.companyName, 'Cuelogic')
  assert.equal(cuelogicCatalog.CUELOGIC_CATALOG.homepageUrl, 'https://www.ltm.com/careers')
  assert.equal(cuelogicCatalog.CUELOGIC_CATALOG.companyCareerPage, 'https://careers.ltimindtree.com/search/')
  assert.equal(
    cuelogicCatalog.CUELOGIC_CATALOG.verifiedJobsMicrositeUrl,
    'https://careers.ltimindtree.com/Microsite/content/View-Jobs/',
  )
  assert.equal(cuelogicCatalog.CUELOGIC_CATALOG.brokenRedirectHost, 'careers.ltimindtree.com')
  assert.equal(
    cuelogicCatalog.CUELOGIC_CATALOG.brokenRedirectCertificateHost,
    'certificate-not-found.jobs2web.com',
  )
  assert.equal(cuelogicCatalog.CUELOGIC_CATALOG.verifiedOn, '2026-08-04')
  assert.match(cuelogicCatalog.VERIFIED_SURFACE_SUMMARY, /Tuesday, August 4, 2026/i)
  assert.match(cuelogicCatalog.VERIFIED_SURFACE_SUMMARY, /careers\.ltimindtree\.com/i)
  assert.match(cuelogicCatalog.VERIFIED_SURFACE_SUMMARY, /certificate-not-found\.jobs2web\.com/i)
})

test('getScraperCatalog includes Cuelogic as a parent-board empty-search sentinel', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'cuelogic')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Cuelogic')
  assert.equal(provider.companyCareerPage, 'https://careers.ltimindtree.com/search/')
  assert.equal(provider.atsPlatform, 'successfactors-empty-search-sentinel')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-parent-search-query')
  assert.equal(provider.extractionStrategy, 'verified-parent-successfactors-search-empty-state-or-fail-closed-upstream-tls-outage')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.ltimindtree.com')
  assert.match(provider.modulePath, /cuelogic[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Cuelogic rows', () => {
  const scraper = buildScrapers().find((item) => item.name === 'cuelogic')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'cuelogic')
  assert.match(scraper.dryRunFile, /cuelogic[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Cuelogic,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Cuelogic', 'cuelogic', 'Cuelogic']],
  )
})
