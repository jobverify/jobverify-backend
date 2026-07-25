import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const expectedModulePath = path.resolve(currentDir, '../slack/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../slack/catalog.js')
  } catch {
    assert.fail('Expected Slack catalog module at ../slack/catalog.js')
  }
}

test('Slack local catalog captures the verified first-party careers surface and current empty India slice', async () => {
  const { SLACK_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SLACK_CATALOG)

  assert.equal(defaultCatalog, SLACK_CATALOG)
  assert.equal(provider.source, 'slack')
  assert.equal(provider.companyName, 'Slack')
  assert.equal(provider.officialBrandName, 'Slack')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://slack.com/intl/en-in/careers')
  assert.equal(provider.officialCareersPageUrl, 'https://slack.com/careers')
  assert.equal(provider.companyDomain, 'slack.com')
  assert.equal(provider.officialJobBoardDomain, 'salesforce.wd12.myworkdayjobs.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-page+public-workday-apply-links')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page-current-empty-india-slice')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-location-filter+verified-public-workday-apply-links+return-empty-when-no-india-locations',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /slack[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, expectedModulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/slack\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/slack\.com\/intl\/en-in\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /\b10 open positions\b/i)
  assert.match(provider.verifiedSurfaceSummary, /zero India locations/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Slack'), false)
})

test('Slack exact backlog row matches directly from the local provider metadata', async () => {
  const { SLACK_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Slack\n',
    catalog: [hydrateProviderCatalogEntry(SLACK_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Slack', 'slack', 'Slack']],
  )
})

test('Slack hydrated local catalog stays script-runner compatible for later shared-registry integration', async () => {
  const { SLACK_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SLACK_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Slack')
  assert.equal(provider.companyCareerPage, 'https://slack.com/intl/en-in/careers')
  assert.equal(provider.officialCareersPageUrl, 'https://slack.com/careers')
  assert.equal(provider.companyDomain, 'slack.com')
  assert.equal(provider.officialJobBoardDomain, 'salesforce.wd12.myworkdayjobs.com')
  assert.match(provider.modulePath, /slack[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /slack[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
