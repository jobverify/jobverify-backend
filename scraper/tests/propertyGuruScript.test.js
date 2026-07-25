import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const BENGALURU_LOCATION_FACET_ID = '8ddf56e76fde1005210b476f4bff0000'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers- Be More,Be a Guru.</title>
  </head>
  <body>
    <main>
      <h1>Be More, Be a Guru.</h1>
      <p>We are hiring!</p>
      <a href="https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/">View open roles</a>
      <a href="https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/">Join Us</a>
      <p>Join our talent hubs in Asia</p>
    </main>
  </body>
</html>
`

const WORKDAY_BOARD_PAGE = {
  status: 200,
  url: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <link rel="canonical" href="https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/" />
        <meta
          name="description"
          property="og:description"
          content="PropertyGuru is Southeast Asia's leading PropTech company and we're hiring."
        >
      </head>
      <body>
        <div>PropertyGuru</div>
        <div>Careers</div>
      </body>
    </html>
  `,
}

const UNFILTERED_JOBS_PAYLOAD = {
  total: 25,
  jobPostings: [
    {
      title: 'Account Consultant',
      externalPath: '/job/Thailand/Account-Consultant_JR100912',
      locationsText: 'Thailand',
      postedOn: 'Posted 2 Days Ago',
      bulletFields: ['JR100912'],
      timeType: 'Full time',
    },
  ],
  facets: [
    {
      facetParameter: 'locationMainGroup',
      values: [
        {
          facetParameter: 'locations',
          descriptor: 'Locations',
          values: [
            {
              descriptor: 'Bengaluru',
              id: BENGALURU_LOCATION_FACET_ID,
              count: 4,
            },
            {
              descriptor: 'Singapore',
              id: '49dccaf891941003d56ade93a3310000',
              count: 3,
            },
          ],
        },
      ],
    },
  ],
}

const FILTERED_INDIA_JOBS_PAYLOAD = {
  total: 4,
  jobPostings: [
    {
      title: 'Head of People, Country & Function Lead (CTPO )',
      externalPath: '/job/Bengaluru/Head-of-People--Country---Function-Lead--CTPO--_JR100927',
      locationsText: 'Bengaluru',
      postedOn: 'Posted Today',
      bulletFields: ['JR100927'],
      timeType: 'Full time',
    },
    {
      title: 'Cloud & AI Security Architect',
      externalPath: '/job/Bengaluru/Cloud---AI-Security-Architect_JR100919',
      locationsText: 'Bengaluru',
      postedOn: 'Posted 2 Days Ago',
      bulletFields: ['JR100919'],
      timeType: 'Full time',
    },
    {
      title: 'Senior Manager - Offensive Security',
      externalPath: '/job/Bengaluru/Senior-Manager---Offensive-Security_JR100915',
      locationsText: 'Bengaluru',
      postedOn: 'Posted 13 Days Ago',
      bulletFields: ['JR100915'],
      timeType: 'Full time',
    },
    {
      title: 'Product & AI Transformation Lead (Talent Development)',
      externalPath: '/job/Bengaluru/Product---AI-Transformation-Lead--Talent-Development-_JR100890',
      locationsText: 'Bengaluru',
      postedOn: 'Posted 30+ Days Ago',
      bulletFields: ['JR100890'],
      timeType: 'Full time',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../propertyguru/script.js')
  } catch {
    assert.fail('Expected PropertyGuru scraper module at ../propertyguru/script.js')
  }
}

test('PropertyGuru pins the verified first-party careers handoff and Workday India location facet contract', async () => {
  const propertyGuru = await loadModule()

  assert.equal(propertyGuru.COMPANY_NAME, 'PropertyGuru')
  assert.equal(propertyGuru.OFFICIAL_BRAND_NAME, 'PropertyGuru Group')
  assert.equal(propertyGuru.SOURCE, 'propertyguru')
  assert.equal(propertyGuru.COUNTRY_FILTER, 'India')
  assert.equal(propertyGuru.CAREERS_URL, 'https://www.propertygurugroup.com/careers/')
  assert.equal(
    propertyGuru.WORKDAY_BOARD_URL,
    'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/',
  )
  assert.equal(
    propertyGuru.JOBS_API_URL,
    'https://propertyguru.wd105.myworkdayjobs.com/wday/cxs/propertyguru/PropertyGuru/jobs',
  )
  assert.deepEqual(propertyGuru.VERIFIED_INDIA_LOCATION_DESCRIPTORS, ['Bengaluru'])
  assert.deepEqual(propertyGuru.VERIFIED_INDIA_LOCATION_FACET_IDS, [BENGALURU_LOCATION_FACET_ID])
  assert.equal(propertyGuru.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.equal(
    propertyGuru.extractVerifiedWorkdayBoardUrl(CAREERS_HTML),
    'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/',
  )
  assert.equal(propertyGuru.hasOfficialWorkdayBoardSignal(WORKDAY_BOARD_PAGE), true)
  assert.equal(propertyGuru.isPropertyGuruIndiaLocationDescriptor('Bengaluru'), true)
  assert.equal(propertyGuru.isPropertyGuruIndiaLocationDescriptor('Singapore'), false)
  assert.deepEqual(
    propertyGuru.extractIndiaLocationFacetIds(UNFILTERED_JOBS_PAYLOAD),
    [BENGALURU_LOCATION_FACET_ID],
  )
  assert.deepEqual(
    JSON.parse(propertyGuru.buildUnfilteredJobsRequestBody({ offset: 0 })),
    {
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: '',
    },
  )
  assert.deepEqual(
    JSON.parse(
      propertyGuru.buildIndiaJobsRequestBody({
        offset: 20,
        locationFacetIds: [BENGALURU_LOCATION_FACET_ID],
      }),
    ),
    {
      appliedFacets: {
        locations: [BENGALURU_LOCATION_FACET_ID],
      },
      limit: 20,
      offset: 20,
      searchText: '',
    },
  )
  assert.deepEqual(
    propertyGuru.extractJobsFromPayload(FILTERED_INDIA_JOBS_PAYLOAD, FIXED_SCRAPED_AT),
    [
      {
        jobId: 'JR100927',
        title: 'Head of People, Country & Function Lead (CTPO )',
        company: 'PropertyGuru',
        department: null,
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        state: null,
        country: 'India',
        sourceUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Head-of-People--Country---Function-Lead--CTPO--_JR100927',
        applyUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Head-of-People--Country---Function-Lead--CTPO--_JR100927/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted Today',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'JR100927',
        source: 'propertyguru',
        link: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Head-of-People--Country---Function-Lead--CTPO--_JR100927/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'JR100919',
        title: 'Cloud & AI Security Architect',
        company: 'PropertyGuru',
        department: null,
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        state: null,
        country: 'India',
        sourceUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Cloud---AI-Security-Architect_JR100919',
        applyUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Cloud---AI-Security-Architect_JR100919/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 2 Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'JR100919',
        source: 'propertyguru',
        link: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Cloud---AI-Security-Architect_JR100919/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'JR100915',
        title: 'Senior Manager - Offensive Security',
        company: 'PropertyGuru',
        department: null,
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        state: null,
        country: 'India',
        sourceUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Senior-Manager---Offensive-Security_JR100915',
        applyUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Senior-Manager---Offensive-Security_JR100915/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 13 Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'JR100915',
        source: 'propertyguru',
        link: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Senior-Manager---Offensive-Security_JR100915/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'JR100890',
        title: 'Product & AI Transformation Lead (Talent Development)',
        company: 'PropertyGuru',
        department: null,
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        state: null,
        country: 'India',
        sourceUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Product---AI-Transformation-Lead--Talent-Development-_JR100890',
        applyUrl: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Product---AI-Transformation-Lead--Talent-Development-_JR100890/apply',
        employmentType: 'Full time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 30+ Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'JR100890',
        source: 'propertyguru',
        link: 'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Product---AI-Transformation-Lead--Talent-Development-_JR100890/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('PropertyGuru run validates the official careers handoff and returns India Workday jobs from the verified Bengaluru facet', async () => {
  const propertyGuru = await loadModule()
  const requestedPages = []
  const requestedJsonBodies = []

  const jobs = await propertyGuru.createPropertyGuruScraper({
    now: () => FIXED_SCRAPED_AT,
    maxPages: 1,
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === propertyGuru.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: CAREERS_HTML,
        }
      }

      if (url === propertyGuru.WORKDAY_BOARD_URL) {
        return WORKDAY_BOARD_PAGE
      }

      throw new Error(`Unexpected PropertyGuru page URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      assert.equal(url, propertyGuru.JOBS_API_URL)
      requestedJsonBodies.push(JSON.parse(body))

      if (requestedJsonBodies.length === 1) return UNFILTERED_JOBS_PAYLOAD
      if (requestedJsonBodies.length === 2) return FILTERED_INDIA_JOBS_PAYLOAD

      throw new Error(`Unexpected PropertyGuru jobs API call #${requestedJsonBodies.length}`)
    },
  })

  assert.deepEqual(requestedPages, [
    propertyGuru.CAREERS_URL,
    propertyGuru.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(requestedJsonBodies, [
    JSON.parse(propertyGuru.buildUnfilteredJobsRequestBody({ offset: 0 })),
    JSON.parse(
      propertyGuru.buildIndiaJobsRequestBody({
        offset: 0,
        locationFacetIds: [BENGALURU_LOCATION_FACET_ID],
      }),
    ),
  ])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].source, 'propertyguru')
  assert.equal(jobs[0].company, 'PropertyGuru')
  assert.equal(
    jobs[0].link,
    'https://propertyguru.wd105.myworkdayjobs.com/en-US/PropertyGuru/job/Bengaluru/Head-of-People--Country---Function-Lead--CTPO--_JR100927/apply',
  )
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('PropertyGuru fails closed when the verified careers page, public Workday board, or India location facet changes materially', async () => {
  const propertyGuru = await loadModule()

  await assert.rejects(
    propertyGuru.createPropertyGuruScraper().run({
      fetchPage: async (url) => {
        if (url === propertyGuru.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Unexpected</h1></body></html>',
          }
        }

        throw new Error(`Unexpected PropertyGuru page URL: ${url}`)
      },
      fetchJson: async () => FILTERED_INDIA_JOBS_PAYLOAD,
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    propertyGuru.createPropertyGuruScraper().run({
      fetchPage: async (url) => {
        if (url === propertyGuru.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: CAREERS_HTML,
          }
        }

        if (url === propertyGuru.WORKDAY_BOARD_URL) {
          return {
            ...WORKDAY_BOARD_PAGE,
            html: '<html><body><h1>Unexpected</h1></body></html>',
          }
        }

        throw new Error(`Unexpected PropertyGuru page URL: ${url}`)
      },
      fetchJson: async () => FILTERED_INDIA_JOBS_PAYLOAD,
    }),
    /verified public workday board/i,
  )

  await assert.rejects(
    propertyGuru.createPropertyGuruScraper().run({
      fetchPage: async (url) => {
        if (url === propertyGuru.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: CAREERS_HTML,
          }
        }

        if (url === propertyGuru.WORKDAY_BOARD_URL) {
          return WORKDAY_BOARD_PAGE
        }

        throw new Error(`Unexpected PropertyGuru page URL: ${url}`)
      },
      fetchJson: async () => ({
        total: 25,
        jobPostings: [],
        facets: [{ facetParameter: 'locationMainGroup', values: [] }],
      }),
    }),
    /verified india location facet changed/i,
  )
})
