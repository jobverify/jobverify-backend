import assert from 'node:assert/strict'
import test from 'node:test'

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/mobiculetechnologies/provider.js')
  } catch {
    assert.fail('Expected Mobicule Technologies provider module at ../../scraper/mobiculetechnologies/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/mobiculetechnologies/script.js')
  } catch {
    assert.fail('Expected Mobicule Technologies scraper module at ../../scraper/mobiculetechnologies/script.js')
  }
}

test('Mobicule Technologies exports provider metadata for the verified first-party careers handoff and public Zoho API', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'mobiculetechnologies',
    companyName: 'Mobicule Technologies',
    officialBrandName: 'Mobicule',
    adapter: 'script',
    modulePath: '../../scraper/mobiculetechnologies/script.js',
    homepageUrl: 'https://mobicule.com/',
    companyCareerPage: 'https://mobicule.com/careers/',
    careersPortalUrl: 'https://mobicule.zohorecruit.com/jobs/Careers',
    careersApiUrl:
      'https://mobicule.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
    atsPlatform: 'zohorecruit',
    countryFilter: 'India',
    paginationStrategy: 'official-careers-page-handoff-plus-public-zoho-api',
    extractionStrategy: 'verified-first-party-careers-page+branded-zohorecruit-portal+public-job-openings-api',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'mobicule.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://mobicule.com/careers/ was the live first-party Mobicule careers page and that its Explore opportunities CTA handed applicants to the branded public Zoho Recruit board at https://mobicule.zohorecruit.com/jobs/Careers backed by https://mobicule.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite. The public jobs payload exposed India openings including Programmer Analyst - Android in Mumbai / Pune.',
    dryRunFile: 'mobiculetechnologies/jobs.json',
  })

  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.equal(scriptModule.CAREERS_API_URL, providerModule.provider.careersApiUrl)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})
