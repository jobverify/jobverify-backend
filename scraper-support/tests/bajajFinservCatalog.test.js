import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/bajajfinserv/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/bajajfinserv/catalog.js')
  } catch {
    assert.fail('Expected Bajaj Finserv catalog module at ../../scraper/bajajfinserv/catalog.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Bajaj Finserv local catalog captures the verified first-party PeopleStrong handoff surface', async () => {
  const { BAJAJ_FINSERV_CATALOG } = await loadCatalogModule()
  const provider = buildCatalogReadyProvider(BAJAJ_FINSERV_CATALOG)

  assert.equal(provider.source, 'bajajfinserv')
  assert.equal(provider.companyName, 'Bajaj Finserv')
  assert.equal(provider.officialBrandName, 'Bajaj Finserv Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.aboutbajajfinserv.com/about-us')
  assert.equal(provider.homepageUrl, 'https://www.bajajfinserv.in/')
  assert.equal(provider.portalOrigin, 'https://bflcareers.peoplestrong.com')
  assert.equal(provider.officialCareersHandoffUrl, 'https://bflcareers.peoplestrong.com/home')
  assert.equal(provider.jobListingsUrl, 'https://bflcareers.peoplestrong.com/')
  assert.equal(
    provider.jobsApiUrl,
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  )
  assert.equal(provider.companyDomain, 'bflcareers.peoplestrong.com')
  assert.equal(provider.atsPlatform, 'peoplestrong')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-bajaj-finserv-homepage-plus-peoplestrong-offset-limit-api',
  )
  assert.equal(
    provider.extractionStrategy,
    'official-bajaj-finserv-homepage+first-party-home-link-to-peoplestrong-home+live-peoplestrong-root-shell+peoplestrong-jobs-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.aboutbajajfinserv\.com\/about-us/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.bajajfinserv\.in\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/bflcareers\.peoplestrong\.com\/home/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/bflcareers\.peoplestrong\.com\//i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/bflcareers\.peoplestrong\.com\/api\/cp\/rest\/altone\/cp\/jobs\/v1\?offset=0&limit=20/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /404 Candidate Portal shell/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /bajajfinserv[\\/]jobs\.json$/i)
})

test('Bajaj Finserv exact backlog name matches from the local provider contract without aliases', async () => {
  const { BAJAJ_FINSERV_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Finserv\n',
    catalog: [buildCatalogReadyProvider(BAJAJ_FINSERV_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bajaj Finserv', 'bajajfinserv', 'Bajaj Finserv']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Bajaj Finserv'), false)
})

test('buildScrapers and company coverage resolve Bajaj Finserv from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bajajfinserv')
  const scraper = buildScrapers().find((item) => item.name === 'bajajfinserv')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Bajaj Finserv')
  assert.equal(provider.companyCareerPage, 'https://www.aboutbajajfinserv.com/')
  assert.match(scraper.dryRunFile, /bajajfinserv[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Finserv\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bajaj Finserv', 'bajajfinserv', 'Bajaj Finserv']],
  )
})
