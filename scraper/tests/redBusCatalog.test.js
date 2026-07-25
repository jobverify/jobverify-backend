import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const redbusModulePath = path.resolve(currentDir, '../redbus/script.js')

const loadRedBusCatalog = async () => {
  try {
    return await import('../redbus/catalog.js')
  } catch {
    assert.fail('Expected RedBus catalog module at ../redbus/catalog.js')
  }
}

test('RedBus local catalog captures the verified exact-name careers surface and shared Darwinbox handoff', async () => {
  const {
    REDBUS_CATALOG,
    default: defaultCatalog,
  } = await loadRedBusCatalog()
  const provider = hydrateProviderCatalogEntry(REDBUS_CATALOG)

  assert.equal(defaultCatalog, REDBUS_CATALOG)
  assert.equal(provider.source, 'redbus')
  assert.equal(provider.companyName, 'RedBus')
  assert.equal(provider.officialBrandName, 'redBus India Pvt Ltd.')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.officialBrandSiteUrl, 'https://www.redbus.in/')
  assert.equal(provider.companyCareerPage, 'https://www.redbus.in/careers')
  assert.equal(provider.jobListingsUrl, 'https://www.redbus.in/careers/jobs')
  assert.equal(provider.darwinboxOrigin, 'https://gommt.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(
    provider.darwinboxAllJobsUrl,
    'https://gommt.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.verifiedPublicJobCount, 5)
  assert.equal(provider.paginationStrategy, 'official-redbus-careers-plus-shared-darwinbox-browser-session')
  assert.equal(
    provider.extractionStrategy,
    'official-redbus-careers+jobs-page+bundle-verified-darwinbox-handoff+shared-darwinbox-rb-employee-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'gommt.darwinbox.in')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /redbus[\\/]jobs\.json$/i)
  assert.match(provider.modulePath, /redbus[\\/]script\.js$/i)
  assert.equal(provider.modulePath, redbusModulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.redbus\.in\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.redbus\.in\/careers\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/gommt\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/allJobs/i)
  assert.match(provider.verifiedSurfaceSummary, /RB - Employee/i)
  assert.match(provider.verifiedSurfaceSummary, /5 public RedBus jobs/i)
})

test('RedBus exact backlog row matches directly from the local catalog without aliases', async () => {
  const { REDBUS_CATALOG } = await loadRedBusCatalog()

  const report = generateCompanyCoverageReport({
    csvText: 'RedBus\n',
    catalog: [hydrateProviderCatalogEntry(REDBUS_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['RedBus', 'redbus', 'RedBus']],
  )
})
