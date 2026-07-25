import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const INDIA_COUNTRY_FACET_ID = 'c4f78be1a8f14da0ab49ce1162348a5e'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Piramal Pharma Limited Careers</title>
  </head>
  <body>
    <main>
      <h1>Piramal Pharma Limited Careers</h1>
      <h2>Explore Opportunities</h2>
      <a href="https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS">Apply Now</a>
      <a href="https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS">I am a student</a>
      <a href="https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS">I am a professional</a>
    </main>
  </body>
</html>
`

const WORKDAY_BOARD_PAGE = {
  status: 200,
  url: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <link rel="canonical" href="https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS" />
        <meta name="title" property="og:title" content="Careers">
        <meta
          name="description"
          property="og:description"
          content="Introduce yourself to our recruiters and we'll get in touch if there's a role that seems like a good match. Piramal Pharma Limited offers a portfolio of differentiated products and services."
        >
      </head>
      <body>
        <div>PIRAMAL_EXTERNAL_CAREERS</div>
        <div>India</div>
      </body>
    </html>
  `,
}

const UNFILTERED_JOBS_PAYLOAD = {
  total: 254,
  jobPostings: [
    {
      title: 'Strategic Account Manager, Mid-Atlantic Territory',
      externalPath: '/job/North-Carolina/Strategic-Account-Manager--Mid-Atlantic-Territory_R00000188',
      locationsText: '3 Locations',
      postedOn: 'Posted 6 Days Ago',
      bulletFields: ['R00000188'],
      timeType: 'Full time',
    },
  ],
  facets: [
    {
      facetParameter: 'locationMainGroup',
      values: [
        {
          facetParameter: 'locationCountry',
          descriptor: 'Location Country',
          values: [
            {
              descriptor: 'India',
              id: INDIA_COUNTRY_FACET_ID,
              count: 195,
            },
            {
              descriptor: 'United States of America',
              id: 'bc33aa3152ec42d4995f4791a106ed09',
              count: 46,
            },
          ],
        },
        {
          facetParameter: 'locations',
          descriptor: 'Locations',
          values: [
            {
              descriptor: 'Mahad,MH',
              id: '260077371ccb10021b86661991ac0000',
              count: 3,
            },
          ],
        },
      ],
    },
  ],
}

const FILTERED_INDIA_JOBS_PAYLOAD = {
  total: 3,
  jobPostings: [
    {
      title: 'Executive - Production',
      externalPath: '/job/MahadMH/Executive---Production_R00000427',
      locationsText: 'Mahad,MH',
      postedOn: 'Posted Today',
      bulletFields: ['R00000427'],
      timeType: 'Full time',
    },
    {
      title: 'Deputy Manager - Utility',
      externalPath: '/job/Digwal-TS/Deputy-Manager---Utility_R00002639',
      locationsText: 'Digwal, TS',
      postedOn: 'Posted Today',
      bulletFields: ['R00002639'],
      timeType: 'Full time',
    },
    {
      title: 'Executive',
      externalPath: '/job/India/Executive_R00001421',
      locationsText: 'India',
      postedOn: 'Posted Today',
      bulletFields: ['R00001421'],
      timeType: 'Full time',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../piramalpharma/script.js')
  } catch {
    assert.fail('Expected Piramal Pharma scraper module at ../piramalpharma/script.js')
  }
}

test('Piramal Pharma pins the verified first-party careers handoff and Workday India facet contract', async () => {
  const piramalPharma = await loadModule()

  assert.equal(piramalPharma.COMPANY_NAME, 'Piramal Pharma')
  assert.equal(piramalPharma.OFFICIAL_BRAND_NAME, 'Piramal Pharma Limited')
  assert.equal(piramalPharma.SOURCE, 'piramalpharma')
  assert.equal(piramalPharma.COUNTRY_FILTER, 'India')
  assert.equal(piramalPharma.CAREERS_URL, 'https://www.piramalpharma.com/careers')
  assert.equal(
    piramalPharma.WORKDAY_BOARD_URL,
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS',
  )
  assert.equal(
    piramalPharma.JOBS_API_URL,
    'https://piramalpharma.wd102.myworkdayjobs.com/wday/cxs/piramalpharma/PIRAMAL_EXTERNAL_CAREERS/jobs',
  )
  assert.equal(piramalPharma.VERIFIED_INDIA_COUNTRY_FACET_ID, INDIA_COUNTRY_FACET_ID)
  assert.equal(piramalPharma.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.equal(
    piramalPharma.extractVerifiedWorkdayBoardUrl(CAREERS_HTML),
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS',
  )
  assert.equal(piramalPharma.hasOfficialWorkdayBoardSignal(WORKDAY_BOARD_PAGE), true)
  assert.deepEqual(
    piramalPharma.extractIndiaCountryFacetIds(UNFILTERED_JOBS_PAYLOAD),
    [INDIA_COUNTRY_FACET_ID],
  )
  assert.deepEqual(
    JSON.parse(piramalPharma.buildUnfilteredJobsRequestBody({ offset: 0 })),
    {
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: '',
    },
  )
  assert.deepEqual(
    JSON.parse(
      piramalPharma.buildIndiaJobsRequestBody({
        offset: 20,
        countryFacetIds: [INDIA_COUNTRY_FACET_ID],
      }),
    ),
    {
      appliedFacets: {
        locationCountry: [INDIA_COUNTRY_FACET_ID],
      },
      limit: 20,
      offset: 20,
      searchText: '',
    },
  )
  assert.deepEqual(
    piramalPharma.extractJobsFromPayload(FILTERED_INDIA_JOBS_PAYLOAD, FIXED_SCRAPED_AT),
    [
      {
        jobId: 'R00000427',
        title: 'Executive - Production',
        company: 'Piramal Pharma',
        department: null,
        location: 'Mahad, MH, India',
        city: 'Mahad',
        state: 'MH',
        country: 'India',
        sourceUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427',
        applyUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted Today',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R00000427',
        source: 'piramalpharma',
        link: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'R00002639',
        title: 'Deputy Manager - Utility',
        company: 'Piramal Pharma',
        department: null,
        location: 'Digwal, TS, India',
        city: 'Digwal',
        state: 'TS',
        country: 'India',
        sourceUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/Digwal-TS/Deputy-Manager---Utility_R00002639',
        applyUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/Digwal-TS/Deputy-Manager---Utility_R00002639/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted Today',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R00002639',
        source: 'piramalpharma',
        link: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/Digwal-TS/Deputy-Manager---Utility_R00002639/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'R00001421',
        title: 'Executive',
        company: 'Piramal Pharma',
        department: null,
        location: 'India',
        city: null,
        state: null,
        country: 'India',
        sourceUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/India/Executive_R00001421',
        applyUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/India/Executive_R00001421/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted Today',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R00001421',
        source: 'piramalpharma',
        link: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/India/Executive_R00001421/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('Piramal Pharma run validates the official careers handoff and returns India Workday jobs from the verified country facet', async () => {
  const piramalPharma = await loadModule()
  const requestedPages = []
  const requestedJsonBodies = []

  const jobs = await piramalPharma.createPiramalPharmaScraper({
    now: () => FIXED_SCRAPED_AT,
    maxPages: 1,
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === piramalPharma.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: CAREERS_HTML,
        }
      }

      if (url === piramalPharma.WORKDAY_BOARD_URL) {
        return WORKDAY_BOARD_PAGE
      }

      throw new Error(`Unexpected Piramal Pharma page URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      assert.equal(url, piramalPharma.JOBS_API_URL)
      requestedJsonBodies.push(JSON.parse(body))

      if (requestedJsonBodies.length === 1) return UNFILTERED_JOBS_PAYLOAD
      if (requestedJsonBodies.length === 2) return FILTERED_INDIA_JOBS_PAYLOAD

      throw new Error(`Unexpected Piramal Pharma jobs API call #${requestedJsonBodies.length}`)
    },
  })

  assert.deepEqual(requestedPages, [
    piramalPharma.CAREERS_URL,
    piramalPharma.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(requestedJsonBodies, [
    JSON.parse(piramalPharma.buildUnfilteredJobsRequestBody({ offset: 0 })),
    JSON.parse(
      piramalPharma.buildIndiaJobsRequestBody({
        offset: 0,
        countryFacetIds: [INDIA_COUNTRY_FACET_ID],
      }),
    ),
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'piramalpharma')
  assert.equal(jobs[0].company, 'Piramal Pharma')
  assert.equal(
    jobs[0].link,
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427/apply',
  )
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Piramal Pharma fails closed when the verified careers page, public Workday board, or India country facet changes materially', async () => {
  const piramalPharma = await loadModule()

  await assert.rejects(
    piramalPharma.createPiramalPharmaScraper().run({
      fetchPage: async (url) => {
        if (url === piramalPharma.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Unexpected</h1></body></html>',
          }
        }

        throw new Error(`Unexpected Piramal Pharma page URL: ${url}`)
      },
      fetchJson: async () => FILTERED_INDIA_JOBS_PAYLOAD,
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    piramalPharma.createPiramalPharmaScraper().run({
      fetchPage: async (url) => {
        if (url === piramalPharma.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: CAREERS_HTML,
          }
        }

        if (url === piramalPharma.WORKDAY_BOARD_URL) {
          return {
            ...WORKDAY_BOARD_PAGE,
            html: WORKDAY_BOARD_PAGE.html.replace('content="Careers"', 'content="Jobs"'),
          }
        }

        throw new Error(`Unexpected Piramal Pharma page URL: ${url}`)
      },
      fetchJson: async () => FILTERED_INDIA_JOBS_PAYLOAD,
    }),
    /verified public workday board/i,
  )

  await assert.rejects(
    piramalPharma.createPiramalPharmaScraper().run({
      fetchPage: async (url) => {
        if (url === piramalPharma.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: CAREERS_HTML,
          }
        }

        if (url === piramalPharma.WORKDAY_BOARD_URL) {
          return WORKDAY_BOARD_PAGE
        }

        throw new Error(`Unexpected Piramal Pharma page URL: ${url}`)
      },
      fetchJson: async () => ({
        total: 254,
        jobPostings: [],
        facets: [{ facetParameter: 'locationMainGroup', values: [] }],
      }),
    }),
    /verified india country facet changed/i,
  )
})
