import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/gokwik/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/gokwik/catalog.js')
  } catch {
    assert.fail('Expected GoKwik catalog module at ../../scraper/gokwik/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/gokwik/script.js')
  } catch {
    assert.fail('Expected GoKwik scraper module at ../../scraper/gokwik/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('GoKwik local catalog captures the verified first-party careers handoff and public Keka board contract', async () => {
  const { GOKWIK_CATALOG } = await loadCatalogModule()
  const gokwik = await loadScraperModule()
  const provider = buildCatalogReadyProvider(GOKWIK_CATALOG)

  assert.equal(provider.source, 'gokwik')
  assert.equal(provider.companyName, 'GoKwik')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.gokwik.co/')
  assert.equal(provider.companyAboutPage, 'https://www.gokwik.co/about?_gc=1')
  assert.equal(provider.companyCareerPage, 'https://gokwik.keka.com/careers')
  assert.equal(
    provider.careerPortalInfoUrl,
    'https://gokwik.keka.com/careers/api/organization/default/careerportalinfo',
  )
  assert.equal(
    provider.activeJobsUrl,
    'https://gokwik.keka.com/careers/api/embedjobs/default/active/19d678f6-8b79-4532-a5f0-d57b593a822e',
  )
  assert.equal(
    provider.departmentsUrl,
    'https://gokwik.keka.com/careers/api/embedjobs/departments/19d678f6-8b79-4532-a5f0-d57b593a822e',
  )
  assert.equal(provider.companyDomain, 'gokwik.co')
  assert.equal(provider.atsPlatform, 'keka-embed-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-first-party-about-page-plus-keka-active-jobs-endpoints',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-about-page+verified-keka-careers-link+careerportalinfo+active-keka-embed-api+departments+jobdetails+applyjob',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.gokwik\.co\/about\?_gc=1/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/gokwik\.keka\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /careerportalinfo/i)
  assert.match(provider.verifiedSurfaceSummary, /active public India jobs/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /gokwik[\\/]jobs\.json$/i)

  assert.equal(gokwik.PROVIDER_METADATA.source, provider.source)
  assert.equal(gokwik.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(gokwik.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
})

test('GoKwik exact backlog row resolves from the local provider contract without aliases', async () => {
  const { GOKWIK_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'GoKwik\n',
    catalog: [buildCatalogReadyProvider(GOKWIK_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['GoKwik', 'gokwik', 'GoKwik']],
  )
})

test('getScraperCatalog includes GoKwik as a verified Keka-backed provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'gokwik')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'GoKwik')
  assert.equal(provider.companyCareerPage, 'https://gokwik.keka.com/careers')
  assert.equal(provider.companyDomain, 'gokwik.co')
  assert.equal(provider.atsPlatform, 'keka-embed-api')
  assert.match(provider.modulePath, /gokwik[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable GoKwik scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'gokwik')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'gokwik')
  assert.equal(scraper.provider.atsPlatform, 'keka-embed-api')
  assert.match(scraper.dryRunFile, /gokwik[\\/]jobs\.json$/i)
})
