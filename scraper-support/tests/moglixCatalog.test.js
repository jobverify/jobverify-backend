import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const moglixModulePath = path.resolve(currentDir, '../../scraper/moglix/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/moglix/catalog.js')
  } catch {
    assert.fail('Expected Moglix catalog module at ../../scraper/moglix/catalog.js')
  }
}

const loadMoglixModule = async () => {
  try {
    return await import('../../scraper/moglix/script.js')
  } catch {
    assert.fail('Expected Moglix scraper module at ../../scraper/moglix/script.js')
  }
}

test('Moglix local catalog captures the verified first-party careers page and encrypted Flexiele jobs API', async () => {
  const { MOGLIX_CATALOG } = await loadCatalogModule()
  const moglix = await loadMoglixModule()
  const provider = hydrateProviderCatalogEntry(MOGLIX_CATALOG)

  assert.equal(provider.source, 'moglix')
  assert.equal(provider.companyName, 'Moglix')
  assert.equal(provider.officialBrandName, 'Moglix')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.moglix.com/career')
  assert.equal(provider.officialJobsBoardUrl, 'https://moglix.flexiele.com/careers/moglix/jobs')
  assert.equal(
    provider.careerSectionConfigurationUrl,
    'https://moglix-api.flexiele.com/api-pub/rec/careerSectionConfiguration/search',
  )
  assert.equal(provider.gridDefinitionUrl, 'https://moglix-api.flexiele.com/grid?gridCode=GRD0000837')
  assert.equal(provider.jobsApiUrl, 'https://moglix-api.flexiele.com/api-pub/rec/careers/list')
  assert.equal(provider.expectedSiteUrl, 'moglix')
  assert.equal(provider.expectedSiteName, 'Moglix Careers')
  assert.equal(provider.expectedGridCode, 'GRD0000837')
  assert.equal(provider.expectedFormCode, 'FRM0001379')
  assert.equal(provider.atsPlatform, 'flexiele-public-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-encrypted-flexiele-public-api-request')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-career-section-configuration+verified-grid-schema+encrypted-jobs-api+job-description-route+apply-route',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'moglix.com')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /moglix[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.moglix\.com\/career/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/moglix\.flexiele\.com\/careers\/moglix\/jobs/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/moglix-api\.flexiele\.com\/api-pub\/rec\/careerSectionConfiguration\/search/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /139 active public India vacancies/i)
  assert.match(provider.verifiedSurfaceSummary, /AM - Finance \( Credlix \)/i)
  assert.match(provider.verifiedSurfaceSummary, /Java Software developer/i)
  assert.equal(provider.modulePath, moglixModulePath)

  assert.equal(moglix.PROVIDER_METADATA.source, MOGLIX_CATALOG.source)
  assert.equal(moglix.PROVIDER_METADATA.companyName, MOGLIX_CATALOG.companyName)
  assert.equal(moglix.PROVIDER_METADATA.jobsApiUrl, MOGLIX_CATALOG.jobsApiUrl)
})

test('Moglix backlog row matches directly from the local catalog without alias changes', async () => {
  const { MOGLIX_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Moglix\n',
    catalog: [hydrateProviderCatalogEntry(MOGLIX_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Moglix', 'moglix', 'Moglix']],
  )
})
