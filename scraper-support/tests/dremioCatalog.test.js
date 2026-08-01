import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/dremio/catalog.js')
  } catch {
    assert.fail('Expected Dremio catalog module at ../../scraper/dremio/catalog.js')
  }
}

const loadDremioModule = async () => {
  try {
    return await import('../../scraper/dremio/script.js')
  } catch {
    assert.fail('Expected Dremio scraper module at ../../scraper/dremio/script.js')
  }
}

test('Dremio local catalog captures the verified first-party careers pages and Greenhouse jobs surface without aliases', async () => {
  const { DREMIO_CATALOG } = await loadCatalogModule()
  const dremio = await loadDremioModule()
  const provider = hydrateProviderCatalogEntry(DREMIO_CATALOG)

  assert.equal(provider.source, 'dremio')
  assert.equal(provider.companyName, 'Dremio')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.modulePath, '../../scraper/dremio/script.js')
  assert.equal(provider.companyCareerPage, 'https://www.dremio.com/careers/job-postings/')
  assert.equal(provider.officialCareersLandingUrl, 'https://www.dremio.com/careers/')
  assert.equal(provider.greenhouseEmbedScriptUrl, 'https://boards.greenhouse.io/embed/job_board/js?for=dremio')
  assert.equal(provider.greenhouseJobsApiUrl, 'https://boards-api.greenhouse.io/v1/boards/dremio/jobs')
  assert.equal(
    provider.sampleJobUrl,
    'https://www.dremio.com/careers/job-postings/?gh_jid=7578193003',
  )
  assert.equal(provider.atsPlatform, 'greenhouse')
  assert.equal(provider.paginationStrategy, 'single-greenhouse-jobs-api-content-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-first-party-job-postings-page+greenhouse-embed-script+greenhouse-jobs-api+first-party-detail-urls',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'dremio.com')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.dremio\.com\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.dremio\.com\/careers\/job-postings\//i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/boards\.greenhouse\.io\/embed\/job_board\/js\?for=dremio/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/boards-api\.greenhouse\.io\/v1\/boards\/dremio\/jobs\?content=true/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /\b6 live roles\b/i)
  assert.match(provider.verifiedSurfaceSummary, /Commercial Account Executive - East/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Dremio'), false)

  assert.equal(dremio.PROVIDER_METADATA.source, DREMIO_CATALOG.source)
  assert.equal(dremio.PROVIDER_METADATA.companyName, DREMIO_CATALOG.companyName)
  assert.equal(dremio.PROVIDER_METADATA.companyCareerPage, DREMIO_CATALOG.companyCareerPage)
  assert.equal(dremio.PROVIDER_METADATA.greenhouseJobsApiUrl, DREMIO_CATALOG.greenhouseJobsApiUrl)
})

test('Dremio backlog row matches directly from local provider metadata without alias churn', async () => {
  const { DREMIO_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Dremio\n',
    catalog: [hydrateProviderCatalogEntry(DREMIO_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dremio', 'dremio', 'Dremio']],
  )
})
