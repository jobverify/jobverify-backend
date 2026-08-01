import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/sonablwprecision/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/sonablwprecision/catalog.js')
  } catch {
    assert.fail('Expected Sona BLW Precision catalog module at ../../scraper/sonablwprecision/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/sonablwprecision/script.js')
  } catch {
    assert.fail('Expected Sona BLW Precision scraper module at ../../scraper/sonablwprecision/script.js')
  }
}

test('Sona BLW Precision local catalog captures the verified resume-upload sentinel contract', async () => {
  const { SONA_BLW_PRECISION_CATALOG } = await loadCatalogModule()
  const sonaBlwPrecision = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(SONA_BLW_PRECISION_CATALOG)

  assert.equal(provider.source, 'sonablwprecision')
  assert.equal(provider.companyName, 'Sona BLW Precision')
  assert.equal(
    provider.officialBrandName,
    'Sona BLW Precision Forgings Limited (Sona Comstar)',
  )
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://sonacomstar.com/career')
  assert.equal(provider.officialCompanyPageUrl, 'https://sonacomstar.com/pages/about-us')
  assert.equal(provider.officialCulturePageUrl, 'https://sonacomstar.com/our-culture')
  assert.equal(
    provider.cautionNoticeUrl,
    'https://api.procuzy.com/sonacomstar/public/pdf/cautionary_notice_against_fake_employment_or_offers_etc.pdf',
  )
  assert.equal(provider.companyDomain, 'sonacomstar.com')
  assert.equal(provider.atsPlatform, 'official-company-site-resume-upload-no-public-jobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-career-page-plus-legal-entity-footer-checks',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-career-page+footer-legal-entity+cautionary-notice-no-public-jobs-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /sonablwprecision[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/sonacomstar\.com\/career/i)
  assert.match(provider.verifiedSurfaceSummary, /Upload Resume/i)
  assert.match(provider.verifiedSurfaceSummary, /Sona BLW Precision Forgings Limited/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)

  assert.equal(sonaBlwPrecision.PROVIDER_METADATA.source, SONA_BLW_PRECISION_CATALOG.source)
  assert.equal(sonaBlwPrecision.CAREER_PAGE_URL, SONA_BLW_PRECISION_CATALOG.companyCareerPage)
  assert.equal(sonaBlwPrecision.ABOUT_PAGE_URL, SONA_BLW_PRECISION_CATALOG.officialCompanyPageUrl)
})

test('Sona BLW Precision exact-name backlog rows resolve directly from the local catalog without aliases', async () => {
  const { SONA_BLW_PRECISION_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Sona BLW Precision\n',
    catalog: [hydrateProviderCatalogEntry(SONA_BLW_PRECISION_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sona BLW Precision', 'sonablwprecision', 'Sona BLW Precision']],
  )
})
