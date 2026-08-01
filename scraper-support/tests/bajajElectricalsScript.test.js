import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-14T18:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <title>Careers &ndash; Bajaj Electricals India</title>
      <link rel="canonical" href="https://www.bajajelectricals.com/pages/careers">
    </head>
    <body>
      <h1>Careers at Bajaj Electricals</h1>
      <a href="https://bel.darwinbox.com/ms/candidatev2/main/careers/allJobs">View jobs</a>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'bel-001',
      title: 'Area Sales Manager',
      department_name: 'Sales',
      locations: 'Mumbai, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '5 - 8 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Lead regional sales operations.</p>',
    },
    {
      id: 'bel-us-001',
      title: 'US Role',
      department_name: 'Sales',
      locations: 'New York, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '5 - 8 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadBajajElectricalsModule = async () => {
  try {
    return await import('../../scraper/bajajelectricals/script.js')
  } catch {
    assert.fail('Expected Bajaj Electricals scraper module at ../../scraper/bajajelectricals/script.js')
  }
}

test('Bajaj Electricals scraper keeps the verified official Darwinbox pointer explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createBajajElectricalsScraper,
    extractOfficialDarwinboxUrl,
    hasOfficialBajajElectricalsCareersSignals,
  } = await loadBajajElectricalsModule()

  assert.equal(COMPANY_NAME, 'Bajaj Electricals')
  assert.equal(SOURCE, 'bajajelectricals')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://bel.darwinbox.com')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.bajajelectricals.com/pages/careers')
  assert.equal(PUBLIC_PORTAL_URL, 'https://bel.darwinbox.com/ms/candidatev2/main/careers/allJobs')
  assert.equal(extractOfficialDarwinboxUrl(officialCareersHtml), PUBLIC_PORTAL_URL)
  assert.equal(hasOfficialBajajElectricalsCareersSignals(officialCareersHtml), true)
  assert.equal(
    hasOfficialBajajElectricalsCareersSignals(
      officialCareersHtml.replace(PUBLIC_PORTAL_URL, 'https://example.com/jobs'),
    ),
    false,
  )

  const scraper = createBajajElectricalsScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml.replace(PUBLIC_PORTAL_URL, 'https://example.com/jobs'),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('run maps Bajaj Electricals Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
  const { createBajajElectricalsScraper } = await loadBajajElectricalsModule()
  const scraper = createBajajElectricalsScraper({
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
      title: 'Area Sales Manager',
      company: 'Bajaj Electricals',
      department: 'Sales',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: 'bel-001',
      requisitionId: null,
      sourceUrl: 'https://bel.darwinbox.com/ms/candidatev2/main/careers/jobDetails/bel-001',
      applyUrl: 'https://bel.darwinbox.com/ms/candidatev2/main/careers/jobDetails/bel-001',
      employmentType: 'Full Time',
      experienceRequired: '5 - 8 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '14-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Lead regional sales operations.</p>',
      source: 'bajajelectricals',
      link: 'https://bel.darwinbox.com/ms/candidatev2/main/careers/jobDetails/bel-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
