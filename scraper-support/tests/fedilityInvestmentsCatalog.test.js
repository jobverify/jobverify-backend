import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const scriptModulePath = path.resolve(currentDir, '../../scraper/fedilityinvestments/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/fedilityinvestments/catalog.js')
  } catch {
    assert.fail('Expected Fedility Investments catalog module at ../../scraper/fedilityinvestments/catalog.js')
  }
}

test('Fedility Investments catalog captures the verified Fidelity India jobs page and RSS feed contracts', async () => {
  const {
    FEDILITY_INVESTMENTS_CATALOG,
    default: defaultCatalog,
  } = await loadCatalogModule()

  assert.equal(defaultCatalog, FEDILITY_INVESTMENTS_CATALOG)
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.source, 'fedilityinvestments')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.companyName, 'Fedility Investments')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.officialBrandName, 'Fidelity Investments')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.adapter, 'script')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.companyCareerPage, 'https://jobs.fidelity.com/in/jobs/')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.jobsFeedUrl, 'https://jobs.fidelity.com/in/jobs/xml/?rss=true')
  assert.equal(
    FEDILITY_INVESTMENTS_CATALOG.officialJobDetailExampleUrl,
    'https://jobs.fidelity.com/in/jobs/2130684/principal-network-engineer/',
  )
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.countryFilter, 'India')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.paginationStrategy, 'single-rss-feed')
  assert.equal(
    FEDILITY_INVESTMENTS_CATALOG.extractionStrategy,
    'verified-first-party-india-jobs-page+verified-rss-feed+deduped-multi-location-roles',
  )
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.parser, 'custom-script')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.companyDomain, 'jobs.fidelity.com')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.verifiedOn, '2026-08-02')
  assert.equal(FEDILITY_INVESTMENTS_CATALOG.modulePath, scriptModulePath)
  assert.match(FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary, /https:\/\/jobs\.fidelity\.com\/in\/jobs\//i)
  assert.match(FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary, /https:\/\/jobs\.fidelity\.com\/in\/jobs\/xml\/\?rss=true/i)
  assert.match(
    FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary,
    /https:\/\/jobs\.fidelity\.com\/in\/jobs\/2130684\/principal-network-engineer\//i,
  )
  assert.match(
    FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary,
    /https:\/\/jobs\.fidelity\.com\/in\/jobs\/2133239\/data-scientist\//i,
  )
  assert.match(FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary, /Principal Network Engineer/i)
  assert.match(FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary, /Data Scientist/i)
  assert.match(FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary, /Cloudflare/i)
})

test('Fedility Investments backlog matching works directly from the local catalog metadata without an alias', async () => {
  const { FEDILITY_INVESTMENTS_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Fedility Investments\n',
    catalog: [FEDILITY_INVESTMENTS_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Fedility Investments', 'fedilityinvestments', 'Fedility Investments']],
  )
})
