import assert from 'node:assert/strict'
import test from 'node:test'

const MARKETPLACE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>TCS iON Jobs: Explore opportunities and give your career a boost</title>
  </head>
  <body>
    <main>
      <p>Search by Job Role, Company, or Skills</p>
      <p>No Records Found</p>
      <h2>Find the Best-suited Jobs for You</h2>
      <p>Explore opportunities from leading companies and give your career a boost.</p>
      <h2>Featured Companies Hiring</h2>
      <div class="featured-company"><h4>Nest Digital</h4></div>
      <div class="featured-company"><h4>TATA ELXSI</h4></div>
      <div class="featured-company"><h4>Publicis sapient</h4></div>
      <div class="featured-company"><h4>Vedantu</h4></div>
    </main>
  </body>
</html>
`

const EXACT_NAME_PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>TCS iON Careers</title>
  </head>
  <body>
    <article>
      <h2>Associate Product Manager</h2>
      <p>Company: TCS iON</p>
      <p>Posted by: TCS iON</p>
      <a href="https://www.tcsion.com/job-openings/tcs-ion-associate-product-manager">Apply now</a>
    </article>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/tcsion/script.js')
  } catch {
    assert.fail('Expected TCS iON scraper module at ../../scraper/tcsion/script.js')
  }
}

test('TCS iON sentinel helpers stay pinned to the verified first-party jobs marketplace instead of an exact-name employer feed', async () => {
  const tcsIon = await loadScriptModule()

  assert.equal(tcsIon.SOURCE, 'tcsion')
  assert.equal(tcsIon.COMPANY, 'TCS iON')
  assert.equal(tcsIon.OFFICIAL_BRAND_NAME, 'TCS iON')
  assert.equal(tcsIon.VERIFIED_ON, '2026-07-17')
  assert.equal(tcsIon.HOMEPAGE_URL, 'https://www.tcsion.com/')
  assert.equal(tcsIon.CAREERS_URL, 'https://www.tcsion.com/jobs/')
  assert.equal(
    tcsIon.SAMPLE_MARKETPLACE_LISTING_URL,
    'https://www.tcsion.com/job-openings/jobs-in-hyderabad',
  )
  assert.equal(tcsIon.hasOfficialJobsMarketplaceSignal(MARKETPLACE_HTML), true)
  assert.deepEqual(tcsIon.extractFeaturedCompanyNames(MARKETPLACE_HTML), [
    'Nest Digital',
    'TATA ELXSI',
    'Publicis sapient',
    'Vedantu',
  ])
  assert.equal(tcsIon.marketplaceAppearsGenericMultiCompany(MARKETPLACE_HTML), true)
  assert.equal(tcsIon.marketplaceExposesExactNameJobs(MARKETPLACE_HTML), false)
  assert.equal(tcsIon.marketplaceExposesExactNameJobs(EXACT_NAME_PUBLIC_JOBS_HTML), true)
})

test('TCS iON returns [] for the verified multi-company marketplace and fails closed if exact-name public jobs appear', async () => {
  const tcsIon = await loadScriptModule()
  const requestedUrls = []

  const jobs = await tcsIon.createTcsIonScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === tcsIon.CAREERS_URL) {
        return { status: 200, url, html: MARKETPLACE_HTML }
      }

      throw new Error(`Unexpected TCS iON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [tcsIon.CAREERS_URL])
  assert.deepEqual(jobs, [])

  await assert.rejects(
    tcsIon.createTcsIonScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: tcsIon.CAREERS_URL,
        html: EXACT_NAME_PUBLIC_JOBS_HTML,
      }),
    }),
    /exact-name public jobs/i,
  )

  await assert.rejects(
    tcsIon.createTcsIonScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: tcsIon.CAREERS_URL,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified jobs marketplace changed materially/i,
  )
})

test('TCS iON returns [] when the verified marketplace host times out', async () => {
  const tcsIon = await loadScriptModule()

  const jobs = await tcsIon.createTcsIonScraper().run({
    fetchPage: async () => {
      throw new Error(`Connect Timeout Error for ${tcsIon.CAREERS_URL}`)
    },
  })

  assert.deepEqual(jobs, [])
})
