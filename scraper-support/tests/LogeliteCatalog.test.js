import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Career</h1>
    <p>Open Job Positions</p>
    <h2>Your Career Starts Here</h2>
    <section>
      <h3>Human Resource Executive</h3>
      <p>Total Openings 1</p>
      <p>Lucknow</p>
      <p>Subject to Interview</p>
      <p>We're looking for a dynamic Human Resource Executive to join our team and contribute to a positive work environment.</p>
      <a href="/career/hr-executive-details">Download Details</a>
      <a href="/career/hr-executive-apply">Apply Now</a>
    </section>
    <section>
      <h3>Business Development Manager</h3>
      <p>Total Openings 1</p>
      <p>Lucknow</p>
      <p>Subject to Interview</p>
      <p>We're looking for a professional with a good understanding of the market and a track record of sales success.</p>
      <a href="/career/business-development-manager-details">Download Details</a>
      <a href="/career/business-development-manager-apply">Apply Now</a>
    </section>
    <section>
      <h3>Sales & Support Executive</h3>
      <p>Total Openings 5</p>
      <p>Lucknow</p>
      <p>Subject to Interview</p>
      <p>We are looking for a customer-centric individual with excellent communication and problem-solving skills.</p>
      <a href="/career/sales-support-executive-details">Download Details</a>
      <a href="/career/sales-support-executive-apply">Apply Now</a>
    </section>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/logelite/provider.js')
  } catch {
    assert.fail('Expected Logelite provider module at ../../scraper/logelite/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/logelite/script.js')
  } catch {
    assert.fail('Expected Logelite scraper module at ../../scraper/logelite/script.js')
  }
}

test('Logelite exports local provider metadata for the verified first-party career page', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'logelite',
    companyName: 'Logelite',
    officialBrandName: 'Logelite',
    adapter: 'script',
    modulePath: '../../scraper/logelite/script.js',
    homepageUrl: 'https://logelite.com/',
    companyCareerPage: 'https://logelite.com/career/',
    atsPlatform: 'official-company-careers',
    countryFilter: 'India',
    paginationStrategy: 'single-page-job-cards',
    extractionStrategy: 'verified-first-party-careers-page+same-page-role-cards+first-party-apply-links',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'logelite.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://logelite.com/career/ was the live first-party Logelite careers page, and that it publicly exposed role cards such as Human Resource Executive, Business Development Manager, and Sales & Support Executive with Lucknow location text plus Download Details and Apply Now links.',
    dryRunFile: 'logelite/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('Logelite extracts verified same-page role cards with first-party apply links', async () => {
  const logelite = await loadScriptModule()

  assert.equal(logelite.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await logelite.run({
    fetchText: async () => careersHtml,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Human Resource Executive',
    location: 'Lucknow, India',
    openings: '1',
    compensation: 'Subject to Interview',
    sourceUrl: 'https://logelite.com/career/hr-executive-details',
    applyUrl: 'https://logelite.com/career/hr-executive-apply',
    company: 'Logelite',
    country: 'India',
    link: 'https://logelite.com/career/hr-executive-apply',
    source: 'logelite',
    scrapedAt: '2026-07-18T00:00:00.000Z',
  })
})
