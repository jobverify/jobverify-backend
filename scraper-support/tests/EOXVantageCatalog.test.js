import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Start Your Career at EOX Vantage</title>
  </head>
  <body>
    <h1>Start Your Career at EOX Vantage</h1>
    <p>A tech company doing genuinely interesting work.</p>
    <p>Two simple ways to take the next step.</p>
    <a href="https://eoxvantage.com/current-openings/">Apply to a Current Opening</a>
    <a href="https://eoxvantage.com/job-inquiry/">Send Us Your Resume</a>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/eoxvantage/provider.js')
  } catch {
    assert.fail('Expected EOX Vantage provider module at ../../scraper/eoxvantage/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/eoxvantage/script.js')
  } catch {
    assert.fail('Expected EOX Vantage scraper module at ../../scraper/eoxvantage/script.js')
  }
}

test('EOX Vantage exports local provider metadata for the redesigned first-party careers page without public openings', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'eoxvantage',
    companyName: 'EOX Vantage',
    officialBrandName: 'EOX Vantage',
    adapter: 'script',
    modulePath: '../../scraper/eoxvantage/script.js',
    homepageUrl: 'https://eoxvantage.com/',
    companyCareerPage: 'https://eoxvantage.com/careers/',
    atsPlatform: 'official-company-careers-no-public-openings',
    countryFilter: 'India',
    paginationStrategy: 'browser-rendered-single-page-no-public-openings-validation',
    extractionStrategy: 'verified-first-party-redesigned-careers-page+no-public-role-cards+india-filter-returns-empty',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'eoxvantage.com',
    verifiedOn: '2026-08-02',
    verifiedSurfaceSummary:
      'Verified on Sunday, August 2, 2026 that https://eoxvantage.com/careers/ is the live first-party EOX Vantage careers page, that the page now presents a redesigned employer-branding surface headed by "Start Your Career at EOX Vantage" with prompts to apply to a current opening or send a resume, and that it no longer exposes public role cards, location-specific openings, or Apply Now job handoffs on the page. No trustworthy India-located public opening was exposed during live verification.',
    dryRunFile: 'eoxvantage/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('EOX Vantage validates the redesigned first-party careers page and returns no India jobs when no public role cards are exposed', async () => {
  const eox = await loadScriptModule()

  assert.equal(eox.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(eox.extractOpenings(careersHtml), [])

  const jobs = await eox.run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})
