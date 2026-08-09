import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildIndiaJobsRequestBody,
  buildUnfilteredJobsRequestBody,
  CAREERS_URL,
  createDbsBankIndiaScraper,
  VERIFIED_INDIA_COUNTRY_FACET_ID,
  WORKDAY_BOARD_URL,
} from './script.js'

const careersHtml = `
  <html>
    <head><title>Careers at DBS | DBS Bank</title></head>
    <body>
      <a href="/gsmc-grp/careers/teams/india.page">Explore Jobs</a>
      <a href="${WORKDAY_BOARD_URL}">India Jobs</a>
    </body>
  </html>
`

const workdayBoardHtml = `
  <html>
    <head>
      <link rel="canonical" href="https://dbs.wd3.myworkdayjobs.com/DBS_Careers" />
      <meta property="og:url" content="https://dbs.wd3.myworkdayjobs.com/DBS_Careers" />
      <meta property="og:description" content="DBS is more than a bank — we're shaping the future of finance and communities." />
      <script>
        window.workday = {
          tenant: "dbs",
          siteId: "DBS_Careers"
        }
      </script>
    </head>
  </html>
`

const unfilteredPayload = {
  facets: [
    {
      facetParameter: 'locationMainGroup',
      values: [
        {
          facetParameter: 'locationCountry',
          values: [
            {
              descriptor: 'India',
              id: VERIFIED_INDIA_COUNTRY_FACET_ID,
            },
          ],
        },
      ],
    },
  ],
}

const indiaPayload = {
  total: 1,
  jobPostings: [
    {
      title: 'Analyst, Area Sales Manager, Consumer Banking Group',
      locationsText: 'Patna-DBIL',
      bulletFields: ['WD85566'],
      externalPath: '/job/Vishakapatnam/Analyst--Area-Sales-Manager--Consumer-Banking-Group_WD85566',
    },
  ],
}

const detailHtml = `
  <html>
    <body>
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "identifier": {
            "@type": "PropertyValue",
            "value": "WD85566"
          },
          "datePosted": "2026-06-12",
          "description": "Business Function: DBS Consumer Banking Group. Required Experience Five to ten years of experience as Gold Loan sales in Bank/NBFC"
        }
      </script>
    </body>
  </html>
`

test('run enriches DBS Workday listings with postedAt, description, and experience from the apply page', async () => {
  const requestedPageUrls = []
  const requestedBodies = []
  const scraper = createDbsBankIndiaScraper({
    maxPages: 1,
    now: () => '2026-07-31T19:16:03.508Z',
    detailFetchConcurrency: 1,
  })

  const jobs = await scraper.run({
    fetchPage: async (url) => {
      requestedPageUrls.push(url)

      if (url === CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }
      if (url === WORKDAY_BOARD_URL) {
        return { status: 200, url, html: workdayBoardHtml }
      }
      if (url === 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Vishakapatnam/Analyst--Area-Sales-Manager--Consumer-Banking-Group_WD85566') {
        return { status: 200, url, html: detailHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (_url, body) => {
      requestedBodies.push(body)
      return requestedBodies.length === 1 ? unfilteredPayload : indiaPayload
    },
  })

  assert.deepEqual(requestedPageUrls, [
    CAREERS_URL,
    WORKDAY_BOARD_URL,
    'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Vishakapatnam/Analyst--Area-Sales-Manager--Consumer-Banking-Group_WD85566',
  ])
  assert.deepEqual(requestedBodies, [
    buildUnfilteredJobsRequestBody({ offset: 0 }),
    buildIndiaJobsRequestBody({ offset: 0, countryFacetId: VERIFIED_INDIA_COUNTRY_FACET_ID }),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'dbsbankindia')
  assert.equal(jobs[0].location, 'Patna, India')
  assert.equal(jobs[0].postedAt, '2026-06-12')
  assert.equal(jobs[0].postingDate, '2026-06-12')
  assert.equal(jobs[0].experienceRequired, '5-10 years')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.match(jobs[0].jobDescription, /Business Function: DBS Consumer Banking Group/)
})

test('run retries DBS detail enrichment after a Workday 429 response', async () => {
  const scraper = createDbsBankIndiaScraper({
    maxPages: 1,
    now: () => '2026-07-31T19:16:03.508Z',
    detailFetchConcurrency: 1,
    detailFetchAttempts: 2,
    detailRetryBaseDelayMs: 0,
  })
  let detailAttempts = 0

  const jobs = await scraper.run({
    fetchPage: async (url) => {
      if (url === CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }
      if (url === WORKDAY_BOARD_URL) {
        return { status: 200, url, html: workdayBoardHtml }
      }
      if (url === 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Vishakapatnam/Analyst--Area-Sales-Manager--Consumer-Banking-Group_WD85566') {
        detailAttempts += 1
        if (detailAttempts === 1) {
          return { status: 429, url, html: '' }
        }
        return { status: 200, url, html: detailHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (_url, body) => (
      body === buildUnfilteredJobsRequestBody({ offset: 0 })
        ? unfilteredPayload
        : indiaPayload
    ),
  })

  assert.equal(detailAttempts, 2)
  assert.equal(jobs[0].postedAt, '2026-06-12')
  assert.equal(jobs[0].experienceRequired, '5-10 years')
  assert.equal(jobs[0].publicExperienceChecked, true)
})
