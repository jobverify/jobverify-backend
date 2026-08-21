import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-14T19:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <title>Careers | Bajaj Markets</title>
      <link rel="canonical" href="https://www.bajajfinservmarkets.in/careers">
    </head>
    <body>
      <h1>Careers</h1>
      <p>Click here to see our open positions</p>
      <a href="https://hrisbdirect.darwinbox.in/ms/candidate/careers">Open positions</a>
    </body>
  </html>
`

const maintenanceCareersHtml = `
  <html>
    <head>
      <title>Maintenance Alert</title>
    </head>
    <body>
      <h1>Maintenance Alert!</h1>
      <p>We'll Be Right Back!</p>
      <p>A quick tune-up break. We'll be live again on 16th August 2026.</p>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'bfm-001',
      title: 'Product Manager',
      department_name: 'Product',
      locations: 'Pune, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '4 - 7 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Build lending and marketplace products.</p>',
    },
    {
      id: 'bfm-us-001',
      title: 'US Role',
      department_name: 'Product',
      locations: 'New York, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '4 - 7 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadBajajMarketsModule = async () => {
  try {
    return await import('../../scraper/bajajmarkets/script.js')
  } catch {
    assert.fail('Expected Bajaj Markets scraper module at ../../scraper/bajajmarkets/script.js')
  }
}

test('Bajaj Markets scraper keeps the verified official Darwinbox handoff explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createBajajMarketsScraper,
    extractOfficialDarwinboxUrl,
    hasOfficialBajajMarketsCareersSignals,
    hasOfficialBajajMarketsMaintenanceSignal,
  } = await loadBajajMarketsModule()

  assert.equal(COMPANY_NAME, 'Bajaj Markets')
  assert.equal(SOURCE, 'bajajmarkets')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://hrisbdirect.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.bajajfinservmarkets.in/careers')
  assert.equal(OFFICIAL_CAREERS_HANDOFF_URL, 'https://hrisbdirect.darwinbox.in/ms/candidate/careers')
  assert.equal(PUBLIC_PORTAL_URL, 'https://hrisbdirect.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(extractOfficialDarwinboxUrl(officialCareersHtml), OFFICIAL_CAREERS_HANDOFF_URL)
  assert.equal(hasOfficialBajajMarketsCareersSignals(officialCareersHtml), true)
  assert.equal(hasOfficialBajajMarketsMaintenanceSignal(maintenanceCareersHtml), true)
  assert.equal(
    hasOfficialBajajMarketsCareersSignals(
      officialCareersHtml.replace(OFFICIAL_CAREERS_HANDOFF_URL, 'https://example.com/jobs'),
    ),
    false,
  )

  const scraper = createBajajMarketsScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () =>
        officialCareersHtml.replace(OFFICIAL_CAREERS_HANDOFF_URL, 'https://example.com/jobs'),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('run maps Bajaj Markets Darwinbox listings into Jobverify jobs and keeps only India roles', async () => {
  const { createBajajMarketsScraper } = await loadBajajMarketsModule()
  const scraper = createBajajMarketsScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedPages = []

  const jobs = await scraper.run({
    fetchText: async () => officialCareersHtml,
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      return listingPayload
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs, [
    {
      title: 'Product Manager',
      company: 'Bajaj Markets',
      department: 'Product',
      location: 'Pune, Maharashtra, India',
      city: 'Pune',
      jobId: 'bfm-001',
      requisitionId: null,
      sourceUrl: 'https://hrisbdirect.darwinbox.in/ms/candidatev2/main/careers/jobDetails/bfm-001',
      applyUrl: 'https://hrisbdirect.darwinbox.in/ms/candidatev2/main/careers/jobDetails/bfm-001',
      employmentType: 'Full Time',
      experienceRequired: '4 - 7 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '14-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Build lending and marketplace products.</p>',
      source: 'bajajmarkets',
      link: 'https://hrisbdirect.darwinbox.in/ms/candidatev2/main/careers/jobDetails/bfm-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('run preserves the verified Bajaj Markets Darwinbox board while the official careers page shows branded maintenance copy', async () => {
  const { createBajajMarketsScraper } = await loadBajajMarketsModule()
  const scraper = createBajajMarketsScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    fetchText: async () => maintenanceCareersHtml,
    fetchListingPage: async () => listingPayload,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'bajajmarkets')
  assert.equal(jobs[0].title, 'Product Manager')
})

test('run can recover the official Bajaj Markets careers handoff with a browser-backed HTML fetch', async () => {
  const { createBajajMarketsScraper, OFFICIAL_CAREERS_URL } = await loadBajajMarketsModule()
  const scraper = createBajajMarketsScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const browserUrls = []

  const jobs = await scraper.run({
    fetchText: async () => {
      throw new Error(`HTTP 403 for ${OFFICIAL_CAREERS_URL}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return officialCareersHtml
    },
    fetchListingPage: async () => listingPayload,
  })

  assert.deepEqual(browserUrls, [OFFICIAL_CAREERS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'bajajmarkets')
})
