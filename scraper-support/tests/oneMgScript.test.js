import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-14T00:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <title>Careers@Tata1mg</title>
      <link rel="canonical" href="https://www.1mg.com/jobs">
    </head>
    <body>
      <h1>MAKE YOUR MARK IN HEALTHCARE.</h1>
      <p>We are a team of 4000+ folks, serving in more than 1800 cities with 50+ retail stores.</p>
      <a href="https://1mg.darwinbox.in/jobs">View Openings</a>
      <a href="https://1mg.darwinbox.in/jobs">Explore jobs</a>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: '1mg-001',
      title: 'Software Development Engineer',
      department_name: 'Engineering',
      locations: 'Gurugram, Haryana, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '3 - 5 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Build healthcare commerce systems.</p>',
    },
    {
      id: '1mg-us-001',
      title: 'US Role',
      department_name: 'Engineering',
      locations: 'New York, New York, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '3 - 5 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadOneMgModule = async () => {
  try {
    return await import('../../scraper/1mg/script.js')
  } catch {
    assert.fail('Expected 1mg scraper module at ../../scraper/1mg/script.js')
  }
}

const replaceOfficialHandoffUrl = (html, replacement) =>
  html.replace(/https:\/\/1mg\.darwinbox\.in\/jobs/g, replacement)

test('1mg scraper keeps the verified official Darwinbox handoff explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createOneMgScraper,
    extractOfficialDarwinboxUrl,
    hasOfficialOneMgCareersSignals,
  } = await loadOneMgModule()

  assert.equal(COMPANY_NAME, '1mg')
  assert.equal(SOURCE, '1mg')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://1mg.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.1mg.com/jobs')
  assert.equal(OFFICIAL_CAREERS_HANDOFF_URL, 'https://1mg.darwinbox.in/jobs')
  assert.equal(
    PUBLIC_PORTAL_URL,
    'https://1mg.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(extractOfficialDarwinboxUrl(officialCareersHtml), OFFICIAL_CAREERS_HANDOFF_URL)
  assert.equal(hasOfficialOneMgCareersSignals(officialCareersHtml), true)
  assert.equal(
    hasOfficialOneMgCareersSignals(
      replaceOfficialHandoffUrl(officialCareersHtml, 'https://example.com/jobs'),
    ),
    false,
  )

  const scraper = createOneMgScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => replaceOfficialHandoffUrl(officialCareersHtml, 'https://example.com/jobs'),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('run maps verified 1mg Darwinbox listings into Jobverify jobs and keeps only India roles', async () => {
  const { createOneMgScraper } = await loadOneMgModule()
  const scraper = createOneMgScraper({
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
      title: 'Software Development Engineer',
      company: '1mg',
      department: 'Engineering',
      location: 'Gurugram, Haryana, India',
      city: 'Gurugram',
      jobId: '1mg-001',
      requisitionId: null,
      sourceUrl: 'https://1mg.darwinbox.in/ms/candidatev2/main/careers/jobDetails/1mg-001',
      applyUrl: 'https://1mg.darwinbox.in/ms/candidatev2/main/careers/jobDetails/1mg-001',
      employmentType: 'Full Time',
      experienceRequired: '3 - 5 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '14-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Build healthcare commerce systems.</p>',
      source: '1mg',
      link: 'https://1mg.darwinbox.in/ms/candidatev2/main/careers/jobDetails/1mg-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
