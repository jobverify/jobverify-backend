import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../keiindustries/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../keiindustries/catalog.js')
  } catch {
    assert.fail('Expected KEI Industries catalog module at ../keiindustries/catalog.js')
  }
}

test('KEI Industries local catalog captures the verified first-party archive plus validated detail-page jobs surface', async () => {
  const { KEI_INDUSTRIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(KEI_INDUSTRIES_CATALOG)

  assert.equal(defaultCatalog, KEI_INDUSTRIES_CATALOG)
  assert.equal(provider.source, 'keiindustries')
  assert.equal(provider.companyName, 'KEI Industries')
  assert.equal(provider.officialBrandName, 'KEI Industries')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.kei-ind.com/jobs/')
  assert.equal(provider.homepageUrl, 'https://www.kei-ind.com/')
  assert.equal(provider.officialCareerPageUrl, 'https://www.kei-ind.com/career-at-kei/life-at-kei/')
  assert.equal(provider.jobsArchiveUrl, 'https://www.kei-ind.com/jobs/')
  assert.deepEqual(provider.sampleJobDetailUrls, [
    'https://www.kei-ind.com/jobs/executive/',
    'https://www.kei-ind.com/jobs/design-engineer/',
    'https://www.kei-ind.com/jobs/business-development-marketing/',
  ])
  assert.equal(provider.companyDomain, 'kei-ind.com')
  assert.equal(provider.atsPlatform, 'first-party-wordpress-job-pages')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'first-party-jobs-archive-link-enumeration-with-detail-page-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-jobs-archive+detail-page-job-features-apply-online-validation',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /keiindustries[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.kei-ind\.com\/jobs\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.kei-ind\.com\/jobs\/executive\//i)
  assert.match(provider.verifiedSurfaceSummary, /Job Features/i)
  assert.match(provider.verifiedSurfaceSummary, /Apply Online/i)
  assert.match(provider.verifiedSurfaceSummary, /Our ESG Vision\/ Purpose/i)
})

test('KEI Industries exact backlog row matches directly from the local provider metadata', async () => {
  const { KEI_INDUSTRIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'KEI Industries\n',
    catalog: [hydrateProviderCatalogEntry(KEI_INDUSTRIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['KEI Industries', 'keiindustries', 'KEI Industries']],
  )
})

test('KEI Industries hydrated local catalog stays script-runner compatible for later registry integration', async () => {
  const { KEI_INDUSTRIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(KEI_INDUSTRIES_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'KEI Industries')
  assert.equal(provider.companyCareerPage, 'https://www.kei-ind.com/jobs/')
  assert.equal(provider.companyDomain, 'kei-ind.com')
  assert.equal(provider.atsPlatform, 'first-party-wordpress-job-pages')
  assert.match(provider.modulePath, /keiindustries[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /keiindustries[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
