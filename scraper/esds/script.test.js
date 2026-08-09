import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  buildDetailUrl,
  createEsdsScraper,
  hasOfficialCareersSignal,
  hasOfficialJobDetailSignal,
} from './script.js'

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers at ESDS | IT and Cloud Job Opportunities</title>
    </head>
    <body>
      <h1>Life at ESDS</h1>
      <p>Jobs of the day</p>
      <article onclick="window.location='https://www.esds.co.in/career-details/a688b3b568300f'">
        <h5><a>Data Center Project Manager</a></h5>
        <ul>
          <li>Full Time</li>
          <li>2026-07-31</li>
        </ul>
        <ol class="autoplaySlider">
          <li>Department: Data Center</li>
          <li>Experience (years): 8-10</li>
          <li>Job ID: a688b3b568300f</li>
        </ol>
        <p class="m-0">Kolkata, Delhi</p>
      </article>
    </body>
  </html>
`

const darwinboxShellHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title></title>
      <base href="/ms/candidatev2/">
      <script type="module" src="/ms/dboxuilibrary/assets/dboxuilib_dist/www/build/db-components.esm.js"></script>
      <script src="/ms/formbuilder/assets/db-form/db-form.js"></script>
    </head>
    <body></body>
  </html>
`

test('verified ESDS listing cards remain usable when detail routes now hand off to the Darwinbox shell', async () => {
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
  assert.equal(hasOfficialJobDetailSignal(darwinboxShellHtml), false)

  const requestedUrls = []
  const requestedListingPages = []
  const scraper = createEsdsScraper({
    maxJobs: 1,
    now: () => '2026-08-02T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchListingPage: async (request) => {
      requestedListingPages.push(request)
      return {
        job_counts: 1,
        data: [
          {
            id: 'a688b3b568300f',
            title: 'Data Center Project Manager',
            department_name: 'Data Center',
            locations: 'Kolkata, Delhi, India',
            country: 'India',
            emp_type_name: 'Full Time',
            experience: '8-10',
            posted_on: '2026-07-31',
          },
        ],
      }
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.deepEqual(requestedListingPages, [
    {
      page: 1,
      pageSize: 10,
      companyId: 'main',
    },
  ])
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      company: job.company,
      department: job.department,
      location: job.location,
      city: job.city,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: job.employmentType,
      experienceRequired: job.experienceRequired,
      postingDate: job.postingDate,
      link: job.link,
      source: job.source,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Data Center Project Manager',
        company: 'ESDS',
        department: 'Data Center',
        location: 'Kolkata, Delhi, India',
        city: 'Kolkata',
        sourceUrl: 'https://esds.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a688b3b568300f',
        applyUrl: 'https://esds.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a688b3b568300f',
        employmentType: 'Full Time',
        experienceRequired: '8-10',
        postingDate: '2026-07-31',
        link: 'https://esds.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a688b3b568300f',
        source: 'esds',
        scrapedAt: '2026-08-02T00:00:00.000Z',
      },
    ],
  )
})
