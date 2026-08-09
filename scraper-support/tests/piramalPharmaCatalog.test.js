import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/piramalpharma.workday/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/piramalpharma.workday/catalog.js')
  } catch {
    assert.fail('Expected Piramal Pharma catalog module at ../../scraper/piramalpharma.workday/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/piramalpharma.workday/script.js')
  } catch {
    assert.fail('Expected Piramal Pharma scraper module at ../../scraper/piramalpharma.workday/script.js')
  }
}

test('Piramal Pharma local catalog captures the verified first-party careers handoff and public Workday India facet surface', async () => {
  const { PIRAMAL_PHARMA_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const piramalPharma = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(PIRAMAL_PHARMA_CATALOG)

  assert.equal(defaultCatalog, PIRAMAL_PHARMA_CATALOG)
  assert.equal(provider.source, 'piramalpharma')
  assert.equal(provider.companyName, 'Piramal Pharma')
  assert.equal(provider.officialBrandName, 'Piramal Pharma Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.piramalpharma.com/careers')
  assert.equal(provider.officialCareersPageUrl, 'https://www.piramalpharma.com/careers')
  assert.equal(
    provider.officialWorkdayBoardUrl,
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS',
  )
  assert.equal(
    provider.jobsApiUrl,
    'https://piramalpharma.wd102.myworkdayjobs.com/wday/cxs/piramalpharma/PIRAMAL_EXTERNAL_CAREERS/jobs',
  )
  assert.equal(
    provider.verifiedIndiaCountryFacetId,
    'c4f78be1a8f14da0ab49ce1162348a5e',
  )
  assert.equal(
    provider.verifiedIndiaJobUrl,
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427',
  )
  assert.equal(
    provider.verifiedIndiaApplyUrl,
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427/apply',
  )
  assert.equal(provider.companyDomain, 'piramalpharma.com')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-first-party-careers-handoff-plus-workday-country-facet',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-page+verified-workday-board+unfiltered-workday-jobs-api+india-country-facet+filtered-workday-jobs-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /piramalpharma.workday[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.piramalpharma\.com\/careers/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/piramalpharma\.wd102\.myworkdayjobs\.com\/PIRAMAL_EXTERNAL_CAREERS/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/piramalpharma\.wd102\.myworkdayjobs\.com\/wday\/cxs\/piramalpharma\/PIRAMAL_EXTERNAL_CAREERS\/jobs/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /\b195\b/i)
  assert.match(provider.verifiedSurfaceSummary, /Executive - Production/i)
  assert.match(provider.verifiedSurfaceSummary, /Deputy Manager - Utility/i)
  assert.match(provider.verifiedSurfaceSummary, /India country facet/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Piramal Pharma'), false)

  assert.equal(piramalPharma.PROVIDER_METADATA.source, PIRAMAL_PHARMA_CATALOG.source)
  assert.equal(
    piramalPharma.PROVIDER_METADATA.companyName,
    PIRAMAL_PHARMA_CATALOG.companyName,
  )
  assert.equal(piramalPharma.PROVIDER_METADATA.jobsApiUrl, PIRAMAL_PHARMA_CATALOG.jobsApiUrl)
})

test('Piramal Pharma exact backlog row matches directly from local provider metadata', async () => {
  const { PIRAMAL_PHARMA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Piramal Pharma\n',
    catalog: [hydrateProviderCatalogEntry(PIRAMAL_PHARMA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Piramal Pharma', 'piramalpharma', 'Piramal Pharma']],
  )
})

test('getScraperCatalog exposes Piramal Pharma as a runnable shared provider without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'piramalpharma')
  const scraper = buildScrapers().find((item) => item.name === 'piramalpharma')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Piramal Pharma')
  assert.equal(provider.companyCareerPage, 'https://www.piramalpharma.com/careers')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Piramal Pharma'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'Piramal Pharma\n',
    catalog: getScraperCatalog(),
    aliasMap: companyAliases,
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Piramal Pharma', 'piramalpharma', 'Piramal Pharma']],
  )
})

test('Piramal Pharma hydrated local catalog stays script-runner compatible for shared registry integration', async () => {
  const { PIRAMAL_PHARMA_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(PIRAMAL_PHARMA_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Piramal Pharma')
  assert.equal(provider.companyCareerPage, 'https://www.piramalpharma.com/careers')
  assert.equal(provider.companyDomain, 'piramalpharma.com')
  assert.equal(provider.atsPlatform, 'workday')
  assert.match(provider.modulePath, /piramalpharma\.workday[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /piramalpharma.workday[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
