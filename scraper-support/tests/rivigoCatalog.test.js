import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const rivigoModulePath = path.resolve(currentDir, '../../scraper/rivigo/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/rivigo/catalog.js')
  } catch {
    assert.fail('Expected Rivigo catalog module at ../../scraper/rivigo/catalog.js')
  }
}

const loadRivigoModule = async () => {
  try {
    return await import('../../scraper/rivigo/script.js')
  } catch {
    assert.fail('Expected Rivigo scraper module at ../../scraper/rivigo/script.js')
  }
}

test('Rivigo local catalog captures the verified empty-board first-party careers contract', async () => {
  const { RIVIGO_CATALOG } = await loadCatalogModule()
  const rivigo = await loadRivigoModule()
  const provider = hydrateProviderCatalogEntry(RIVIGO_CATALOG)

  assert.equal(provider.source, 'rivigo')
  assert.equal(provider.companyName, 'Rivigo')
  assert.equal(provider.officialBrandName, 'Rivigo')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.rivigo.com/')
  assert.equal(provider.companyCareerPage, 'https://careers-rivigo.flexiele.com/')
  assert.equal(provider.officialFirstPartyJobsUrl, 'https://careers-rivigo.flexiele.com/')
  assert.equal(provider.companyDomain, 'rivigo.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-no-trustworthy-public-jobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-empty-board-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-empty-careers-board-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.equal(provider.modulePath, rivigoModulePath)
  assert.match(provider.dryRunFile, /rivigo[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers-rivigo\.flexiele\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /No Requsitions Found/i)
  assert.match(provider.verifiedSurfaceSummary, /Job Openings 0 - 0 of 0/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)

  assert.equal(rivigo.PROVIDER_METADATA.source, RIVIGO_CATALOG.source)
  assert.equal(
    rivigo.PROVIDER_METADATA.officialFirstPartyJobsUrl,
    RIVIGO_CATALOG.officialFirstPartyJobsUrl,
  )
})

test('Rivigo exact backlog row matches directly from the local catalog without aliases', async () => {
  const { RIVIGO_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Rivigo\n',
    catalog: [hydrateProviderCatalogEntry(RIVIGO_CATALOG)],
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Rivigo', 'rivigo', 'Rivigo']],
  )
})
