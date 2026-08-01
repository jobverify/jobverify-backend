import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/tekfridayprocessingsolutions/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/tekfridayprocessingsolutions/catalog.js')
  } catch {
    assert.fail('Expected TekFriday Processing Solutions catalog module at ../../scraper/tekfridayprocessingsolutions/catalog.js')
  }
}

test('TekFriday Processing Solutions local catalog captures the verified no-public-careers contract', async () => {
  const { TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG)

  assert.equal(defaultCatalog, TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG)
  assert.equal(provider.source, 'tekfridayprocessingsolutions')
  assert.equal(provider.companyName, 'TekFriday Processing Solutions')
  assert.equal(provider.homepageUrl, 'https://www.tekfriday.com/')
  assert.equal(provider.companyCareerPage, 'https://www.tekfriday.com/ContactUs.html')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.paginationStrategy, 'homepage-plus-contact-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage-without-careers-link+verified-contact-page-without-jobs-surface+fail-closed-sentinel',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /tag@tekfriday\.com/i)
  assert.equal(provider.modulePath, modulePath)
})

test('TekFriday Processing Solutions exact backlog row resolves from the local provider metadata', async () => {
  const { TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'TekFriday Processing Solutions\n',
    catalog: [hydrateProviderCatalogEntry(TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
