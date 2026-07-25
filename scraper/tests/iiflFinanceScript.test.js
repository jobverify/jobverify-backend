import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers with IIFL - Leading Finance Company | IIFL Finance</title>
    <link rel="canonical" href="https://www.iifl.com/finance/career" />
  </head>
  <body>
    <h1>Find your next great career</h1>
    <a href="https://iifl.darwinbox.in/ms/candidate/careers">Find Jobs</a>
    <a href="https://iifl.darwinbox.in/ms/candidate/careers/others?apply=1">Upload Resume</a>
  </body>
</html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'iifl-001',
      title: 'Software Engineer',
      department_name: 'Engineering',
      locations: 'Mumbai, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '3 - 5 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>Build lending systems.</p>',
    },
    {
      id: 'iifl-uae-001',
      title: 'Regional Operations Manager',
      department_name: 'Operations',
      locations: 'Dubai, United Arab Emirates',
      country: 'United Arab Emirates',
      emp_type_name: 'Full Time',
      experience: '6 - 8 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../iiflfinance/script.js')
  } catch {
    assert.fail('Expected IIFL Finance scraper module at ../iiflfinance/script.js')
  }
}

const replaceUrl = (html, currentUrl, replacementUrl) =>
  html.replace(new RegExp(currentUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacementUrl)

test('IIFL Finance keeps the verified official Darwinbox handoff explicit and fails closed on drift', async () => {
  const iiflFinance = await loadModule()

  assert.equal(iiflFinance.COMPANY_NAME, 'IIFL Finance')
  assert.equal(iiflFinance.SOURCE, 'iiflfinance')
  assert.equal(iiflFinance.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(iiflFinance.DARWINBOX_ORIGIN, 'https://iifl.darwinbox.in')
  assert.equal(iiflFinance.OFFICIAL_CAREERS_URL, 'https://www.iifl.com/finance/career')
  assert.equal(
    iiflFinance.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://iifl.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    iiflFinance.OFFICIAL_RESUME_SUBMISSION_URL,
    'https://iifl.darwinbox.in/ms/candidate/careers/others?apply=1',
  )
  assert.equal(
    iiflFinance.PUBLIC_PORTAL_URL,
    'https://iifl.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    iiflFinance.LISTING_API_URL,
    'https://iifl.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    iiflFinance.extractOfficialDarwinboxUrl(officialCareersHtml),
    iiflFinance.OFFICIAL_CAREERS_HANDOFF_URL,
  )
  assert.equal(
    iiflFinance.extractUploadResumeUrl(officialCareersHtml),
    iiflFinance.OFFICIAL_RESUME_SUBMISSION_URL,
  )
  assert.equal(iiflFinance.hasOfficialIiflCareersSignals(officialCareersHtml), true)
  assert.equal(
    iiflFinance.hasOfficialIiflCareersSignals(
      replaceUrl(
        officialCareersHtml,
        'https://iifl.darwinbox.in/ms/candidate/careers',
        'https://example.com/jobs',
      ),
    ),
    false,
  )
  assert.equal(
    iiflFinance.hasOfficialIiflCareersSignals(
      replaceUrl(
        officialCareersHtml,
        'https://iifl.darwinbox.in/ms/candidate/careers/others?apply=1',
        'https://example.com/upload',
      ),
    ),
    false,
  )

  const scraper = iiflFinance.createIiflFinanceScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () =>
        replaceUrl(
          officialCareersHtml,
          'https://iifl.darwinbox.in/ms/candidate/careers',
          'https://example.com/jobs',
        ),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('IIFL Finance maps verified Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
  const iiflFinance = await loadModule()
  const scraper = iiflFinance.createIiflFinanceScraper({
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
      title: 'Software Engineer',
      company: 'IIFL Finance',
      department: 'Engineering',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: 'iifl-001',
      requisitionId: null,
      sourceUrl: 'https://iifl.darwinbox.in/ms/candidatev2/main/careers/jobDetails/iifl-001',
      applyUrl: 'https://iifl.darwinbox.in/ms/candidatev2/main/careers/jobDetails/iifl-001',
      employmentType: 'Full Time',
      experienceRequired: '3 - 5 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Build lending systems.</p>',
      source: 'iiflfinance',
      link: 'https://iifl.darwinbox.in/ms/candidatev2/main/careers/jobDetails/iifl-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
