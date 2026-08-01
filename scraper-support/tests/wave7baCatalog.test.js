import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const loadCatalog = async (relativePath, constantName) => {
  try {
    const module = await import(relativePath)
    return {
      constant: module[constantName],
      defaultExport: module.default,
    }
  } catch {
    assert.fail(`Expected catalog module at ${relativePath}`)
  }
}

const assertCatalogMatchesBacklogRow = ({ provider, companyName, modulePath }) => {
  assert.equal(provider.companyName, companyName)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.modulePath, modulePath)

  const report = generateCompanyCoverageReport({
    csvText: `${companyName}\n`,
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
}

const assertHydratedCatalogLoadsScript = async (provider) => {
  const module = await import(pathToFileURL(provider.modulePath).href)
  assert.equal(typeof module.run, 'function')
}

test('Novigo Solutions local catalog captures the verified first-party careers page with visible inline roles', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/novigosolutions/catalog.js',
    'NOVIGO_SOLUTIONS_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'novigosolutions')
  assert.equal(provider.officialBrandName, 'Novigo Solutions')
  assert.equal(provider.homepageUrl, 'https://www.novigosolutions.com/')
  assert.equal(provider.companyCareerPage, 'https://www.novigosolutions.com/careers-life-at-novigo')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-inline-role-list')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+visible-inline-role-sections+same-page-apply-form',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /\.Net Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /Angular Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /Bangalore \/ Mangalore \/ Remote work during Pandemic/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Novigo Solutions',
    modulePath: path.resolve(currentDir, '../../scraper/novigosolutions/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Applied Cloud Computing local catalog captures the verified exact-name SmartRecruiters board and API contract', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/appliedcloudcomputing/catalog.js',
    'APPLIED_CLOUD_COMPUTING_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'appliedcloudcomputing')
  assert.equal(provider.officialBrandName, 'Applied Cloud Computing')
  assert.equal(provider.homepageUrl, 'https://www.appliedcloudcomputing.com/')
  assert.equal(provider.companyCareerPage, 'https://careers.smartrecruiters.com/AppliedCloudComputing')
  assert.equal(provider.boardUrl, 'https://careers.smartrecruiters.com/AppliedCloudComputing')
  assert.equal(provider.atsPlatform, 'smartrecruiters')
  assert.equal(provider.paginationStrategy, 'exact-name-smartrecruiters-board-plus-api')
  assert.equal(
    provider.extractionStrategy,
    'verified-exact-name-smartrecruiters-board+official-homepage-link+smartrecruiters-jobs-api+detail-api',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Cloud Operations Engineer \(GCP & Kubernetes\)/i)
  assert.match(provider.verifiedSurfaceSummary, /L3 Cloud Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /appliedcloudcomputing\.com/i)
  assert.match(provider.config.discovery.listingApiUrl, /api\.smartrecruiters\.com\/v1\/companies\/AppliedCloudComputing\/postings/i)
  assert.match(provider.config.detail.urlTemplate, /api\.smartrecruiters\.com\/v1\/companies\/AppliedCloudComputing\/postings\/\{\{jobId\}\}/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Applied Cloud Computing',
    modulePath: path.resolve(currentDir, '../../scraper/appliedcloudcomputing/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Mobiloitte Technologies local catalog captures the verified first-party careers empty-state contract', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/mobiloittetechnologies/catalog.js',
    'MOBILOITTE_TECHNOLOGIES_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'mobiloittetechnologies')
  assert.equal(provider.officialBrandName, 'Mobiloitte')
  assert.equal(provider.homepageUrl, 'https://www.mobiloitte.com/')
  assert.equal(provider.companyCareerPage, 'https://www.mobiloitte.com/careers')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-empty-search-state')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page-empty-filter-state')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+no-jobs-found-state+resume-drop-fallback',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /No Jobs Found/i)
  assert.match(provider.verifiedSurfaceSummary, /Send Your Resume/i)
  assert.match(provider.verifiedSurfaceSummary, /careers@mobiloitte\.com/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Mobiloitte Technologies',
    modulePath: path.resolve(currentDir, '../../scraper/mobiloittetechnologies/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Competent Software local catalog captures the verified first-party careers no-open-positions note', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/competentsoftware/catalog.js',
    'COMPETENT_SOFTWARE_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'competentsoftware')
  assert.equal(provider.officialBrandName, 'Competent Software')
  assert.equal(provider.homepageUrl, 'https://competentsoftware.com/')
  assert.equal(provider.companyCareerPage, 'https://competentsoftware.com/careers')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-no-open-positions-note')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+explicit-no-open-positions-note+resume-form-fail-closed',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Process Associate/i)
  assert.match(provider.verifiedSurfaceSummary, /Currently there are no open positions/i)
  assert.match(provider.verifiedSurfaceSummary, /careers@competentsoftware\.com/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Competent Software',
    modulePath: path.resolve(currentDir, '../../scraper/competentsoftware/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Vserve Ebusiness Solutions local catalog captures the verified homepage contact contract and fail-closed job-inquiry email', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/vserveebusinesssolutions/catalog.js',
    'VSERVE_EBUSINESS_SOLUTIONS_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'vserveebusinesssolutions')
  assert.equal(provider.officialBrandName, 'Vserve eBusiness Solutions')
  assert.equal(provider.homepageUrl, 'https://vservesolution.com/')
  assert.equal(provider.companyCareerPage, 'https://vservesolution.com/')
  assert.equal(provider.atsPlatform, 'first-party-homepage-job-inquiry-email')
  assert.equal(provider.paginationStrategy, 'homepage-contact-section-only')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+job-inquiry-email+no-public-openings-surface+fail-closed-sentinel',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /99 Wall Street #625/i)
  assert.match(provider.verifiedSurfaceSummary, /jobopenings@vservesolution\.com/i)
  assert.match(provider.verifiedSurfaceSummary, /no public careers page or openings list/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Vserve Ebusiness Solutions',
    modulePath: path.resolve(currentDir, '../../scraper/vserveebusinesssolutions/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})
