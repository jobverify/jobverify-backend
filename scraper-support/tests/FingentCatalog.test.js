import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Openings - Fingent Careers</title>
  </head>
  <body>
    <h1>Explore Our Current Openings</h1>
    <a href="/careers/accounts-executive-contract-role/">Accounts Executive [Contract Role] 1 - 3 Years</a>
    <a href="/careers/associate-technical-lead-dotnet/">Associate Technical Lead - .NET 8 - 14 years</a>
    <a href="/careers/vice-president-of-sales/">Vice President of Sales 15+ Years</a>
    <a href="/careers/senior-software-engineer-dotnet/">Senior Software Engineer .NET 6 - 8 years</a>
    <a href="/careers/devops-engineer/">DevOps Engineer 1-3Years</a>
    <a href="/careers/data-engineer/">Data Engineer 4+ Years</a>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/fingent/provider.js')
  } catch {
    assert.fail('Expected Fingent provider module at ../../scraper/fingent/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/fingent/script.js')
  } catch {
    assert.fail('Expected Fingent scraper module at ../../scraper/fingent/script.js')
  }
}

test('Fingent exports local provider metadata for the verified first-party openings page', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'fingent',
    companyName: 'Fingent',
    officialBrandName: 'Fingent',
    adapter: 'script',
    modulePath: '../../scraper/fingent/script.js',
    homepageUrl: 'https://www.fingent.com/careers/',
    companyCareerPage: 'https://www.fingent.com/careers/career-openings/',
    atsPlatform: 'official-first-party-openings-page',
    countryFilter: 'India',
    paginationStrategy: 'single-page-searchable-list',
    extractionStrategy: 'verified-first-party-openings-page+same-page-role-links+public-title-and-experience',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'fingent.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://www.fingent.com/careers/career-openings/ was the live first-party Fingent openings page, and that it publicly exposed current opening links such as Accounts Executive [Contract Role], Associate Technical Lead - .NET, Senior Software Engineer .NET, DevOps Engineer, and Data Engineer with experience ranges in the visible listing text.',
    dryRunFile: 'fingent/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('Fingent extracts verified current openings from the first-party openings page', async () => {
  const fingent = await loadScriptModule()

  assert.equal(fingent.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await fingent.run({
    fetchText: async () => careersHtml,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 6)
  assert.deepEqual(jobs[0], {
    title: 'Accounts Executive [Contract Role]',
    experience: '1 - 3 Years',
    location: null,
    sourceUrl: 'https://www.fingent.com/careers/accounts-executive-contract-role/',
    applyUrl: 'https://www.fingent.com/careers/accounts-executive-contract-role/',
    company: 'Fingent',
    country: 'India',
    link: 'https://www.fingent.com/careers/accounts-executive-contract-role/',
    source: 'fingent',
    scrapedAt: '2026-07-18T00:00:00.000Z',
  })
})
