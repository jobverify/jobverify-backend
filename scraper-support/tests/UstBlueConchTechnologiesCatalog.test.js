import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/ustblueconchtechnologies/provider.js')
  } catch {
    assert.fail('Expected UST BlueConch Technologies provider module at ../../scraper/ustblueconchtechnologies/provider.js')
  }
}

test('UST BlueConch Technologies provider captures the generic-UST-careers fail-closed contract', async () => {
  const { provider, default: defaultProvider } = await loadProviderModule()

  assert.equal(defaultProvider, provider)
  assert.equal(provider.source, 'ustblueconchtechnologies')
  assert.equal(provider.companyName, 'UST BlueConch Technologies')
  assert.equal(provider.officialBrandName, 'UST BlueConch')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.ust.com/en/careers')
  assert.equal(
    provider.blueconchReferenceUrl,
    'https://www.ust.com/en/who-we-are/ust-newsroom/ust-blueconch-wins-excellence-award-for-best-security-practices-in-it-ites-sector',
  )
  assert.equal(provider.companyDomain, 'ust.com')
  assert.equal(provider.atsPlatform, 'generic-parent-company-careers-page')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'blueconch-reference-plus-generic-parent-careers-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-ust-blueconch-reference+verified-generic-ust-careers-page-without-blueconch-filter-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /generic UST careers page/i)
  assert.match(provider.verifiedSurfaceSummary, /no BlueConch-specific public jobs surface/i)
  assert.match(provider.modulePath, /ustblueconchtechnologies[\\/]script\.js$/i)
})

test('UST BlueConch Technologies backlog matching works from the local provider metadata', async () => {
  const { provider } = await loadProviderModule()

  const report = generateCompanyCoverageReport({
    csvText: 'UST BlueConch Technologies\n',
    catalog: [provider],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['UST BlueConch Technologies', 'ustblueconchtechnologies', 'UST BlueConch Technologies']],
  )
})
