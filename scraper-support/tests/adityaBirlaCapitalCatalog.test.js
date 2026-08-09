import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const scriptModulePath = path.resolve(currentDir, '../../scraper/adityabirlacapital/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/adityabirlacapital/catalog.js')
  } catch {
    assert.fail('Expected Aditya Birla Capital catalog module at ../../scraper/adityabirlacapital/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/adityabirlacapital/script.js')
  } catch {
    assert.fail('Expected Aditya Birla Capital scraper module at ../../scraper/adityabirlacapital/script.js')
  }
}

test('Aditya Birla Capital local catalog captures the verified first-party jobs surface', async () => {
  const { ADITYA_BIRLA_CAPITAL_CATALOG } = await loadCatalogModule()
  const scriptModule = await loadScriptModule()

  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.source, 'adityabirlacapital')
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.companyName, 'Aditya Birla Capital')
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.adapter, 'script')
  assert.equal(
    ADITYA_BIRLA_CAPITAL_CATALOG.companyCareerPage,
    'https://www.adityabirlacapital.com/careers',
  )
  assert.equal(
    ADITYA_BIRLA_CAPITAL_CATALOG.officialJobsPage,
    'https://www.adityabirlacapital.com/careers/jobs',
  )
  assert.equal(
    ADITYA_BIRLA_CAPITAL_CATALOG.resumeHandoffUrl,
    'https://abgcareers.peoplestrong.com/register',
  )
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.companyDomain, 'adityabirlacapital.com')
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.countryFilter, 'India')
  assert.equal(
    ADITYA_BIRLA_CAPITAL_CATALOG.paginationStrategy,
    'first-party-blogajax-page-parameter',
  )
  assert.equal(
    ADITYA_BIRLA_CAPITAL_CATALOG.extractionStrategy,
    'official-careers-page+official-jobs-page+blogajax-json+same-domain-detail-routes+mixed-iona-peoplestrong-apply-handoffs',
  )
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.parser, 'custom-script')
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.verifiedOn, '2026-07-14')
  assert.match(
    ADITYA_BIRLA_CAPITAL_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.adityabirlacapital\.com\/careers/i,
  )
  assert.match(
    ADITYA_BIRLA_CAPITAL_CATALOG.verifiedSurfaceSummary,
    /https:\/\/www\.adityabirlacapital\.com\/careers\/jobs/i,
  )
  assert.match(
    ADITYA_BIRLA_CAPITAL_CATALOG.verifiedSurfaceSummary,
    /blogAjax=1/i,
  )
  assert.match(
    ADITYA_BIRLA_CAPITAL_CATALOG.verifiedSurfaceSummary,
    /iona\.ai/i,
  )
  assert.match(
    ADITYA_BIRLA_CAPITAL_CATALOG.verifiedSurfaceSummary,
    /peoplestrong/i,
  )
  assert.equal(ADITYA_BIRLA_CAPITAL_CATALOG.modulePath, scriptModulePath)

  assert.equal(scriptModule.PROVIDER_METADATA.source, ADITYA_BIRLA_CAPITAL_CATALOG.source)
  assert.equal(
    scriptModule.PROVIDER_METADATA.companyCareerPage,
    ADITYA_BIRLA_CAPITAL_CATALOG.companyCareerPage,
  )
  assert.equal(
    scriptModule.PROVIDER_METADATA.officialJobsPage,
    ADITYA_BIRLA_CAPITAL_CATALOG.officialJobsPage,
  )
  assert.equal(
    scriptModule.PROVIDER_METADATA.resumeHandoffUrl,
    ADITYA_BIRLA_CAPITAL_CATALOG.resumeHandoffUrl,
  )
})

test('buildScrapers and company coverage resolve Aditya Birla Capital from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'adityabirlacapital')
  const scraper = buildScrapers().find((item) => item.name === 'adityabirlacapital')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Aditya Birla Capital')
  assert.equal(provider.companyCareerPage, 'https://www.adityabirlacapital.com/careers')
  assert.match(scraper.dryRunFile, /adityabirlacapital[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Aditya Birla Capital\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aditya Birla Capital', 'adityabirlacapital', 'Aditya Birla Capital']],
  )
})
