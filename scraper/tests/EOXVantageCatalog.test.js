import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Start your career at EOX Vantage.</h2>
    <p>With headquarters in Cleveland, Ohio, offices in Bangalore and Mangalore, India and a remote call center throughout the US.</p>
    <h2>Sales and Client Growth Executive</h2>
    <h2>Cleveland, OH</h2>
    <a href="https://eoxvantage.com/job-inquiry/">Apply Now</a>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../eoxvantage/provider.js')
  } catch {
    assert.fail('Expected EOX Vantage provider module at ../eoxvantage/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../eoxvantage/script.js')
  } catch {
    assert.fail('Expected EOX Vantage scraper module at ../eoxvantage/script.js')
  }
}

test('EOX Vantage exports local provider metadata for the verified US-only first-party opening', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'eoxvantage',
    companyName: 'EOX Vantage',
    officialBrandName: 'EOX Vantage',
    adapter: 'script',
    modulePath: '../eoxvantage/script.js',
    homepageUrl: 'https://eoxvantage.com/',
    companyCareerPage: 'https://eoxvantage.com/careers/',
    atsPlatform: 'official-company-careers-us-only-current-opening',
    countryFilter: 'India',
    paginationStrategy: 'single-page-current-openings-validation',
    extractionStrategy: 'verified-first-party-careers-page+us-only-opening+india-filter-returns-empty',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'eoxvantage.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://eoxvantage.com/careers/ was the live first-party EOX Vantage careers page, that it exposed a public Sales and Client Growth Executive opening in Cleveland, Ohio with an Apply Now handoff, and that the page did not expose any India-located public role cards despite noting Bangalore and Mangalore offices.',
    dryRunFile: 'eoxvantage/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('EOX Vantage validates the first-party careers page and returns no India jobs from the verified US-only opening set', async () => {
  const eox = await loadScriptModule()

  assert.equal(eox.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(eox.extractOpenings(careersHtml), [
    {
      title: 'Sales and Client Growth Executive',
      location: 'Cleveland, OH',
      sourceUrl: 'https://eoxvantage.com/job-inquiry/',
      applyUrl: 'https://eoxvantage.com/job-inquiry/',
    },
  ])

  const jobs = await eox.run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})
