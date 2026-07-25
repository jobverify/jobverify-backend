import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <title>Quick Heal Careers - Be Part of Our Security Innovations</title>
    </head>
    <body>
      <h1>Careers</h1>
      <p>Work with purpose. Grow from the experience. Innovate to shape the future with Quick Heal</p>
      <p>Innovator. Curious. Growth-mindset. Positive. Sounds like you?</p>
      <a href="https://lifecycleqhtl.darwinbox.in/ms/candidate/careers">Apply for a job</a>
      <a href="https://lifecycleqhtl.darwinbox.in/ms/candidate/careers">Join Our Innovative Team</a>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'qh-001',
      title: 'Senior Threat Researcher',
      department_name: 'Security Research',
      locations: 'Pune, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '4 - 8 Years',
      posted_on: '17-Jul-2026',
      jd: '<p>Investigate emerging malware and build detections.</p>',
    },
    {
      id: 'qh-us-001',
      title: 'US Security Analyst',
      department_name: 'Security Research',
      locations: 'Austin, Texas, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '4 - 8 Years',
      posted_on: '17-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadQuickHealModule = async () => {
  try {
    return await import('../quickheal/script.js')
  } catch {
    assert.fail('Expected Quick Heal scraper module at ../quickheal/script.js')
  }
}

const replaceOfficialHandoffUrl = (html, replacement) =>
  html.replace(/https:\/\/lifecycleqhtl\.darwinbox\.in\/ms\/candidate\/careers/g, replacement)

test('Quick Heal scraper keeps the verified official Darwinbox handoff explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createQuickHealScraper,
    extractOfficialDarwinboxUrl,
    hasOfficialQuickHealCareersSignals,
  } = await loadQuickHealModule()

  assert.equal(COMPANY_NAME, 'Quick Heal')
  assert.equal(SOURCE, 'quickheal')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://lifecycleqhtl.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.quickheal.com/jobs-careers-at-quick-heal')
  assert.equal(
    OFFICIAL_CAREERS_HANDOFF_URL,
    'https://lifecycleqhtl.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    PUBLIC_PORTAL_URL,
    'https://lifecycleqhtl.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(extractOfficialDarwinboxUrl(officialCareersHtml), OFFICIAL_CAREERS_HANDOFF_URL)
  assert.equal(hasOfficialQuickHealCareersSignals(officialCareersHtml), true)
  assert.equal(
    hasOfficialQuickHealCareersSignals(
      replaceOfficialHandoffUrl(officialCareersHtml, 'https://example.com/jobs'),
    ),
    false,
  )

  const scraper = createQuickHealScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () =>
        replaceOfficialHandoffUrl(officialCareersHtml, 'https://example.com/jobs'),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('run maps verified Quick Heal Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
  const { createQuickHealScraper } = await loadQuickHealModule()
  const scraper = createQuickHealScraper({
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
      title: 'Senior Threat Researcher',
      company: 'Quick Heal',
      department: 'Security Research',
      location: 'Pune, Maharashtra, India',
      city: 'Pune',
      jobId: 'qh-001',
      requisitionId: null,
      sourceUrl: 'https://lifecycleqhtl.darwinbox.in/ms/candidatev2/main/careers/jobDetails/qh-001',
      applyUrl: 'https://lifecycleqhtl.darwinbox.in/ms/candidatev2/main/careers/jobDetails/qh-001',
      employmentType: 'Full Time',
      experienceRequired: '4 - 8 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '17-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Investigate emerging malware and build detections.</p>',
      source: 'quickheal',
      link: 'https://lifecycleqhtl.darwinbox.in/ms/candidatev2/main/careers/jobDetails/qh-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
