import assert from 'node:assert/strict'
import test from 'node:test'

const loadCatalog = async () => {
  try {
    return await import('../../scraper/splunk/catalog.js')
  } catch {
    assert.fail('Expected Splunk catalog module at ../../scraper/splunk/catalog.js')
  }
}

test('Splunk catalog captures the verified first-party Cisco-hosted empty India slice', async () => {
  const splunkCatalog = await loadCatalog()
  const provider = splunkCatalog.default

  assert.equal(provider.source, 'splunk')
  assert.equal(provider.companyName, 'Splunk')
  assert.equal(provider.companyCareerPage, 'https://www.splunk.com/en_us/careers/search-jobs.hml.html')
  assert.equal(provider.canonicalCareersLandingUrl, 'https://careers.cisco.com/global/en/splunk')
  assert.equal(provider.officialSearchPageUrl, 'https://careers.cisco.com/global/en/splunk/search-page')
  assert.equal(provider.indiaJobsPageUrl, 'https://careers.cisco.com/global/en/splunk/india')
  assert.equal(provider.atsPlatform, 'official-first-party-cisco-careers-search')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.verifiedSurfaceSummary, /59 Splunk-branded public openings/i)
  assert.match(provider.verifiedSurfaceSummary, /India-filtered payload returned 0 hits/i)
})
