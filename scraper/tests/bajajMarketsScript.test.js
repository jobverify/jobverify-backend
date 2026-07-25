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
    return await import('../bajajmarkets/script.js')
  } catch {
    assert.fail('Expected Bajaj Markets scraper module at ../bajajmarkets/script.js')
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

test('run maps Bajaj Markets Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
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
