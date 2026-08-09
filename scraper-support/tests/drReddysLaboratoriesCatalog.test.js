import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/drreddyslaboratories/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/drreddyslaboratories/catalog.js')
  } catch {
    assert.fail('Expected Dr. Reddy\'s Laboratories catalog module at ../../scraper/drreddyslaboratories/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/drreddyslaboratories/script.js')
  } catch {
    assert.fail('Expected Dr. Reddy\'s Laboratories scraper module at ../../scraper/drreddyslaboratories/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Dr. Reddy\'s Laboratories local catalog captures the verified first-party Attrax careers surface', async () => {
  const { DR_REDDYS_LABORATORIES_CATALOG } = await loadCatalogModule()
  const drReddys = await loadScraperModule()
  const provider = buildCatalogReadyProvider(DR_REDDYS_LABORATORIES_CATALOG)

  assert.equal(provider.source, 'drreddyslaboratories')
  assert.equal(provider.companyName, 'Dr. Reddy\'s Laboratories')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.drreddys.com/')
  assert.equal(provider.companyCareerPage, 'https://careers.drreddys.com/')
  assert.equal(provider.jobsPageUrl, 'https://careers.drreddys.com/jobs')
  assert.equal(
    provider.verifiedJobUrl,
    'https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118',
  )
  assert.equal(
    provider.verifiedApplyUrl,
    'https://careers.drreddys.com/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5118',
  )
  assert.equal(provider.companyDomain, 'careers.drreddys.com')
  assert.equal(provider.atsPlatform, 'first-party-attrax')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-attrax-html-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-handoff+verified-careers-landing+attrax-india-cards+detail-page-workflow-apply',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.drreddys\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.drreddys\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.drreddys\.com\/jobs\b/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.drreddys\.com\/jobs\?page=2/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/careers\.drreddys\.com\/job\/data-analyst-hr-analytics-in-hyderabad-jid-5118/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/careers\.drreddys\.com\/Workflow\?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5118/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /56 result\(s\)/i)
  assert.match(provider.verifiedSurfaceSummary, /\b5 pages\b/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /drreddyslaboratories[\\/]jobs\.json$/i)

  assert.equal(drReddys.PROVIDER_METADATA.source, provider.source)
  assert.equal(drReddys.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(drReddys.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(drReddys.PROVIDER_METADATA.jobsPageUrl, provider.jobsPageUrl)
})

test('Dr. Reddy\'s Laboratories exact backlog name matches from the local provider contract without aliases', async () => {
  const { DR_REDDYS_LABORATORIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Dr. Reddy\'s Laboratories\n',
    catalog: [buildCatalogReadyProvider(DR_REDDYS_LABORATORIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dr. Reddy\'s Laboratories', 'drreddyslaboratories', 'Dr. Reddy\'s Laboratories']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Dr. Reddy\'s Laboratories'), false)
})
