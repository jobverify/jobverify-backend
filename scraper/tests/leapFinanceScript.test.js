import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const officialHomepageHtml = `
  <html>
    <head>
      <title>Study Abroad Education Loan for You | Leap Finance</title>
    </head>
    <body>
      <h1>Study abroad education loan</h1>
      <p>Leap Finance helps students fund global education goals.</p>
    </body>
  </html>
`

const officialCareersHtml = `
  <html>
    <head>
      <title>Leap Careers Page</title>
    </head>
    <body>
      <h1>Open roles</h1>
      <script>
        const API_URL = "https://careers-api-eight.vercel.app/api/jobs";
        let allJobs = [];
        allJobs = data.Jobs || [];
      </script>
      <p>grouped[dept].length + " Open roles"</p>
    </body>
  </html>
`

const jobsPayload = {
  Jobs: [
    {
      JobId: '0ee5f392-9983-4b4c-b523-b03122d3ad49',
      JobTitle: 'Senior Sales Associate',
      JobDescriptionV2: '<p>Drive counselling conversions across study-abroad leads.</p>',
      JobCode: 'L-44630',
      Department: 'Counselling',
      Location: '[{"Address":"Bengaluru, Karnataka, India","PlaceId":null}]',
      Experience: {
        MinExp: 1,
        MaxExp: 5,
      },
      JobType: 'Full Time',
      Skills: ['Sales ', 'Inside Sales'],
      CompanyName: 'Leap',
      ApplyUrl: 'https://app.turbohire.co/job/publicjobs/0ee5f392-9983-4b4c-b523-b03122d3ad49?utm_source=CareerPage',
      PublishedDate: '2026-07-02T07:40:05.7853854Z',
      PromotionExpiryDate: '2026-08-01T18:29:00.949Z',
    },
    {
      JobId: 'us-role-001',
      JobTitle: 'US Market Counselor',
      JobDescriptionV2: '<p>Ignore non-India role.</p>',
      JobCode: 'L-99999',
      Department: 'Counselling',
      Location: '[{"Address":"New York, New York, United States","PlaceId":null}]',
      Experience: {
        MinExp: 2,
        MaxExp: 6,
      },
      JobType: 'Full Time',
      Skills: ['Counselling'],
      CompanyName: 'Leap',
      ApplyUrl: 'https://app.turbohire.co/job/publicjobs/us-role-001?utm_source=CareerPage',
      PublishedDate: '2026-07-10T00:00:00.000Z',
      PromotionExpiryDate: '2026-08-01T18:29:00.949Z',
    },
  ],
}

const loadLeapFinanceModule = async () => {
  try {
    return await import('../leapfinance/script.js')
  } catch {
    assert.fail('Expected Leap Finance scraper module at ../leapfinance/script.js')
  }
}

test('Leap Finance scraper keeps the verified exact-name careers API handoff explicit and fails closed on drift', async () => {
  const leapFinance = await loadLeapFinanceModule()

  assert.equal(leapFinance.SOURCE, 'leapfinance')
  assert.equal(leapFinance.COMPANY_NAME, 'Leap Finance')
  assert.equal(leapFinance.HOMEPAGE_URL, 'https://leapfinance.com/')
  assert.equal(leapFinance.CAREERS_URL, 'https://careers.leapfinance.com/')
  assert.equal(leapFinance.JOBS_API_URL, 'https://careers-api-eight.vercel.app/api/jobs')
  assert.equal(leapFinance.VERIFIED_ON, '2026-07-16')
  assert.equal(leapFinance.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(leapFinance.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    leapFinance.hasOfficialCareersSignal(
      officialCareersHtml.replace(
        'https://careers-api-eight.vercel.app/api/jobs',
        'https://example.com/api/jobs',
      ),
    ),
    false,
  )

  const scraper = leapFinance.createLeapFinanceScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === leapFinance.HOMEPAGE_URL) return officialHomepageHtml
        return officialCareersHtml.replace(
          'https://careers-api-eight.vercel.app/api/jobs',
          'https://example.com/api/jobs',
        )
      },
      fetchJson: async () => jobsPayload,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('run maps verified Leap Finance API jobs into Jobify jobs and keeps only India roles', async () => {
  const { createLeapFinanceScraper } = await loadLeapFinanceModule()
  const scraper = createLeapFinanceScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedUrls = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return url === 'https://leapfinance.com/' ? officialHomepageHtml : officialCareersHtml
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return jobsPayload
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://leapfinance.com/',
    'https://careers.leapfinance.com/',
    'https://careers-api-eight.vercel.app/api/jobs',
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Senior Sales Associate',
      company: 'Leap Finance',
      department: 'Counselling',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '0ee5f392-9983-4b4c-b523-b03122d3ad49',
      requisitionId: 'L-44630',
      sourceUrl: 'https://app.turbohire.co/job/publicjobs/0ee5f392-9983-4b4c-b523-b03122d3ad49?utm_source=CareerPage',
      applyUrl: 'https://app.turbohire.co/job/publicjobs/0ee5f392-9983-4b4c-b523-b03122d3ad49?utm_source=CareerPage',
      employmentType: 'Full Time',
      experienceRequired: '1-5 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Sales', 'Inside Sales'],
      postingDate: '2026-07-02T07:40:05.7853854Z',
      closingDate: '2026-08-01T18:29:00.949Z',
      jobDescription: 'Drive counselling conversions across study-abroad leads.',
      source: 'leapfinance',
      link: 'https://app.turbohire.co/job/publicjobs/0ee5f392-9983-4b4c-b523-b03122d3ad49?utm_source=CareerPage',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
