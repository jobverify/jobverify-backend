import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/seeq/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/seeq/catalog.js')
  } catch {
    assert.fail('Expected Seeq catalog module at ../../scraper/seeq/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/seeq/script.js')
  } catch {
    assert.fail('Expected Seeq scraper module at ../../scraper/seeq/script.js')
  }
}

test('Seeq local catalog captures the verified first-party careers handoff and Workable feed metadata without alias churn', async () => {
  const { SEEQ_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const seeq = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(SEEQ_CATALOG)

  assert.equal(defaultCatalog, SEEQ_CATALOG)
  assert.equal(provider.source, 'seeq')
  assert.equal(provider.companyName, 'Seeq')
  assert.equal(provider.officialBrandName, 'Seeq')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.seeq.com/')
  assert.equal(provider.companyCareerPage, 'https://www.seeq.com/careers/')
  assert.equal(provider.workableBoardUrl, 'https://apply.workable.com/seeq/')
  assert.equal(provider.jobsFeedUrl, 'https://apply.workable.com/seeq/jobs.md')
  assert.equal(provider.companyDomain, 'seeq.com')
  assert.equal(provider.atsPlatform, 'first-party-handoff-workable')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-careers-handoff-plus-workable-markdown-feed')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-workable-board+workable-markdown-feed+india-location-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /seeq[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.seeq\.com\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/apply\.workable\.com\/seeq\//i)
  assert.match(provider.verifiedSurfaceSummary, /Staff Software Engineer - Platform/i)
  assert.match(provider.verifiedSurfaceSummary, /Principal Customer Success Manager/i)
  assert.match(provider.verifiedSurfaceSummary, /no India roles/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Seeq'), false)

  assert.equal(seeq.PROVIDER_METADATA.source, SEEQ_CATALOG.source)
  assert.equal(seeq.PROVIDER_METADATA.companyName, SEEQ_CATALOG.companyName)
  assert.equal(seeq.PROVIDER_METADATA.workableBoardUrl, SEEQ_CATALOG.workableBoardUrl)
})

test('Seeq backlog row matches directly from the local catalog without alias churn', async () => {
  const { SEEQ_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Seeq\n',
    catalog: [hydrateProviderCatalogEntry(SEEQ_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Seeq', 'seeq', 'Seeq']],
  )
})

test('Seeq hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { SEEQ_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SEEQ_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Seeq')
  assert.equal(provider.companyCareerPage, 'https://www.seeq.com/careers/')
  assert.equal(provider.companyDomain, 'seeq.com')
  assert.equal(provider.atsPlatform, 'first-party-handoff-workable')
  assert.match(provider.modulePath, /seeq[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /seeq[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
