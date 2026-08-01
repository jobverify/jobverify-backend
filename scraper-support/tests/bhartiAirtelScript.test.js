import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-14T00:00:00.000Z'

const officialCareersHtml = `
  <!doctype html><html lang="en"><head>
    <meta charset="utf-8"/>
    <meta name="description" content="Airtel Careers"/>
    <link rel="manifest" href="/manifest.json"/>
    <title>Airtel Careers</title>
    <script defer="defer" src="/static/js/main.57023176.js"></script>
    <link href="/static/css/main.48883c3c.css" rel="stylesheet">
  </head><body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body></html>
`

const careersBundle = `
  module.exports = JSON.parse('{
    "darwinboxURL":"https://airtel.darwinbox.in/ms/candidatev2/main/careers/allJobs",
    "apiUrl":"https://careersapi.airtel.com/"
  }');
  const nav = [{ name: "Jobs", URL: config.darwinboxURL }];
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'airtel-001',
      title: 'Network Engineer',
      department_name: 'Technology',
      locations: 'Gurugram, Haryana, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '4 - 6 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Build telecom reliability systems.</p>',
    },
    {
      id: 'airtel-us-001',
      title: 'US Role',
      department_name: 'Technology',
      locations: 'Dallas, Texas, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '4 - 6 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadBhartiAirtelModule = async () => {
  try {
    return await import('../../scraper/bhartiairtel/script.js')
  } catch {
    assert.fail('Expected Bharti Airtel scraper module at ../../scraper/bhartiairtel/script.js')
  }
}

test('Bharti Airtel scraper keeps the verified official careers Darwinbox pointer explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createBhartiAirtelScraper,
    extractOfficialAirtelBundleUrl,
    hasOfficialBhartiAirtelBundleSignals,
    hasOfficialBhartiAirtelCareersShell,
  } = await loadBhartiAirtelModule()

  assert.equal(COMPANY_NAME, 'Bharti Airtel')
  assert.equal(SOURCE, 'bhartiairtel')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://airtel.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://careers.airtel.com/')
  assert.equal(PUBLIC_PORTAL_URL, 'https://airtel.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(
    extractOfficialAirtelBundleUrl(officialCareersHtml),
    'https://careers.airtel.com/static/js/main.57023176.js',
  )
  assert.equal(hasOfficialBhartiAirtelCareersShell(officialCareersHtml), true)
  assert.equal(hasOfficialBhartiAirtelBundleSignals(careersBundle), true)
  assert.equal(
    hasOfficialBhartiAirtelBundleSignals(careersBundle.replace(PUBLIC_PORTAL_URL, 'https://example.com/jobs')),
    false,
  )

  const scraper = createBhartiAirtelScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => (url === OFFICIAL_CAREERS_URL
        ? officialCareersHtml
        : careersBundle.replace(PUBLIC_PORTAL_URL, 'https://example.com/jobs')),
      fetchListingPage: async () => listingPayload,
    }),
    /verified careers bundle no longer exposes the official Darwinbox public surface/i,
  )
})

test('run maps Bharti Airtel Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
  const { createBhartiAirtelScraper } = await loadBhartiAirtelModule()
  const scraper = createBhartiAirtelScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedPages = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      if (url === 'https://careers.airtel.com/') return officialCareersHtml
      if (url === 'https://careers.airtel.com/static/js/main.57023176.js') return careersBundle
      throw new Error(`Unexpected Airtel URL: ${url}`)
    },
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      return listingPayload
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs, [
    {
      title: 'Network Engineer',
      company: 'Bharti Airtel',
      department: 'Technology',
      location: 'Gurugram, Haryana, India',
      city: 'Gurugram',
      jobId: 'airtel-001',
      requisitionId: null,
      sourceUrl: 'https://airtel.darwinbox.in/ms/candidatev2/main/careers/jobDetails/airtel-001',
      applyUrl: 'https://airtel.darwinbox.in/ms/candidatev2/main/careers/jobDetails/airtel-001',
      employmentType: 'Full Time',
      experienceRequired: '4 - 6 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '14-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Build telecom reliability systems.</p>',
      source: 'bhartiairtel',
      link: 'https://airtel.darwinbox.in/ms/candidatev2/main/careers/jobDetails/airtel-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('run can recover with browser-backed Airtel careers verification when direct official requests fail', async () => {
  const { createBhartiAirtelScraper, OFFICIAL_CAREERS_URL } = await loadBhartiAirtelModule()
  const scraper = createBhartiAirtelScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const attempts = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      attempts.push(`http:${url}`)
      throw new TypeError('fetch failed')
    },
    fetchBrowserText: async (url) => {
      attempts.push(`browser:${url}`)
      if (url === OFFICIAL_CAREERS_URL) return officialCareersHtml
      if (url === 'https://careers.airtel.com/static/js/main.57023176.js') return careersBundle
      throw new Error(`Unexpected browser Airtel URL: ${url}`)
    },
    fetchListingPage: async () => listingPayload,
  })

  assert.deepEqual(attempts, [
    `http:${OFFICIAL_CAREERS_URL}`,
    `browser:${OFFICIAL_CAREERS_URL}`,
    'http:https://careers.airtel.com/static/js/main.57023176.js',
    'browser:https://careers.airtel.com/static/js/main.57023176.js',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'bhartiairtel')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})
