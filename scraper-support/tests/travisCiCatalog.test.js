import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/travisci/catalog.js')
  } catch {
    assert.fail('Expected Travis CI catalog module at ../../scraper/travisci/catalog.js')
  }
}

test('Travis CI exact CSV name resolves to the verified Workable handoff provider', async () => {
  const { TRAVISCI_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = getScraperCatalog().find((item) => item.source === 'travisci')

  assert.equal(defaultCatalog, TRAVISCI_CATALOG)
  assert.ok(provider)
  assert.equal(provider.companyName, 'Travis CI')
  assert.equal(provider.officialBrandName, 'Travis CI')
  assert.equal(provider.homepageUrl, 'https://www.travis-ci.com/')
  assert.equal(provider.aboutPageUrl, 'https://www.travis-ci.com/about-us/')
  assert.equal(provider.imprintPageUrl, 'https://docs.travis-ci.com/imprint.html')
  assert.equal(provider.companyCareerPage, 'https://apply.workable.com/travisci/')
  assert.equal(provider.jobsFeedUrl, 'https://apply.workable.com/travisci/jobs.md')
  assert.equal(
    provider.widgetApiUrl,
    'https://apply.workable.com/api/v1/widget/accounts/travisci',
  )
  assert.equal(provider.companyDomain, 'travis-ci.com')
  assert.equal(provider.atsPlatform, 'first-party-imprint-handoff-workable')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.deepEqual(provider.noPublicJobRouteUrls, [
    'https://www.travis-ci.com/careers',
    'https://www.travis-ci.com/jobs',
  ])
  assert.match(provider.modulePath, /travisci[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /travisci[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Idera, Inc\./i)
  assert.match(provider.verifiedSurfaceSummary, /Work with Travis CI/i)
  assert.match(provider.verifiedSurfaceSummary, /jobs\.md/i)
  assert.match(provider.verifiedSurfaceSummary, /zero current openings/i)

  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nTravis CI\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'travisci')
})

test('buildScrapers exposes a runnable Travis CI scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'travisci')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'travisci')
  assert.match(scraper.dryRunFile, /travisci[\\/]jobs\.json$/i)
})
