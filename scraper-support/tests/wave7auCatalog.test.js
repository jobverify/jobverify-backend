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

test('Excelra Knowledge Solutions local catalog captures the verified first-party careers cards and Darwinbox apply links', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/excelraknowledgesolutions/catalog.js',
    'EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'excelraknowledgesolutions')
  assert.equal(provider.officialBrandName, 'Excelra')
  assert.equal(provider.homepageUrl, 'https://www.excelra.com/')
  assert.equal(provider.companyCareerPage, 'https://www.excelra.com/careers/')
  assert.equal(provider.careersPortalBaseUrl, 'https://excelra.darwinbox.in/ms/candidatev2/main/careers/')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-darwinbox-job-links')
  assert.equal(provider.paginationStrategy, 'single-first-party-current-openings-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+visible-opening-cards+darwinbox-apply-links+india-location-filter',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Current openings/i)
  assert.match(provider.verifiedSurfaceSummary, /excelra\.darwinbox\.in/i)
  assert.match(provider.verifiedSurfaceSummary, /Hyderabad, India/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Excelra Knowledge Solutions',
    modulePath: path.resolve(currentDir, '../../scraper/excelraknowledgesolutions/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Blazeclan Technologies local catalog captures the verified broken Zoho handoff and fail-closed contract', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/blazeclantechnologies/catalog.js',
    'BLAZECLAN_TECHNOLOGIES_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'blazeclantechnologies')
  assert.equal(provider.officialBrandName, 'Blazeclan')
  assert.equal(provider.homepageUrl, 'https://blazeclan.com/')
  assert.equal(provider.companyCareerPage, 'https://blazeclan.com/work-with-us/')
  assert.equal(provider.brokenBoardUrl, 'https://blazeclan.zohorecruit.in/jobs/Careers')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-broken-zoho-handoff')
  assert.equal(provider.paginationStrategy, 'single-first-party-work-with-us-page-plus-broken-board-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-work-with-us-page+dead-zoho-board-handoff+fail-closed-sentinel',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Current Openings/i)
  assert.match(provider.verifiedSurfaceSummary, /does not exist/i)
  assert.match(provider.verifiedSurfaceSummary, /zohorecruit/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Blazeclan Technologies',
    modulePath: path.resolve(currentDir, '../../scraper/blazeclantechnologies/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Reserve Bank Information Technology local catalog captures the verified join-us page and Darwinbox job-card handoff', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/reservebankinformationtechnology/catalog.js',
    'RESERVE_BANK_INFORMATION_TECHNOLOGY_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'reservebankinformationtechnology')
  assert.equal(provider.officialBrandName, 'ReBIT')
  assert.equal(provider.homepageUrl, 'https://rebit.org.in/')
  assert.equal(provider.companyCareerPage, 'https://rebit.org.in/careers/')
  assert.equal(provider.careersPortalBaseUrl, 'https://rebithr.darwinbox.in/ms/candidate/careers')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-darwinbox-job-links')
  assert.equal(provider.paginationStrategy, 'single-first-party-join-us-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-join-us-page+visible-job-cards+darwinbox-apply-links',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /join-us\.php/i)
  assert.match(provider.verifiedSurfaceSummary, /rebithr\.darwinbox\.in/i)
  assert.match(provider.verifiedSurfaceSummary, /Sr\/Lead Engineer Development- Angular/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Reserve Bank Information Technology',
    modulePath: path.resolve(currentDir, '../../scraper/reservebankinformationtechnology/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Amtex Systems local catalog captures the verified careers shell and non-India detail-page filter contract', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/amtexsystems/catalog.js',
    'AMTEX_SYSTEMS_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'amtexsystems')
  assert.equal(provider.officialBrandName, 'Amtex Systems')
  assert.equal(provider.homepageUrl, 'https://www.amtexsystems.com/')
  assert.equal(provider.companyCareerPage, 'https://www.amtexsystems.com/careers')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-plus-detail-pages')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page-with-real-and-placeholder-cards')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-shell+real-detail-links+placeholder-cards+india-location-filter',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /career-list\/business-analyst/i)
  assert.match(provider.verifiedSurfaceSummary, /href=\"#\" placeholders/i)
  assert.match(provider.verifiedSurfaceSummary, /New York, NY/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Amtex Systems',
    modulePath: path.resolve(currentDir, '../../scraper/amtexsystems/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})

test('Nucsoft local catalog captures the verified current openings cards and first-party opening routes', async () => {
  const { constant, defaultExport } = await loadCatalog(
    '../../scraper/nucsoft/catalog.js',
    'NUCSOFT_CATALOG',
  )
  const provider = hydrateProviderCatalogEntry(constant)

  assert.equal(defaultExport, constant)
  assert.equal(provider.source, 'nucsoft')
  assert.equal(provider.officialBrandName, 'NUCSOFT')
  assert.equal(provider.homepageUrl, 'https://nucsoft.com/')
  assert.equal(provider.companyCareerPage, 'https://nucsoft.com/career-base')
  assert.equal(provider.openingsPageUrl, 'https://nucsoft.com/openings')
  assert.equal(provider.applicationFormUrl, 'https://nucsoft.com/application-form')
  assert.equal(provider.atsPlatform, 'first-party-careers-page-opening-links')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-carousel')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+visible-opening-cards+opening-query-links',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Flutter Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /DBA\/SQL Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /nucsoft\.com\/openings\?job=/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Nucsoft',
    modulePath: path.resolve(currentDir, '../../scraper/nucsoft/script.js'),
  })
  await assertHydratedCatalogLoadsScript(provider)
})
