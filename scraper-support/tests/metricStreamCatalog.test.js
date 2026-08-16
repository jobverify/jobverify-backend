import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadMetricStreamCatalog = async () => {
  try {
    return await import('../../scraper/metricstream/catalog.js')
  } catch {
    assert.fail('Expected MetricStream catalog module at ../../scraper/metricstream/catalog.js')
  }
}

test('MetricStream catalog captures the verified first-party SuccessFactors hiring surface', async () => {
  const {
    METRICSTREAM_CATALOG,
    default: defaultCatalog,
  } = await loadMetricStreamCatalog()

  assert.equal(defaultCatalog, METRICSTREAM_CATALOG)
  assert.equal(METRICSTREAM_CATALOG.source, 'metricstream')
  assert.equal(METRICSTREAM_CATALOG.companyName, 'MetricStream')
  assert.equal(METRICSTREAM_CATALOG.officialBrandName, 'MetricStream')
  assert.equal(METRICSTREAM_CATALOG.adapter, 'script')
  assert.equal(METRICSTREAM_CATALOG.homepageUrl, 'https://www.metricstream.com/')
  assert.equal(
    METRICSTREAM_CATALOG.companyCareerPage,
    'https://www.metricstream.com/about-us/careers.htm',
  )
  assert.equal(METRICSTREAM_CATALOG.companyDomain, 'metricstream.com')
  assert.equal(METRICSTREAM_CATALOG.successFactorsCompanyToken, 'metricstre')
  assert.equal(
    METRICSTREAM_CATALOG.successFactorsBoardUrl,
    'https://career5.successfactors.eu/career?company=metricstre',
  )
  assert.equal(
    METRICSTREAM_CATALOG.successFactorsSearchUrl,
    'https://career5.successfactors.eu/career?company=metricstre&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  )
  assert.equal(
    METRICSTREAM_CATALOG.verifiedSampleJobUrl,
    'https://career5.successfactors.eu/career?career_ns=job_listing&company=metricstre&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=3567&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  )
  assert.equal(METRICSTREAM_CATALOG.atsPlatform, 'successfactors')
  assert.equal(METRICSTREAM_CATALOG.countryFilter, 'India')
  assert.equal(METRICSTREAM_CATALOG.paginationStrategy, 'successfactors-dwr-initial-search')
  assert.equal(
    METRICSTREAM_CATALOG.extractionStrategy,
    'verified-first-party-homepage+verified-first-party-careers-page+successfactors-bootstrap+dwr-search-results+india-filter',
  )
  assert.equal(METRICSTREAM_CATALOG.parser, 'custom-script')
  assert.equal(METRICSTREAM_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(METRICSTREAM_CATALOG.verifiedOn, '2026-08-13')
  assert.equal(METRICSTREAM_CATALOG.dryRunFile, 'metricstream/jobs.json')
  assert.match(METRICSTREAM_CATALOG.verifiedSurfaceSummary, /Thursday, August 13, 2026/i)
  assert.match(METRICSTREAM_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.metricstream\.com\//)
  assert.match(METRICSTREAM_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.metricstream\.com\/about-us\/careers\.htm/)
  assert.match(METRICSTREAM_CATALOG.verifiedSurfaceSummary, /https:\/\/career5\.successfactors\.eu\/career\?company=metricstre/)
  assert.match(METRICSTREAM_CATALOG.verifiedSurfaceSummary, /3 public postings/i)
  assert.match(METRICSTREAM_CATALOG.verifiedSurfaceSummary, /outside India/i)
  assert.match(METRICSTREAM_CATALOG.verifiedSurfaceSummary, /3567/i)
  assert.match(METRICSTREAM_CATALOG.modulePath, /metricstream[\\/]script\.js$/i)
})

test('MetricStream backlog matching works directly from the local catalog metadata', async () => {
  const { METRICSTREAM_CATALOG } = await loadMetricStreamCatalog()

  const report = generateCompanyCoverageReport({
    csvText: 'MetricStream,\n',
    catalog: [METRICSTREAM_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['MetricStream', 'metricstream', 'MetricStream']],
  )
})
