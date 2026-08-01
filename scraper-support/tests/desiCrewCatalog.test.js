import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const desiCrewModulePath = path.resolve(currentDir, '../../scraper/desicrew/script.js')

const loadDesiCrewCatalog = async () => {
  try {
    return await import('../../scraper/desicrew/catalog.js')
  } catch {
    assert.fail('Expected Desi Crew catalog module at ../../scraper/desicrew/catalog.js')
  }
}

const loadDesiCrewModule = async () => {
  try {
    return await import('../../scraper/desicrew/script.js')
  } catch {
    assert.fail('Expected Desi Crew scraper module at ../../scraper/desicrew/script.js')
  }
}

test('Desi Crew local catalog captures the verified first-party archive, REST feed, and detail-page apply surface', async () => {
  const { DESI_CREW_CATALOG } = await loadDesiCrewCatalog()
  const desiCrew = await loadDesiCrewModule()

  assert.equal(DESI_CREW_CATALOG.source, 'desicrew')
  assert.equal(DESI_CREW_CATALOG.companyName, 'Desi Crew')
  assert.equal(DESI_CREW_CATALOG.officialBrandName, 'DesiCrew')
  assert.equal(DESI_CREW_CATALOG.adapter, 'script')
  assert.equal(DESI_CREW_CATALOG.homepageUrl, 'https://desicrew.in/')
  assert.equal(DESI_CREW_CATALOG.careersPageUrl, 'https://desicrew.in/about-us/careers/')
  assert.equal(DESI_CREW_CATALOG.companyCareerPage, 'https://desicrew.in/open-job-positions/')
  assert.equal(DESI_CREW_CATALOG.jobsArchiveUrl, 'https://desicrew.in/open-job-positions/')
  assert.equal(
    DESI_CREW_CATALOG.jobsApiUrl,
    'https://desicrew.in/wp-json/wp/v2/open-job-position?per_page=100&_fields=id,date,modified,status,link,title,slug,content,type',
  )
  assert.equal(
    DESI_CREW_CATALOG.sampleJobUrl,
    'https://desicrew.in/open-job-position/qa-delivery-manager/',
  )
  assert.equal(DESI_CREW_CATALOG.companyDomain, 'desicrew.in')
  assert.equal(DESI_CREW_CATALOG.atsPlatform, 'first-party-wordpress-open-job-position')
  assert.equal(DESI_CREW_CATALOG.countryFilter, 'India')
  assert.equal(
    DESI_CREW_CATALOG.paginationStrategy,
    'first-party-open-job-archive-plus-public-rest-endpoint',
  )
  assert.equal(
    DESI_CREW_CATALOG.extractionStrategy,
    'verified-homepage+verified-careers-page+verified-open-job-archive+verified-open-job-rest-api+first-party-detail-pages-with-apply-form',
  )
  assert.equal(DESI_CREW_CATALOG.parser, 'custom-script')
  assert.equal(DESI_CREW_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(DESI_CREW_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(DESI_CREW_CATALOG.dryRunFile, 'desicrew/jobs.json')
  assert.equal(DESI_CREW_CATALOG.modulePath, desiCrewModulePath)
  assert.match(DESI_CREW_CATALOG.verifiedSurfaceSummary, /https:\/\/desicrew\.in\//i)
  assert.match(DESI_CREW_CATALOG.verifiedSurfaceSummary, /https:\/\/desicrew\.in\/about-us\/careers\//i)
  assert.match(DESI_CREW_CATALOG.verifiedSurfaceSummary, /https:\/\/desicrew\.in\/open-job-positions\//i)
  assert.match(
    DESI_CREW_CATALOG.verifiedSurfaceSummary,
    /https:\/\/desicrew\.in\/wp-json\/wp\/v2\/open-job-position\?per_page=100&_fields=id,date,modified,status,link,title,slug,content,type/i,
  )
  assert.match(
    DESI_CREW_CATALOG.verifiedSurfaceSummary,
    /https:\/\/desicrew\.in\/open-job-position\/qa-delivery-manager\//i,
  )
  assert.match(DESI_CREW_CATALOG.verifiedSurfaceSummary, /three live public openings/i)
  assert.match(DESI_CREW_CATALOG.verifiedSurfaceSummary, /apply form/i)

  assert.equal(desiCrew.PROVIDER_METADATA.source, DESI_CREW_CATALOG.source)
  assert.equal(desiCrew.PROVIDER_METADATA.companyName, DESI_CREW_CATALOG.companyName)
  assert.equal(desiCrew.PROVIDER_METADATA.companyCareerPage, DESI_CREW_CATALOG.companyCareerPage)
  assert.equal(desiCrew.PROVIDER_METADATA.jobsApiUrl, DESI_CREW_CATALOG.jobsApiUrl)
})

test('Desi Crew backlog row hydrates locally without needing an alias entry', async () => {
  const { DESI_CREW_CATALOG } = await loadDesiCrewCatalog()
  const provider = hydrateProviderCatalogEntry(DESI_CREW_CATALOG)

  assert.equal(provider.companyName, 'Desi Crew')
  assert.equal(provider.companyDomain, 'desicrew.in')
  assert.match(provider.modulePath, /desicrew[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /desicrew[\\/]jobs\.json$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Desi Crew'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'Desi Crew\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Desi Crew', 'desicrew', 'Desi Crew']],
  )
})

test('buildScrapers and company coverage resolve Desi Crew from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'desicrew')
  const scraper = buildScrapers().find((item) => item.name === 'desicrew')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Desi Crew')
  assert.equal(provider.companyCareerPage, 'https://desicrew.in/open-job-positions/')
  assert.match(scraper.dryRunFile, /desicrew[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Desi Crew\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Desi Crew', 'desicrew', 'Desi Crew']],
  )
})
