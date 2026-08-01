import assert from 'node:assert/strict'
import test from 'node:test'

const careersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Ray Business Technologies Careers - Discover a World of Opportunities</title>
  </head>
  <body>
    <h4>Search Jobs</h4>
    <h1>Careers</h1>
    <a href="/about-us/careers/current-openings">Current Openings</a>
    <p>Ray Business Technologies Pvt. Ltd. is an equal opportunities employer.</p>
    <p>Working with us is not a job. It's a journey.</p>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/raybusinesstechnologies/provider.js')
  } catch {
    assert.fail('Expected Ray Business Technologies provider module at ../../scraper/raybusinesstechnologies/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/raybusinesstechnologies/script.js')
  } catch {
    assert.fail('Expected Ray Business Technologies scraper module at ../../scraper/raybusinesstechnologies/script.js')
  }
}

test('Ray Business Technologies exports the verified fail-closed exact-name contract', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'raybusinesstechnologies',
    companyName: 'Ray Business Technologies',
    officialBrandName: 'Ray Business Technologies Pvt. Ltd.',
    adapter: 'script',
    modulePath: '../../scraper/raybusinesstechnologies/script.js',
    homepageUrl: 'https://raybiztech.com/',
    companyCareerPage: 'https://raybiztech.com/about-us/careers/current-openings',
    atsPlatform: 'first-party-careers-shell-without-public-openings',
    countryFilter: 'India',
    paginationStrategy: 'fail-closed-no-trustworthy-public-listings',
    extractionStrategy: 'verified-first-party-careers-shell+no-accessibly-rendered-public-openings+fail-closed-sentinel',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'raybiztech.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://raybiztech.com/about-us/careers/current-openings was the live first-party Ray Business Technologies careers shell, but the fetched public HTML only exposed the employer branding copy and the Current Openings shell without any accessibly rendered job cards, titles, or apply links. Because no trustworthy public openings listing was fetchable from the verified exact-name first-party surface, this provider remains fail-closed.',
    dryRunFile: 'raybusinesstechnologies/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('Ray Business Technologies validates the verified careers shell and stays fail-closed', async () => {
  const ray = await loadScriptModule()

  assert.equal(ray.hasOfficialCareersShellSignal(careersShellHtml), true)
  assert.equal(ray.hasTrustworthyPublicJobsSignal(careersShellHtml), false)

  const jobs = await ray.run({
    fetchText: async (url) => {
      assert.equal(url, ray.CAREERS_URL)
      return careersShellHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('Ray Business Technologies fails closed if trustworthy public job cards appear on the exact-name surface', async () => {
  const ray = await loadScriptModule()

  await assert.rejects(
    ray.run({
      fetchText: async () => `
        ${careersShellHtml}
        <section class="job-card">
          <h2>Digital Marketing Specialist</h2>
          <a href="/apply-online/digital-marketing-specialist">Apply now</a>
        </section>
      `,
    }),
    /trustworthy public jobs surface/i,
  )
})
