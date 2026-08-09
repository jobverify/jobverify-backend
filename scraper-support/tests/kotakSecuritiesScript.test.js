import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <title>Know More About Careers at Kotak Neo</title>
    </head>
    <body>
      <section>
        <h1>Careers at Kotak Neo</h1>
        <p>Check out the latest job openings in Kotak Neo and build your career with us.</p>
        <p>Kotak Securities is now Kotak Neo.</p>
        <a href="https://kotaksecurities.darwinbox.in/ms/candidate/careers/">Apply Now</a>
      </section>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'kotak-001',
      title: 'Relationship Manager',
      department_name: 'Sales',
      locations: 'Mumbai, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '3 - 6 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>Drive broking client acquisition and retention.</p>',
    },
    {
      id: 'kotak-us-001',
      title: 'US Role',
      department_name: 'Sales',
      locations: 'New York, New York, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '3 - 6 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadKotakSecuritiesModule = async () => {
  try {
    return await import('../../scraper/kotaksecurities/script.js')
  } catch {
    assert.fail('Expected Kotak Securities scraper module at ../../scraper/kotaksecurities/script.js')
  }
}

const replaceOfficialHandoffUrl = (html, replacement) =>
  html.replace(
    /https:\/\/kotaksecurities\.darwinbox\.in\/ms\/candidate\/careers\//g,
    replacement,
  )

test('Kotak Securities scraper keeps the verified official Darwinbox handoff explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    HOMEPAGE_URL,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createKotakSecuritiesScraper,
    extractOfficialDarwinboxUrl,
    hasOfficialKotakSecuritiesCareersSignals,
  } = await loadKotakSecuritiesModule()

  assert.equal(COMPANY_NAME, 'Kotak Securities')
  assert.equal(SOURCE, 'kotaksecurities')
  assert.equal(HOMEPAGE_URL, 'https://www.kotaksecurities.com/')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://kotaksecurities.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.kotakneo.com/about-us/careers/')
  assert.equal(
    OFFICIAL_CAREERS_HANDOFF_URL,
    'https://kotaksecurities.darwinbox.in/ms/candidate/careers/',
  )
  assert.equal(
    PUBLIC_PORTAL_URL,
    'https://kotaksecurities.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(extractOfficialDarwinboxUrl(officialCareersHtml), OFFICIAL_CAREERS_HANDOFF_URL)
  assert.equal(hasOfficialKotakSecuritiesCareersSignals(officialCareersHtml), true)
  assert.equal(
    hasOfficialKotakSecuritiesCareersSignals(
      replaceOfficialHandoffUrl(officialCareersHtml, 'https://example.com/jobs'),
    ),
    false,
  )

  const scraper = createKotakSecuritiesScraper({
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

test('run maps verified Kotak Securities Darwinbox listings into Jobverify jobs and keeps only India roles', async () => {
  const { createKotakSecuritiesScraper } = await loadKotakSecuritiesModule()
  const scraper = createKotakSecuritiesScraper({
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
      title: 'Relationship Manager',
      company: 'Kotak Securities',
      department: 'Sales',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: 'kotak-001',
      requisitionId: null,
      sourceUrl: 'https://kotaksecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/kotak-001',
      applyUrl: 'https://kotaksecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/kotak-001',
      employmentType: 'Full Time',
      experienceRequired: '3 - 6 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Drive broking client acquisition and retention.</p>',
      source: 'kotaksecurities',
      link: 'https://kotaksecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/kotak-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
