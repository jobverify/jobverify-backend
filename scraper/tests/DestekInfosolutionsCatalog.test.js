import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../destekinfosolutions/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../destekinfosolutions/catalog.js')
  } catch {
    assert.fail('Expected Destek Infosolutions catalog module at ../destekinfosolutions/catalog.js')
  }
}

test('Destek Infosolutions local catalog captures the verified no-public-careers contract', async () => {
  const { DESTEK_INFOSOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(DESTEK_INFOSOLUTIONS_CATALOG)

  assert.equal(defaultCatalog, DESTEK_INFOSOLUTIONS_CATALOG)
  assert.equal(provider.source, 'destekinfosolutions')
  assert.equal(provider.companyName, 'Destek Infosolutions')
  assert.equal(provider.officialBrandName, 'Destek Infosolutions')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://desteksolutions.com/')
  assert.equal(provider.companyCareerPage, 'https://desteksolutions.com/careers')
  assert.equal(provider.contactPageUrl, 'https://desteksolutions.com/contact')
  assert.equal(provider.companyDomain, 'desteksolutions.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-contact-plus-common-careers-route-validation')
  assert.equal(provider.extractionStrategy, 'verified-homepage+verified-contact-page+verified-missing-careers-route-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /destekinfosolutions[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/desteksolutions\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/desteksolutions\.com\/contact/i)
  assert.match(provider.verifiedSurfaceSummary, /No trustworthy public jobs surface is currently exposed/i)
})

test('Destek Infosolutions exact backlog row resolves from the local provider contract', async () => {
  const { DESTEK_INFOSOLUTIONS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Destek Infosolutions\n',
    catalog: [hydrateProviderCatalogEntry(DESTEK_INFOSOLUTIONS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Destek Infosolutions', 'destekinfosolutions', 'Destek Infosolutions']],
  )
})
