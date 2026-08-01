import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'
const INDIA_COUNTRY_FACET_ID = 'c4f78be1a8f14da0ab49ce1162348a5e'

const officialCareersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Join Us Today! - Career Opportunities and positions at eInfochips</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <p>Reshape the future of your career with us!</p>
      <p>Presence in 140 countries with Arrow Electronics</p>
      <a href="https://careers.arrow.com/us/en/search-results?keywords=einfochips">Apply Now</a>
    </main>
  </body>
</html>
`

const arrowSearchPage = {
  status: 200,
  url: 'https://careers.arrow.com/us/en/search-results?keywords=einfochips',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Search results | Find the available job openings at Arrow Electronics</title>
      </head>
      <body>
        <script>
          phApp.ddo = {"eagerLoadRefineSearch":{"status":200,"data":{"jobs":[]}},"keywords":"einfochips"};
        </script>
        <a href="https://arrow.wd1.myworkdayjobs.com/en-US/AC/">Candidate Portal</a>
      </body>
    </html>
  `,
}

const officialWorkdayBoardPage = {
  status: 200,
  url: 'https://arrow.wd1.myworkdayjobs.com/AC',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <link rel="canonical" href="https://arrow.wd1.myworkdayjobs.com/AC" />
      </head>
      <body>
        <script>
          window.workday = window.workday || {
            tenant: "arrow",
            siteId: "AC",
            appName: "cxs",
            isExternal: true
          };
        </script>
      </body>
    </html>
  `,
}

const unfilteredJobsPayload = {
  total: 67,
  jobPostings: [
    {
      title: 'Hardware Engineer (eInfochips)',
      externalPath: '/job/US-MA-Bedford-Massachusetts-Werfen/Hardware-Engineer_R238559',
      locationsText: 'US-MA-Bedford-Massachusetts (Werfen)',
      postedOn: 'Posted 30+ Days Ago',
      bulletFields: ['R238559'],
    },
  ],
  facets: [
    {
      facetParameter: 'Location_Country',
      descriptor: 'Location Country',
      values: [
        {
          descriptor: 'India',
          id: INDIA_COUNTRY_FACET_ID,
          count: 33,
        },
        {
          descriptor: 'United States of America',
          id: 'bc33aa3152ec42d4995f4791a106ed09',
          count: 25,
        },
      ],
    },
  ],
}

const groupedJobsPayload = {
  total: 4,
  jobPostings: [
    {
      title: 'Senior Engineer - Data Engineer',
      externalPath: '/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449',
      locationsText: '2 Locations',
      postedOn: 'Posted 30+ Days Ago',
      bulletFields: ['R232449'],
    },
    {
      title: 'Senior Engineer - Mixed Signal',
      externalPath: '/job/Pune-Blue-Ridge-Hinjewadi/Senior-Engineer---Mixed-Signal_R242760',
      locationsText: 'Pune, Blue Ridge-Hinjewadi',
      postedOn: 'Posted 30+ Days Ago',
      bulletFields: ['R242760'],
    },
    {
      title: 'Senior Engineer ( C, RTOS)',
      externalPath: '/job/Hyderabad-Kondapur/Senior-Engineer---C--RTOS-_R241716-1',
      locationsText: 'Hyderabad, Kondapur',
      postedOn: 'Posted 30+ Days Ago',
      bulletFields: ['R241716'],
    },
    {
      title: 'Senior Software Test Engineer',
      externalPath: '/job/Bangalore-India/Lead---Principal-SDET_R245665',
      locationsText: 'Bangalore, India',
      postedOn: 'Posted 4 Days Ago',
      bulletFields: ['R245665'],
    },
  ],
}

const buildPosting = ({
  title,
  externalPath,
  locationsText,
  postedOn = 'Posted 30+ Days Ago',
}) => {
  const match = String(externalPath).match(/_(R\d+(?:-\d+)?)(?:\/)?$/i)
  if (!match) {
    throw new Error(`Unable to derive mock requisition id from ${externalPath}`)
  }

  return {
    title,
    externalPath,
    locationsText,
    postedOn,
    bulletFields: [match[1]],
  }
}

const pagedIndiaJobsPayloads = [
  {
    total: 22,
    jobPostings: [
      buildPosting({
        title: 'Senior Engineer - Data Engineer',
        externalPath: '/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449',
        locationsText: '2 Locations',
      }),
      buildPosting({
        title: 'Lead Data Platform Engineer (OpenSearch)',
        externalPath: '/job/Ahmedabad-India/Lead-Data-Platform-Engineer--OpenSearch-_R246369-1',
        locationsText: '2 Locations',
      }),
      ...Array.from({ length: 18 }, (_, index) => buildPosting({
        title: `Mock eInfochips Role ${index + 3}`,
        externalPath: `/job/Bangalore-India/Mock-eInfochips-Role-${index + 3}_R2500${index + 3}`,
        locationsText: index % 2 === 0 ? 'Bangalore, India' : '3 Locations',
        postedOn: `Posted ${index + 1} Days Ago`,
      })),
    ],
  },
  {
    total: 0,
    jobPostings: [
      buildPosting({
        title: 'Mock Final Role 21',
        externalPath: '/job/Hyderabad-India/Mock-Final-Role-21_R250021',
        locationsText: 'Hyderabad, India',
        postedOn: 'Posted Today',
      }),
      buildPosting({
        title: 'Mock Final Role 22',
        externalPath: '/job/Noida-India/Mock-Final-Role-22_R250022',
        locationsText: 'Noida, India',
        postedOn: 'Posted Yesterday',
      }),
    ],
  },
]

const loadModule = async () => {
  try {
    return await import('../../scraper/einfochips.workday/script.js')
  } catch {
    assert.fail('Expected eInfochips scraper module at ../../scraper/einfochips.workday/script.js')
  }
}

test('eInfochips constants and parsers stay pinned to the verified careers handoff, Arrow search page, and Workday India facet surface', async () => {
  const einfochips = await loadModule()

  assert.equal(einfochips.COMPANY_NAME, 'eInfochips')
  assert.equal(einfochips.OFFICIAL_BRAND_NAME, 'eInfochips')
  assert.equal(einfochips.SOURCE, 'einfochips')
  assert.equal(einfochips.COUNTRY_FILTER, 'India')
  assert.equal(einfochips.HOMEPAGE_URL, 'https://www.einfochips.com/')
  assert.equal(einfochips.CAREERS_URL, 'https://www.einfochips.com/careers/')
  assert.equal(
    einfochips.ARROW_SEARCH_URL,
    'https://careers.arrow.com/us/en/search-results?keywords=einfochips',
  )
  assert.equal(einfochips.WORKDAY_BOARD_URL, 'https://arrow.wd1.myworkdayjobs.com/AC')
  assert.equal(
    einfochips.JOBS_API_URL,
    'https://arrow.wd1.myworkdayjobs.com/wday/cxs/arrow/AC/jobs',
  )
  assert.equal(einfochips.VERIFIED_KEYWORD, 'einfochips')
  assert.equal(einfochips.VERIFIED_INDIA_COUNTRY_FACET_DESCRIPTOR, 'India')
  assert.equal(einfochips.VERIFIED_INDIA_COUNTRY_FACET_ID, INDIA_COUNTRY_FACET_ID)
  assert.equal(
    einfochips.VERIFIED_INDIA_JOB_URL,
    'https://arrow.wd1.myworkdayjobs.com/AC/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449',
  )
  assert.equal(
    einfochips.VERIFIED_INDIA_APPLY_URL,
    'https://arrow.wd1.myworkdayjobs.com/AC/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449/apply',
  )
  assert.equal(einfochips.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    einfochips.extractArrowSearchUrl(officialCareersHtml),
    'https://careers.arrow.com/us/en/search-results?keywords=einfochips',
  )
  assert.equal(einfochips.hasArrowSearchResultsSignal(arrowSearchPage), true)
  assert.equal(
    einfochips.extractVerifiedWorkdayBoardUrlFromSearchPage(arrowSearchPage.html),
    'https://arrow.wd1.myworkdayjobs.com/AC',
  )
  assert.equal(einfochips.hasOfficialWorkdayBoardSignal(officialWorkdayBoardPage), true)
  assert.equal(einfochips.extractIndiaCountryFacetId(unfilteredJobsPayload), INDIA_COUNTRY_FACET_ID)
  assert.deepEqual(
    JSON.parse(einfochips.buildKeywordSearchRequestBody({ offset: 0 })),
    {
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: 'einfochips',
    },
  )
  assert.deepEqual(
    JSON.parse(
      einfochips.buildIndiaJobsRequestBody({
        offset: 20,
        countryFacetId: INDIA_COUNTRY_FACET_ID,
      }),
    ),
    {
      appliedFacets: {
        Location_Country: [INDIA_COUNTRY_FACET_ID],
      },
      limit: 20,
      offset: 20,
      searchText: 'einfochips',
    },
  )
  assert.deepEqual(
    einfochips.extractJobsFromPayload(groupedJobsPayload, FIXED_SCRAPED_AT),
    [
      {
        jobId: 'R232449',
        title: 'Senior Engineer - Data Engineer',
        company: 'eInfochips',
        department: null,
        location: 'Ahmedabad, India',
        city: 'Ahmedabad',
        state: null,
        country: 'India',
        sourceUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449',
        applyUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449/apply',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 30+ Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R232449',
        source: 'einfochips',
        link: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'R242760',
        title: 'Senior Engineer - Mixed Signal',
        company: 'eInfochips',
        department: null,
        location: 'Pune, India',
        city: 'Pune',
        state: null,
        country: 'India',
        sourceUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Pune-Blue-Ridge-Hinjewadi/Senior-Engineer---Mixed-Signal_R242760',
        applyUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Pune-Blue-Ridge-Hinjewadi/Senior-Engineer---Mixed-Signal_R242760/apply',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 30+ Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R242760',
        source: 'einfochips',
        link: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Pune-Blue-Ridge-Hinjewadi/Senior-Engineer---Mixed-Signal_R242760/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'R241716',
        title: 'Senior Engineer ( C, RTOS)',
        company: 'eInfochips',
        department: null,
        location: 'Hyderabad, India',
        city: 'Hyderabad',
        state: null,
        country: 'India',
        sourceUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Hyderabad-Kondapur/Senior-Engineer---C--RTOS-_R241716-1',
        applyUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Hyderabad-Kondapur/Senior-Engineer---C--RTOS-_R241716-1/apply',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 30+ Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R241716',
        source: 'einfochips',
        link: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Hyderabad-Kondapur/Senior-Engineer---C--RTOS-_R241716-1/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'R245665',
        title: 'Senior Software Test Engineer',
        company: 'eInfochips',
        department: null,
        location: 'Bangalore, India',
        city: 'Bangalore',
        state: null,
        country: 'India',
        sourceUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Bangalore-India/Lead---Principal-SDET_R245665',
        applyUrl: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Bangalore-India/Lead---Principal-SDET_R245665/apply',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 4 Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'R245665',
        source: 'einfochips',
        link: 'https://arrow.wd1.myworkdayjobs.com/AC/job/Bangalore-India/Lead---Principal-SDET_R245665/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('run validates the verified careers handoff and extracts India jobs from the keyworded Arrow Workday API country facet across pages', async () => {
  const einfochips = await loadModule()
  const requestedPages = []
  const requestedJsonBodies = []

  const jobs = await einfochips.createEInfochipsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === einfochips.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === einfochips.ARROW_SEARCH_URL) {
        return arrowSearchPage
      }

      if (url === einfochips.WORKDAY_BOARD_URL) {
        return officialWorkdayBoardPage
      }

      throw new Error(`Unexpected eInfochips page URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      assert.equal(url, einfochips.JOBS_API_URL)
      requestedJsonBodies.push(JSON.parse(body))

      if (requestedJsonBodies.length === 1) return unfilteredJobsPayload
      if (requestedJsonBodies.length === 2) return pagedIndiaJobsPayloads[0]
      if (requestedJsonBodies.length === 3) return pagedIndiaJobsPayloads[1]

      throw new Error(`Unexpected eInfochips jobs API call #${requestedJsonBodies.length}`)
    },
  })

  assert.deepEqual(requestedPages, [
    einfochips.CAREERS_URL,
    einfochips.ARROW_SEARCH_URL,
    einfochips.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(requestedJsonBodies, [
    JSON.parse(einfochips.buildKeywordSearchRequestBody({ offset: 0 })),
    JSON.parse(
      einfochips.buildIndiaJobsRequestBody({
        offset: 0,
        countryFacetId: INDIA_COUNTRY_FACET_ID,
      }),
    ),
    JSON.parse(
      einfochips.buildIndiaJobsRequestBody({
        offset: 20,
        countryFacetId: INDIA_COUNTRY_FACET_ID,
      }),
    ),
  ])
  assert.equal(jobs.length, 22)
  assert.equal(jobs[0].source, 'einfochips')
  assert.equal(jobs[0].company, 'eInfochips')
  assert.equal(
    jobs[0].link,
    'https://arrow.wd1.myworkdayjobs.com/AC/job/Ahmedabad-India/Senior-Engineer--Level-1---Data-Engineer_R232449/apply',
  )
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[21].city, 'Noida')
  assert.equal(jobs[21].location, 'Noida, India')
})

test('eInfochips fails closed when the verified careers handoff, Arrow search page, Workday board, or India country facet changes materially', async () => {
  const einfochips = await loadModule()

  await assert.rejects(
    einfochips.createEInfochipsScraper().run({
      fetchPage: async (url) => {
        if (url === einfochips.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><a href="https://example.com/jobs">Apply Now</a></body></html>',
          }
        }

        throw new Error(`Unexpected eInfochips page URL: ${url}`)
      },
      fetchJson: async () => unfilteredJobsPayload,
    }),
    /verified official careers surface|verified careers handoff/i,
  )

  await assert.rejects(
    einfochips.createEInfochipsScraper().run({
      fetchPage: async (url) => {
        if (url === einfochips.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === einfochips.ARROW_SEARCH_URL) {
          return {
            ...arrowSearchPage,
            html: arrowSearchPage.html.replace(
              'https://arrow.wd1.myworkdayjobs.com/en-US/AC/',
              'https://example.com/jobs',
            ),
          }
        }

        throw new Error(`Unexpected eInfochips page URL: ${url}`)
      },
      fetchJson: async () => unfilteredJobsPayload,
    }),
    /verified arrow search surface|verified workday board handoff/i,
  )

  await assert.rejects(
    einfochips.createEInfochipsScraper().run({
      fetchPage: async (url) => {
        if (url === einfochips.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === einfochips.ARROW_SEARCH_URL) {
          return arrowSearchPage
        }

        if (url === einfochips.WORKDAY_BOARD_URL) {
          return {
            ...officialWorkdayBoardPage,
            html: officialWorkdayBoardPage.html.replace('siteId: "AC"', 'siteId: "ZZ"'),
          }
        }

        throw new Error(`Unexpected eInfochips page URL: ${url}`)
      },
      fetchJson: async () => unfilteredJobsPayload,
    }),
    /verified public workday board/i,
  )

  await assert.rejects(
    einfochips.createEInfochipsScraper().run({
      fetchPage: async (url) => {
        if (url === einfochips.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === einfochips.ARROW_SEARCH_URL) {
          return arrowSearchPage
        }

        if (url === einfochips.WORKDAY_BOARD_URL) {
          return officialWorkdayBoardPage
        }

        throw new Error(`Unexpected eInfochips page URL: ${url}`)
      },
      fetchJson: async () => ({
        total: 67,
        jobPostings: [],
        facets: [{ facetParameter: 'Job_Category', values: [] }],
      }),
    }),
    /verified india country facet changed/i,
  )
})
