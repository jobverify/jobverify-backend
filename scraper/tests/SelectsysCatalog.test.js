import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Careers at Selectsys</h1>
    <p>Selectsys is a global team across the U.S. and India.</p>
    <h2>Roles We're Hiring For</h2>
    <ul>
      <li>BPO Workflow Manager (Insurance Ops - Remote)</li>
      <li>Underwriting QA Analyst</li>
      <li>Full-Stack Developer (.NET, TypeScript, Azure)</li>
      <li>Product Manager (Quoting + Bind Layer)</li>
      <li>Onboarding + Integration Lead</li>
      <li>Client Success Manager (Insurance/Tech hybrid)</li>
    </ul>
    <h2>How to Apply</h2>
    <p>Email your resume and LinkedIn profile to hr@selectsys.com with the job title in the subject line.</p>
    <p>Remote-first with U.S. and international team hubs</p>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../selectsys/provider.js')
  } catch {
    assert.fail('Expected Selectsys provider module at ../selectsys/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../selectsys/script.js')
  } catch {
    assert.fail('Expected Selectsys scraper module at ../selectsys/script.js')
  }
}

test('Selectsys exports local provider metadata for the verified first-party email-apply careers page', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'selectsys',
    companyName: 'Selectsys',
    officialBrandName: 'Selectsys',
    adapter: 'script',
    modulePath: '../selectsys/script.js',
    homepageUrl: 'https://www.selectsys.com/',
    companyCareerPage: 'https://www.selectsys.com/careers',
    atsPlatform: 'official-company-careers-email-apply',
    countryFilter: 'India',
    paginationStrategy: 'single-page-static-role-list',
    extractionStrategy: 'verified-first-party-careers-page+same-page-role-list+email-apply',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'selectsys.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://www.selectsys.com/careers was the live first-party Selectsys careers page, that it publicly listed six hiring titles under Roles We\'re Hiring For, and that candidates were instructed to email resumes to hr@selectsys.com with the job title in the subject line.',
    dryRunFile: 'selectsys/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.equal(scriptModule.APPLICATION_EMAIL, 'hr@selectsys.com')
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('Selectsys extracts the verified same-page role list and email apply contract', async () => {
  const selectsys = await loadScriptModule()

  assert.equal(selectsys.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await selectsys.run({
    fetchText: async () => careersHtml,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 6)
  assert.deepEqual(jobs[0], {
    title: 'BPO Workflow Manager (Insurance Ops - Remote)',
    location: 'Remote-first (U.S. and India hubs)',
    applyUrl:
      'mailto:hr@selectsys.com?subject=Application%20for%20BPO%20Workflow%20Manager%20(Insurance%20Ops%20-%20Remote)',
    sourceUrl: 'https://www.selectsys.com/careers',
    company: 'Selectsys',
    country: 'India',
    link:
      'mailto:hr@selectsys.com?subject=Application%20for%20BPO%20Workflow%20Manager%20(Insurance%20Ops%20-%20Remote)',
    source: 'selectsys',
    scrapedAt: '2026-07-18T00:00:00.000Z',
  })
})
