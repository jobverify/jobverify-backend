import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadCatalogModule = async () => {
  try {
    return await import('../kekatechnologies/catalog.js')
  } catch {
    assert.fail('Expected KEKA TECHNOLOGIES catalog module at ../kekatechnologies/catalog.js')
  }
}

test('KEKA TECHNOLOGIES catalog captures the verified first-party Keka role pages', async () => {
  const {
    KEKA_TECHNOLOGIES_CATALOG,
    default: defaultCatalog,
  } = await loadCatalogModule()

  assert.equal(defaultCatalog, KEKA_TECHNOLOGIES_CATALOG)
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.source, 'kekatechnologies')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.companyName, 'KEKA TECHNOLOGIES')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.officialBrandName, 'Keka Technologies Private Limited')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.adapter, 'script')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.companyCareerPage, 'https://www.keka.com/careers')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.companyDomain, 'keka.com')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.atsPlatform, 'first-party-role-pages-plus-keka-apply-links')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.countryFilter, 'India')
  assert.equal(
    KEKA_TECHNOLOGIES_CATALOG.paginationStrategy,
    'verified-careers-landing-plus-curated-first-party-role-pages',
  )
  assert.equal(
    KEKA_TECHNOLOGIES_CATALOG.extractionStrategy,
    'verified-careers-landing+verified-first-party-role-pages+hr-keka-apply-links',
  )
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.parser, 'custom-script')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(KEKA_TECHNOLOGIES_CATALOG.verifiedOn, '2026-07-18')
  assert.deepEqual(KEKA_TECHNOLOGIES_CATALOG.verifiedRolePageUrls, [
    'https://www.keka.com/careers/product-manager',
    'https://www.keka.com/careers/design-roles',
    'https://www.keka.com/marketing-roles',
  ])
  assert.match(KEKA_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /Associate Product Manager/i)
  assert.match(KEKA_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /Manager Product Designer/i)
  assert.match(KEKA_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary, /Growth Marketer/i)
  assert.match(KEKA_TECHNOLOGIES_CATALOG.modulePath, /kekatechnologies[\\/]script\.js$/i)
})

test('KEKA TECHNOLOGIES backlog matching works from the local catalog metadata', async () => {
  const { KEKA_TECHNOLOGIES_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'KEKA TECHNOLOGIES\n',
    catalog: [KEKA_TECHNOLOGIES_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['KEKA TECHNOLOGIES', 'kekatechnologies', 'KEKA TECHNOLOGIES']],
  )
})
