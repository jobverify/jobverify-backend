import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/techmojosolutions/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/techmojosolutions/catalog.js')
  } catch {
    assert.fail('Expected TechMojo Solutions catalog module at ../../scraper/techmojosolutions/catalog.js')
  }
}

test('TechMojo Solutions local catalog captures the verified first-party jobs portal contract', async () => {
  const { TECHMOJO_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TECHMOJO_SOLUTIONS_CATALOG)

  assert.equal(defaultCatalog, TECHMOJO_SOLUTIONS_CATALOG)
  assert.equal(provider.source, 'techmojosolutions')
  assert.equal(provider.companyName, 'TechMojo Solutions')
  assert.equal(provider.companyCareerPage, 'https://jobs.techmojo.com/jobs')
  assert.equal(provider.atsPlatform, 'official-company-jobs-portal')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page-first-party-jobs-portal')
  assert.equal(
    provider.extractionStrategy,
    'verified-jobs-portal-shell+anchor-card-extraction+hyderabad-role-normalization',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Java Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /SRE Lead/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /techmojosolutions[\\/]jobs\.json$/i)
})

test('TechMojo Solutions exact backlog row resolves from the local provider metadata', async () => {
  const { TECHMOJO_SOLUTIONS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'TechMojo Solutions\n',
    catalog: [hydrateProviderCatalogEntry(TECHMOJO_SOLUTIONS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
