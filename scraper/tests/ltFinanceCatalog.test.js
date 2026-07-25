import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const ltFinanceModulePath = path.resolve(currentDir, '../ltfinance/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../ltfinance/catalog.js')
  } catch {
    assert.fail('Expected L&T Finance catalog module at ../ltfinance/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../ltfinance/script.js')
  } catch {
    assert.fail('Expected L&T Finance scraper module at ../ltfinance/script.js')
  }
}

test('L&T Finance local catalog captures the verified first-party careers handoff plus Workline public jobs API contract', async () => {
  const { LT_FINANCE_CATALOG } = await loadCatalogModule()
  const ltFinance = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(LT_FINANCE_CATALOG)

  assert.equal(provider.source, 'ltfinance')
  assert.equal(provider.companyName, 'L&T Finance')
  assert.equal(provider.officialBrandName, 'L&T Finance')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.ltfinance.com/careers')
  assert.equal(provider.jobsBoardUrl, 'https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx')
  assert.equal(
    provider.jobsApiUrl,
    'https://myltfs.ltfs.com/CPortal/generalopening.aspx/GetCurrentopening',
  )
  assert.equal(provider.companyDomain, 'ltfinance.com')
  assert.equal(provider.atsPlatform, 'workline-public-jobs-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-first-party-careers-page-handoff-plus-workline-current-opening-api',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+workline-handoff+currentopening-json-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /ltfinance[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, ltFinanceModulePath)
  assert.match(provider.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.ltfinance\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/myltfs\.ltfs\.com\/CPortal\/GeneralOpening\.aspx/i)
  assert.match(provider.verifiedSurfaceSummary, /GetCurrentopening/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'L&T Finance'), false)

  assert.equal(ltFinance.PROVIDER_METADATA.source, LT_FINANCE_CATALOG.source)
  assert.equal(ltFinance.PROVIDER_METADATA.companyName, LT_FINANCE_CATALOG.companyName)
  assert.equal(ltFinance.PROVIDER_METADATA.jobsBoardUrl, LT_FINANCE_CATALOG.jobsBoardUrl)
  assert.equal(ltFinance.PROVIDER_METADATA.jobsApiUrl, LT_FINANCE_CATALOG.jobsApiUrl)
})

test('L&T Finance backlog row matches directly from the local catalog without alias churn', async () => {
  const { LT_FINANCE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'L&T Finance\n',
    catalog: [hydrateProviderCatalogEntry(LT_FINANCE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['L&T Finance', 'ltfinance', 'L&T Finance']],
  )
})
