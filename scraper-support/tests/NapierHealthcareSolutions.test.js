import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Napier</title>
  </head>
  <body>
    <main>
      <h1>Be part of healthcare's digital transformation</h1>
      <a href="#openings">VIEW ALL OPENINGS</a>
      <p>
        Scroll down and view our current openings or fill in the electronic form, telling us what you have to offer
        the job you are looking for and attach your resume / CV.
      </p>
      <p>Alternatively, you can follow us on LinkedIn and stay updated on the latest opportunities as they appear.</p>
    </main>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/napierhealthcaresolutions/provider.js')
  } catch {
    assert.fail(
      'Expected Napier Healthcare Solutions provider module at ../../scraper/napierhealthcaresolutions/provider.js',
    )
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/napierhealthcaresolutions/script.js')
  } catch {
    assert.fail(
      'Expected Napier Healthcare Solutions scraper module at ../../scraper/napierhealthcaresolutions/script.js',
    )
  }
}

test('Napier Healthcare Solutions exports the verified fail-closed careers contract', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'napierhealthcaresolutions',
    companyName: 'Napier Healthcare Solutions',
    officialBrandName: 'Napier',
    adapter: 'script',
    modulePath: '../../scraper/napierhealthcaresolutions/script.js',
    homepageUrl: 'https://www.napierhealthcare.com/v2/',
    companyCareerPage: 'https://www.napierhealthcare.com/v2/careers/',
    atsPlatform: 'official-careers-marketing-page-no-live-public-openings',
    countryFilter: 'India',
    paginationStrategy: 'single-first-party-careers-page-validation',
    extractionStrategy: 'verified-first-party-careers-marketing-copy+no-live-same-domain-opening-links+fail-closed-sentinel',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'napierhealthcare.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://www.napierhealthcare.com/v2/careers/ remained the live first-party Napier careers page, exposed the VIEW ALL OPENINGS call-to-action and resume-submission marketing copy, but did not expose any live same-domain public opening cards or role-detail links. Historical search-engine snippets for older Napier category pages were no longer reproducible on the live site, so this provider stays fail-closed until Napier publishes a trustworthy public jobs surface again.',
    dryRunFile: 'napierhealthcaresolutions/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('Napier Healthcare Solutions returns [] only while the official page stays a marketing shell', async () => {
  const napier = await loadScriptModule()

  assert.equal(napier.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(napier.extractSameDomainJobLinks(careersHtml), [])

  const jobs = await napier.run({
    fetchText: async (url) => {
      assert.equal(url, napier.CAREERS_URL)
      return careersHtml
    },
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    napier.run({
      fetchText: async () => `
        ${careersHtml}
        <a href="https://www.napierhealthcare.com/v2/jobs/data-engineer/">Data Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )
})
