import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-25T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career at BuyUcoin | India's first Bitcoin and Cryptocurrency Exchange</title>
    <link rel="canonical" href="https://www.buyucoin.com/career" />
  </head>
  <body>
    <main>
      <h1>Join the Team that celebrates each other.</h1>
      <p>Your life at BuyUcoin</p>
      <section>
        <h2>Job Opportunities</h2>
        <h6>Software Developer- Node.js</h6>
        <p>Noida, India</p>
        <a href="https://www.naukri.com/job-listings-software-developer-node-js-buyucoin-noida-123456">Apply Now</a>

        <h6>Software Quality Analyst Engineer</h6>
        <p>Noida, India</p>
        <a href="https://in.indeed.com/viewjob?jk=buyucoin-qa-123456">Apply Now</a>

        <h6>Graphic Designer (Fresher)</h6>
        <p>Noida, India</p>
        <a href="https://in.indeed.com/viewjob?jk=buyucoin-graphic-123456">Apply Now</a>

        <h6>Digital Media Executiver</h6>
        <p>Noida, India</p>
        <a href="https://in.indeed.com/viewjob?jk=buyucoin-digital-media-123456">Apply Now</a>
      </section>
      <section>
        <h2>Learn Our Recruitment Process</h2>
        <p>Submit your resume on <a href="mailto:hr@buyucoin.com">hr@buyucoin.com</a> for further process.</p>
      </section>
    </main>
  </body>
</html>
`

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/buyucoin/provider.js')
  } catch {
    assert.fail('Expected BuyUcoin provider module at ../../scraper/buyucoin/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/buyucoin/script.js')
  } catch {
    assert.fail('Expected BuyUcoin scraper module at ../../scraper/buyucoin/script.js')
  }
}

test('BuyUcoin exports provider metadata for the verified first-party careers listings page', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'buyucoin',
    companyName: 'BuyUcoin',
    officialBrandName: 'BuyUcoin',
    adapter: 'script',
    modulePath: '../../scraper/buyucoin/script.js',
    homepageUrl: 'https://www.buyucoin.com/',
    companyCareerPage: 'https://www.buyucoin.com/career',
    atsPlatform: 'official-company-careers',
    countryFilter: 'India',
    paginationStrategy: 'single-first-party-careers-page',
    extractionStrategy: 'verified-first-party-careers-page+inline-openings+external-apply-links',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'buyucoin.com',
    verifiedOn: '2026-07-25',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 25, 2026 that https://www.buyucoin.com/career was the live first-party BuyUcoin careers page and that it publicly listed Job Opportunities entries for Software Developer- Node.js, Software Quality Analyst Engineer, Graphic Designer (Fresher), and Digital Media Executiver in Noida, India with outbound Apply Now links.',
    dryRunFile: 'buyucoin/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('BuyUcoin extracts the verified inline openings and outbound apply links', async () => {
  const buyucoin = await loadScriptModule()

  assert.equal(buyucoin.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await buyucoin.run({
    fetchText: async () => careersHtml,
    now: () => FIXED_SCRAPED_AT,
  })

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Software Developer- Node.js',
    location: 'Noida, India',
    sourceUrl: 'https://www.buyucoin.com/career',
    applyUrl: 'https://www.naukri.com/job-listings-software-developer-node-js-buyucoin-noida-123456',
    company: 'BuyUcoin',
    country: 'India',
    link: 'https://www.naukri.com/job-listings-software-developer-node-js-buyucoin-noida-123456',
    source: 'buyucoin',
    scrapedAt: '2026-07-25T00:00:00.000Z',
  })
})
