import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../imarticuslearning/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../imarticuslearning/catalog.js')
  } catch {
    assert.fail('Expected Imarticus Learning catalog module at ../imarticuslearning/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../imarticuslearning/script.js')
  } catch {
    assert.fail('Expected Imarticus Learning scraper module at ../imarticuslearning/script.js')
  }
}

test('Imarticus Learning local catalog captures the verified first-party career-services-only sentinel contract', async () => {
  const { IMARTICUS_LEARNING_CATALOG } = await loadCatalogModule()
  const imarticusLearning = await loadScriptModule()

  assert.equal(IMARTICUS_LEARNING_CATALOG.source, 'imarticuslearning')
  assert.equal(IMARTICUS_LEARNING_CATALOG.companyName, 'Imarticus Learning')
  assert.equal(IMARTICUS_LEARNING_CATALOG.officialBrandName, 'Imarticus Learning')
  assert.equal(IMARTICUS_LEARNING_CATALOG.adapter, 'script')
  assert.equal(IMARTICUS_LEARNING_CATALOG.homepageUrl, 'https://imarticus.org/')
  assert.equal(IMARTICUS_LEARNING_CATALOG.companyCareerPage, 'https://imarticus.org/careers/')
  assert.equal(
    IMARTICUS_LEARNING_CATALOG.canonicalCareerServicesPage,
    'https://imarticus.org/building-careers-of-the-future-with-imarticus-rise/',
  )
  assert.equal(IMARTICUS_LEARNING_CATALOG.companyDomain, 'imarticus.org')
  assert.equal(IMARTICUS_LEARNING_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(IMARTICUS_LEARNING_CATALOG.countryFilter, 'India')
  assert.equal(
    IMARTICUS_LEARNING_CATALOG.paginationStrategy,
    'verified-homepage-plus-career-services-page-validation',
  )
  assert.equal(
    IMARTICUS_LEARNING_CATALOG.extractionStrategy,
    'verified-homepage+verified-career-services-page-without-public-employer-listings-return-empty',
  )
  assert.equal(IMARTICUS_LEARNING_CATALOG.parser, 'custom-script')
  assert.equal(IMARTICUS_LEARNING_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(IMARTICUS_LEARNING_CATALOG.verifiedOn, '2026-07-16')
  assert.match(IMARTICUS_LEARNING_CATALOG.verifiedSurfaceSummary, /careers at imarticus/i)
  assert.match(IMARTICUS_LEARNING_CATALOG.verifiedSurfaceSummary, /imarticus rise/i)
  assert.match(IMARTICUS_LEARNING_CATALOG.verifiedSurfaceSummary, /no trustworthy public employer job listings/i)
  assert.equal(IMARTICUS_LEARNING_CATALOG.modulePath, modulePath)
  assert.match(IMARTICUS_LEARNING_CATALOG.dryRunFile, /imarticuslearning[\\/]jobs\.json$/i)

  assert.equal(imarticusLearning.PROVIDER_METADATA.source, IMARTICUS_LEARNING_CATALOG.source)
  assert.equal(
    imarticusLearning.PROVIDER_METADATA.companyCareerPage,
    IMARTICUS_LEARNING_CATALOG.companyCareerPage,
  )
  assert.equal(
    imarticusLearning.PROVIDER_METADATA.canonicalCareerServicesPage,
    IMARTICUS_LEARNING_CATALOG.canonicalCareerServicesPage,
  )
})

test('Imarticus Learning exact-name backlog rows resolve directly from local provider metadata without aliases', async () => {
  const { IMARTICUS_LEARNING_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Imarticus Learning\n',
    catalog: [IMARTICUS_LEARNING_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Imarticus Learning', 'imarticuslearning', 'Imarticus Learning']],
  )
})

test('getScraperCatalog includes Imarticus Learning as a verified career-services sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'imarticuslearning')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Imarticus Learning')
  assert.equal(provider.companyCareerPage, 'https://imarticus.org/careers/')
  assert.equal(provider.companyDomain, 'imarticus.org')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.match(provider.modulePath, /imarticuslearning[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Imarticus Learning scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'imarticuslearning')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'imarticuslearning')
  assert.equal(scraper.provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.match(scraper.dryRunFile, /imarticuslearning[\\/]jobs\.json$/i)
})
