import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const indiagoldModulePath = path.resolve(currentDir, '../indiagold/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../indiagold/catalog.js')
  } catch {
    assert.fail('Expected Indiagold catalog module at ../indiagold/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../indiagold/script.js')
  } catch {
    assert.fail('Expected Indiagold scraper module at ../indiagold/script.js')
  }
}

test('Indiagold local catalog captures the verified first-party Zoho Recruit contract', async () => {
  const { INDIAGOLD_CATALOG } = await loadCatalogModule()
  const indiagold = await loadScriptModule()

  assert.equal(INDIAGOLD_CATALOG.source, 'indiagold')
  assert.equal(INDIAGOLD_CATALOG.companyName, 'Indiagold')
  assert.equal(INDIAGOLD_CATALOG.officialBrandName, 'indiagold')
  assert.equal(INDIAGOLD_CATALOG.adapter, 'script')
  assert.equal(INDIAGOLD_CATALOG.companyCareerPage, 'https://indiagold.co/join-us')
  assert.equal(INDIAGOLD_CATALOG.homepageUrl, 'https://indiagold.co/')
  assert.equal(INDIAGOLD_CATALOG.careersApiUrl, 'https://indiagold.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite&extra_fields=%5B%22State%22%2C%22Salary%22%2C%22Industry%22%5D')
  assert.equal(INDIAGOLD_CATALOG.generalApplicationFormUrl, 'https://indiagold.zohorecruit.in/forms/38b7f90a5d50181c7e90b5fb206f7906c671dc7d5b1e459876d880446809e996')
  assert.equal(INDIAGOLD_CATALOG.companyDomain, 'indiagold.co')
  assert.equal(INDIAGOLD_CATALOG.atsPlatform, 'zohorecruit')
  assert.equal(INDIAGOLD_CATALOG.countryFilter, 'India')
  assert.equal(
    INDIAGOLD_CATALOG.paginationStrategy,
    'single-public-api-request',
  )
  assert.equal(
    INDIAGOLD_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+public-zohorecruit-job-openings-api',
  )
  assert.equal(INDIAGOLD_CATALOG.parser, 'custom-script')
  assert.equal(INDIAGOLD_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INDIAGOLD_CATALOG.dryRunFile, 'indiagold/jobs.json')
  assert.equal(INDIAGOLD_CATALOG.verifiedOn, '2026-07-16')
  assert.match(INDIAGOLD_CATALOG.verifiedSurfaceSummary, /https:\/\/indiagold\.co\/join-us/i)
  assert.match(INDIAGOLD_CATALOG.verifiedSurfaceSummary, /indiagold\.zohorecruit\.in/i)
  assert.match(INDIAGOLD_CATALOG.verifiedSurfaceSummary, /public jobs surface/i)
  assert.equal(INDIAGOLD_CATALOG.modulePath, indiagoldModulePath)

  assert.equal(indiagold.PROVIDER_METADATA.source, INDIAGOLD_CATALOG.source)
  assert.equal(indiagold.PROVIDER_METADATA.companyCareerPage, INDIAGOLD_CATALOG.companyCareerPage)
})

test('Indiagold exact-name backlog rows resolve from local provider metadata without aliases', async () => {
  const { INDIAGOLD_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Indiagold\n',
    catalog: [INDIAGOLD_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Indiagold', 'indiagold', 'Indiagold']],
  )
})

test('getScraperCatalog includes Indiagold as a verified Zoho Recruit provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'indiagold')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Indiagold')
  assert.equal(provider.companyCareerPage, 'https://indiagold.co/join-us')
  assert.equal(provider.companyDomain, 'indiagold.co')
  assert.equal(provider.atsPlatform, 'zohorecruit')
  assert.match(provider.modulePath, /indiagold[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Indiagold scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'indiagold')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'indiagold')
  assert.equal(scraper.provider.atsPlatform, 'zohorecruit')
  assert.match(scraper.dryRunFile, /indiagold[\\/]jobs\.json$/i)
})
