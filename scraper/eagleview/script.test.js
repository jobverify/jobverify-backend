import assert from 'node:assert/strict'
import test from 'node:test'

import {
  INDIA_LOCATION_QUERY,
  JOBS_PAGE_URL,
  buildSearchUrl,
  createEagleviewScraper,
  extractJobListings,
  hasOfficialJobsPageSignal,
} from './script.js'

const firstPageHtml = `
  <html>
    <head><title>Search Jobs | EagleView</title></head>
    <body>
      <main>
        <h1>Search Jobs</h1>
        <div class="iCIMS_JobsTable">
          <div class="iCIMS_JobsTableRow">
            <a class="iCIMS_Anchor" href="/jobs/2866?lang=en-us">Incident Manager I</a>
            <dl>
              <dt>Job ID</dt><dd>2866</dd>
              <dt>Location</dt><dd>IN-Bengaluru</dd>
              <dt>Department</dt><dd>Technology</dd>
              <dt>Posted Date</dt><dd>06/30/2026</dd>
            </dl>
          </div>
          <div class="iCIMS_JobsTableRow">
            <a href="/jobs/3000?lang=en-us">US Role</a>
            <dl><dt>Job ID</dt><dd>3000</dd><dt>Location</dt><dd>US-Rochester</dd></dl>
          </div>
        </div>
        <a rel="next" href="?location=India&amp;page=2">Next</a>
      </main>
    </body>
  </html>
`

const secondPageHtml = `
  <html>
    <head><title>Search Jobs | EagleView</title></head>
    <body>
      <main>
        <h1>Search Jobs</h1>
        <div class="iCIMS_JobsTable">
          <div class="iCIMS_JobsTableRow">
            <a href="/jobs/2866?lang=en-us">Incident Manager I</a>
            <dl><dt>Job ID</dt><dd>2866</dd><dt>Location</dt><dd>IN-Bengaluru</dd></dl>
          </div>
          <div class="iCIMS_JobsTableRow">
            <a href="/jobs/2867?lang=en-us">Software Engineer</a>
            <dl>
              <dt>Job ID</dt><dd>2867</dd>
              <dt>Location</dt><dd>IN-Hyderabad</dd>
            </dl>
          </div>
        </div>
      </main>
    </body>
  </html>
`

test('builds and validates the official Eagleview India jobs search page', () => {
  assert.equal(JOBS_PAGE_URL, 'https://careers.eagleview.com/jobs')
  assert.equal(INDIA_LOCATION_QUERY, 'India')
  assert.equal(buildSearchUrl(), 'https://careers.eagleview.com/jobs?location=India&page=1&sortBy=distance_from&stretch=10&stretchUnit=MILES&woe=12&lang=en-us')
  assert.equal(hasOfficialJobsPageSignal(firstPageHtml), true)
  assert.equal(hasOfficialJobsPageSignal('<html><title>Search Jobs | Other Company</title></html>'), false)
})

test('extracts only India listings and normalizes Eagleview iCIMS job URLs', () => {
  assert.deepEqual(extractJobListings(firstPageHtml), [{
    title: 'Incident Manager I',
    company: 'Eagleview',
    department: 'Technology',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '2866',
    requisitionId: '2866',
    sourceUrl: 'https://careers.eagleview.com/jobs/2866?lang=en-us',
    applyUrl: 'https://careers.eagleview.com/jobs/2866?lang=en-us',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-30',
    closingDate: null,
    jobDescription: null,
  }])
})

test('paginates the official India search, deduplicates listings, and returns normalized Eagleview jobs', async () => {
  const requestedUrls = []
  const scraper = createEagleviewScraper({ now: () => '2026-07-08T00:00:00.000Z' })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return url.includes('page=1') ? firstPageHtml : secondPageHtml
    },
  })

  assert.deepEqual(requestedUrls, [buildSearchUrl({ page: 1 }), buildSearchUrl({ page: 2 })])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[1], {
    title: 'Software Engineer',
    company: 'Eagleview',
    department: null,
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: '2867',
    requisitionId: '2867',
    sourceUrl: 'https://careers.eagleview.com/jobs/2867?lang=en-us',
    applyUrl: 'https://careers.eagleview.com/jobs/2867?lang=en-us',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    source: 'eagleview',
    link: 'https://careers.eagleview.com/jobs/2867?lang=en-us',
    scrapedAt: '2026-07-08T00:00:00.000Z',
  })
})

test('rejects an unexpected public careers surface', async () => {
  await assert.rejects(
    createEagleviewScraper().run({
      fetchText: async () => '<html><title>Access denied</title><body>Challenge page</body></html>',
    }),
    /Eagleview jobs page no longer matches the verified official public careers surface/i,
  )
})
