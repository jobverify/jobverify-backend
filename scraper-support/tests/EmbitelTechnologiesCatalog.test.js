import assert from 'node:assert/strict'
import test from 'node:test'
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'
import { EMBITEL_TECHNOLOGIES_CATALOG } from '../../scraper/embiteltechnologies/catalog.js'

test('Embitel catalog exposes the verified first-party client and public AJAX listing', () => {
  const provider = hydrateProviderCatalogEntry(EMBITEL_TECHNOLOGIES_CATALOG)
  assert.equal(provider.companyCareerPage, 'https://www.embitel.com/work-with-us/')
  assert.equal(provider.openingsPageUrl, 'https://www.embitel.com/cariad-india-openings')
  assert.equal(provider.jobsApiUrl, 'https://www.embitel.com/wp-admin/admin-ajax.php')
  assert.equal(provider.atsPlatform, 'first-party-ajax+workday')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.verifiedOn, '2026-10-03')
  const report = generateCompanyCoverageReport({ csvText: 'Embitel Technologies\n', catalog: [provider] })
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
