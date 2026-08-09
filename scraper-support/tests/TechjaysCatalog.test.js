import assert from 'node:assert/strict'
import test from 'node:test'

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/techjays/provider.js')
  } catch {
    assert.fail('Expected Techjays provider module at ../../scraper/techjays/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/techjays/script.js')
  } catch {
    assert.fail('Expected Techjays scraper module at ../../scraper/techjays/script.js')
  }
}

test('Techjays exports local provider metadata for the verified no-public-careers first-party surface', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'techjays',
    companyName: 'Techjays',
    officialBrandName: 'Techjays',
    adapter: 'script',
    modulePath: '../../scraper/techjays/script.js',
    homepageUrl: 'https://www.techjays.com/',
    companyCareerPage: 'https://www.techjays.com/careers',
    atsPlatform: 'official-company-site-no-public-careers',
    countryFilter: 'India',
    paginationStrategy: 'homepage-plus-careers-redirect-validation',
    extractionStrategy: 'verified-homepage-without-careers-link+verified-careers-route-redirect-to-about',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'techjays.com',
    verifiedOn: '2026-07-17',
    verifiedSurfaceSummary:
      'Verified on Friday, July 17, 2026 that https://www.techjays.com/ did not expose a public careers or jobs link, and that https://www.techjays.com/careers currently redirected candidates to /about instead of a public openings page.',
    dryRunFile: 'techjays/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.HOMEPAGE_URL, providerModule.provider.homepageUrl)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})
