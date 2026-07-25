import assert from 'node:assert/strict'
import test from 'node:test'

const loadProviderModule = async () => {
  try {
    return await import('../softprodigysystemsolutions/provider.js')
  } catch {
    assert.fail('Expected SoftProdigy System Solutions provider module at ../softprodigysystemsolutions/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../softprodigysystemsolutions/script.js')
  } catch {
    assert.fail('Expected SoftProdigy System Solutions scraper module at ../softprodigysystemsolutions/script.js')
  }
}

test('SoftProdigy System Solutions exports local provider metadata for the verified homepage-to-Keka jobs handoff', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'softprodigysystemsolutions',
    companyName: 'SoftProdigy System Solutions',
    officialBrandName: 'SoftProdigy',
    adapter: 'script',
    modulePath: '../softprodigysystemsolutions/script.js',
    homepageUrl: 'https://softprodigy.com/',
    companyCareerPage: 'https://softprodigy.keka.com/careers/',
    atsPlatform: 'official-homepage-plus-keka-board',
    countryFilter: 'India',
    paginationStrategy: 'homepage-handoff-plus-single-keka-board-page',
    extractionStrategy: 'verified-homepage-keka-link+verified-keka-board-shell+same-board-job-cards',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'softprodigy.com',
    verifiedOn: '2026-07-17',
    verifiedSurfaceSummary:
      'Verified on Friday, July 17, 2026 that https://softprodigy.com/ linked candidates to the public board at https://softprodigy.keka.com/careers/, and that the live Keka surface rendered the SoftProdigy System Solutions Pvt. Ltd. hiring shell with a Browse all jobs prompt.',
    dryRunFile: 'softprodigysystemsolutions/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.HOMEPAGE_URL, providerModule.provider.homepageUrl)
  assert.equal(scriptModule.KEKA_BOARD_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})
