import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Arctic Wolf - The Security Operations Leaders</title>
    <link rel="canonical" href="https://arcticwolf.com/company/careers/" />
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <h2>Run With The Pack</h2>
      <p>Explore careers at Arctic Wolf, one of the fastest-growing and exciting cybersecurity companies in the world.</p>
      <a href="https://arcticwolf.wd1.myworkdayjobs.com/External">View All Open Positions</a>
    </main>
  </body>
</html>
`

const officialWorkdayBoardPage = {
  status: 200,
  url: 'https://arcticwolf.wd1.myworkdayjobs.com/External',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <meta name="title" property="og:title" content="Careers">
        <meta
          name="description"
          property="og:description"
          content="At Arctic Wolf, we recognize that success comes from delighting our customers. We believe in being lean and constantly building, measuring, and learning."
        >
      </head>
      <body>
        <script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"tenant":"arcticwolf"}}}</script>
      </body>
    </html>
  `,
}

const unfilteredJobsPayload = {
  total: 126,
  jobPostings: [
    {
      title: 'Channel Account Manager',
      externalPath: '/job/Remote---USA---Georgia/Channel-Account-Manager_R26_488-1',
      timeType: 'Full time',
      locationsText: '2 Locations',
      postedOn: 'Posted 2 Days Ago',
      bulletFields: ['R26_488'],
    },
  ],
  facets: [
    {
      facetParameter: 'jobFamilyGroup',
      values: [],
    },
    {
      facetParameter: 'locationMainGroup',
      values: [
        {
          facetParameter: 'locations',
          descriptor: 'Locations',
          values: [
            {
              descriptor: 'Bengaluru, IND',
              id: '6f28b52714e110011a619f68ed860000',
              count: 59,
            },
            {
              descriptor: 'Remote - IND - Karnataka',
              id: 'd51061531c321001b5577d7ba7680000',
              count: 9,
            },
            {
              descriptor: 'Remote - USA - Indiana',
              id: 'f6cfbd603ca11001f6242468dd760000',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
}

const filteredIndiaJobsPayload = {
  total: 3,
  jobPostings: [
    {
      title: 'Senior Quality Engineer 2',
      externalPath: '/job/Bengaluru-IND/Senior-Quality-Engineer-2_R26_478',
      timeType: 'Full time',
      locationsText: 'Bengaluru, IND',
      postedOn: 'Posted Today',
      bulletFields: ['R26_478'],
    },
    {
      title: 'People Experience Specialist',
      externalPath: '/job/Bengaluru-IND/People-Experience-Specialist_R26_786',
      timeType: 'Full time',
      locationsText: 'Bengaluru, IND',
      postedOn: 'Posted Today',
      bulletFields: ['R26_786'],
    },
    {
      title: 'Manager , Business Applications',
      externalPath: '/job/Remote---IND---Karnataka/Manager---Business-Applications_R26_597-2',
      timeType: 'Full time',
      locationsText: 'Remote - IND - Karnataka',
      postedOn: 'Posted 8 Days Ago',
      bulletFields: ['R26_597'],
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../arcticwolfindia/script.js')
  } catch {
    assert.fail('Expected Arctic Wolf India scraper module at ../arcticwolfindia/script.js')
  }
}

test('Arctic Wolf India constants and parsers stay pinned to the verified first-party careers and Workday India facet surface', async () => {
  const arcticWolfIndia = await loadModule()

  assert.equal(arcticWolfIndia.COMPANY_NAME, 'Arctic Wolf India')
  assert.equal(arcticWolfIndia.OFFICIAL_BRAND_NAME, 'Arctic Wolf')
  assert.equal(arcticWolfIndia.SOURCE, 'arcticwolfindia')
  assert.equal(arcticWolfIndia.COUNTRY_FILTER, 'India')
  assert.equal(arcticWolfIndia.CAREERS_URL, 'https://arcticwolf.com/company/careers/')
  assert.equal(arcticWolfIndia.WORKDAY_BOARD_URL, 'https://arcticwolf.wd1.myworkdayjobs.com/External')
  assert.equal(
    arcticWolfIndia.JOBS_API_URL,
    'https://arcticwolf.wd1.myworkdayjobs.com/wday/cxs/arcticwolf/External/jobs',
  )
  assert.deepEqual(arcticWolfIndia.VERIFIED_INDIA_LOCATION_DESCRIPTORS, [
    'Bengaluru, IND',
    'Remote - IND - Karnataka',
  ])
  assert.equal(
    arcticWolfIndia.VERIFIED_INDIA_JOB_URL,
    'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/Senior-Quality-Engineer-2_R26_478',
  )
  assert.equal(
    arcticWolfIndia.VERIFIED_INDIA_APPLY_URL,
    'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/Senior-Quality-Engineer-2_R26_478/apply',
  )
  assert.equal(arcticWolfIndia.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    arcticWolfIndia.extractVerifiedWorkdayBoardUrl(officialCareersHtml),
    'https://arcticwolf.wd1.myworkdayjobs.com/External',
  )
  assert.equal(arcticWolfIndia.hasOfficialWorkdayBoardSignal(officialWorkdayBoardPage), true)
  assert.equal(arcticWolfIndia.isArcticWolfIndiaLocationDescriptor('Bengaluru, IND'), true)
  assert.equal(arcticWolfIndia.isArcticWolfIndiaLocationDescriptor('Remote - IND - Karnataka'), true)
  assert.equal(arcticWolfIndia.isArcticWolfIndiaLocationDescriptor('Remote - USA - Indiana'), false)
  assert.deepEqual(
    arcticWolfIndia.extractIndiaLocationFacetIds(unfilteredJobsPayload),
    ['6f28b52714e110011a619f68ed860000', 'd51061531c321001b5577d7ba7680000'],
  )
  assert.deepEqual(
    JSON.parse(arcticWolfIndia.buildUnfilteredJobsRequestBody({ offset: 0 })),
    {
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: '',
    },
  )
  assert.deepEqual(
    JSON.parse(
      arcticWolfIndia.buildIndiaJobsRequestBody({
        offset: 20,
        locationFacetIds: ['6f28b52714e110011a619f68ed860000', 'd51061531c321001b5577d7ba7680000'],
      }),
    ),
    {
      appliedFacets: {
        locations: ['6f28b52714e110011a619f68ed860000', 'd51061531c321001b5577d7ba7680000'],
      },
      limit: 20,
      offset: 20,
      searchText: '',
    },
  )
  assert.deepEqual(
    arcticWolfIndia.extractJobsFromPayload(filteredIndiaJobsPayload, FIXED_SCRAPED_AT),
    [
      {
        jobId: 'R26_478',
        title: 'Senior Quality Engineer 2',
        company: 'Arctic Wolf India',
        department: null,
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        state: null,
        country: 'India',
        sourceUrl: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/Senior-Quality-Engineer-2_R26_478',
        applyUrl: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/Senior-Quality-Engineer-2_R26_478/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted Today',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R26_478',
        source: 'arcticwolfindia',
        link: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/Senior-Quality-Engineer-2_R26_478/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'R26_786',
        title: 'People Experience Specialist',
        company: 'Arctic Wolf India',
        department: null,
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        state: null,
        country: 'India',
        sourceUrl: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/People-Experience-Specialist_R26_786',
        applyUrl: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/People-Experience-Specialist_R26_786/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted Today',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R26_786',
        source: 'arcticwolfindia',
        link: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/People-Experience-Specialist_R26_786/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'R26_597',
        title: 'Manager , Business Applications',
        company: 'Arctic Wolf India',
        department: null,
        location: 'Remote, Karnataka, India',
        city: null,
        state: 'Karnataka',
        country: 'India',
        sourceUrl: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Remote---IND---Karnataka/Manager---Business-Applications_R26_597-2',
        applyUrl: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Remote---IND---Karnataka/Manager---Business-Applications_R26_597-2/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 8 Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R26_597',
        source: 'arcticwolfindia',
        link: 'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Remote---IND---Karnataka/Manager---Business-Applications_R26_597-2/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('run validates the verified first-party handoff and extracts Arctic Wolf India Workday jobs from the India facets', async () => {
  const arcticWolfIndia = await loadModule()
  const requestedPages = []
  const requestedJsonBodies = []

  const jobs = await arcticWolfIndia.createArcticWolfIndiaScraper({
    now: () => FIXED_SCRAPED_AT,
    maxPages: 1,
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === arcticWolfIndia.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === arcticWolfIndia.WORKDAY_BOARD_URL) {
        return officialWorkdayBoardPage
      }

      throw new Error(`Unexpected Arctic Wolf India page URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      assert.equal(url, arcticWolfIndia.JOBS_API_URL)
      requestedJsonBodies.push(JSON.parse(body))

      if (requestedJsonBodies.length === 1) return unfilteredJobsPayload
      if (requestedJsonBodies.length === 2) return filteredIndiaJobsPayload

      throw new Error(`Unexpected Arctic Wolf India jobs API call #${requestedJsonBodies.length}`)
    },
  })

  assert.deepEqual(requestedPages, [
    arcticWolfIndia.CAREERS_URL,
    arcticWolfIndia.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(requestedJsonBodies, [
    JSON.parse(arcticWolfIndia.buildUnfilteredJobsRequestBody({ offset: 0 })),
    JSON.parse(
      arcticWolfIndia.buildIndiaJobsRequestBody({
        offset: 0,
        locationFacetIds: ['6f28b52714e110011a619f68ed860000', 'd51061531c321001b5577d7ba7680000'],
      }),
    ),
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'arcticwolfindia')
  assert.equal(jobs[0].company, 'Arctic Wolf India')
  assert.equal(
    jobs[0].link,
    'https://arcticwolf.wd1.myworkdayjobs.com/External/job/Bengaluru-IND/Senior-Quality-Engineer-2_R26_478/apply',
  )
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Arctic Wolf India fails closed when the verified careers handoff, public Workday board, or India facet changes materially', async () => {
  const arcticWolfIndia = await loadModule()

  await assert.rejects(
    arcticWolfIndia.createArcticWolfIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === arcticWolfIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><a href="https://example.com/jobs">Open roles</a></body></html>',
          }
        }

        throw new Error(`Unexpected Arctic Wolf India page URL: ${url}`)
      },
      fetchJson: async () => filteredIndiaJobsPayload,
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    arcticWolfIndia.createArcticWolfIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === arcticWolfIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === arcticWolfIndia.WORKDAY_BOARD_URL) {
          return {
            ...officialWorkdayBoardPage,
            html: officialWorkdayBoardPage.html.replace('content="Careers"', 'content="Jobs"'),
          }
        }

        throw new Error(`Unexpected Arctic Wolf India page URL: ${url}`)
      },
      fetchJson: async () => filteredIndiaJobsPayload,
    }),
    /verified public workday board/i,
  )

  await assert.rejects(
    arcticWolfIndia.createArcticWolfIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === arcticWolfIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === arcticWolfIndia.WORKDAY_BOARD_URL) {
          return officialWorkdayBoardPage
        }

        throw new Error(`Unexpected Arctic Wolf India page URL: ${url}`)
      },
      fetchJson: async () => ({
        total: 126,
        jobPostings: [],
        facets: [{ facetParameter: 'jobFamilyGroup', values: [] }],
      }),
    }),
    /verified india workday facet changed/i,
  )
})
