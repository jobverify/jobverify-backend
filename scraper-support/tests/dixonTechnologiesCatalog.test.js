import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/dixontechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/dixontechnologies/catalog.js')
  } catch {
    assert.fail('Expected Dixon Technologies catalog module at ../../scraper/dixontechnologies/catalog.js')
  }
}

test('Dixon Technologies local catalog captures the verified first-party Darwinbox handoff surface', async () => {
  const { DIXON_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry({
    ...DIXON_TECHNOLOGIES_CATALOG,
    modulePath,
  })

  assert.equal(provider.source, 'dixontechnologies')
  assert.equal(provider.companyName, 'Dixon Technologies')
  assert.equal(provider.officialBrandName, 'Dixon Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.dixoninfo.com/')
  assert.equal(provider.companyCareerPage, 'https://www.dixoninfo.com/job-openings')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://dixon.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(provider.darwinboxOrigin, 'https://dixon.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.companyDomain, 'dixoninfo.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(
    provider.extractionStrategy,
    'official-homepage+official-job-openings-page+darwinbox-listing-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /dixontechnologies[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /July 15, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.dixoninfo\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.dixoninfo\.com\/job-openings/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/dixon\.darwinbox\.in\/ms\/candidate\/careers/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/dixon\.darwinbox\.in\/jobs/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/dixon\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/allJobs/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare/i)
})

test('Dixon Technologies exact backlog name matches directly from local provider metadata without aliases', async () => {
  const { DIXON_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Dixon Technologies\n',
    catalog: [
      hydrateProviderCatalogEntry({
        ...DIXON_TECHNOLOGIES_CATALOG,
        modulePath,
      }),
    ],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dixon Technologies', 'dixontechnologies', 'Dixon Technologies']],
  )
})

test('buildScrapers and company coverage resolve Dixon Technologies from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dixontechnologies')
  const scraper = buildScrapers().find((item) => item.name === 'dixontechnologies')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Dixon Technologies')
  assert.equal(provider.companyCareerPage, 'https://www.dixoninfo.com/job-openings')
  assert.match(scraper.dryRunFile, /dixontechnologies[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Dixon Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dixon Technologies', 'dixontechnologies', 'Dixon Technologies']],
  )
})
