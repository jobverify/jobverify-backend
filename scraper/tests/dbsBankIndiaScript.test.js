import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at DBS | DBS Bank</title>
  </head>
  <body>
    <main>
      <nav>
        <a href="https://dbs.wd3.myworkdayjobs.com/DBS_Careers">Explore Jobs</a>
        <a href="/gsmc-grp/careers/teams/india.page">India</a>
      </nav>
      <h1>Live more, Bank less</h1>
    </main>
  </body>
</html>
`

const officialWorkdayBoardHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <link rel="canonical" href="https://dbs.wd3.myworkdayjobs.com/DBS_Careers" />
    <meta property="og:url" content="https://dbs.wd3.myworkdayjobs.com/DBS_Careers">
    <meta
      name="description"
      property="og:description"
      content="DBS is more than a bank — we're shaping the future of finance and communities."
    >
  </head>
  <body>
    <script type="text/javascript">
      window.workday = {
        tenant: "dbs",
        siteId: "DBS_Careers",
        requestLocale: "en-US"
      }
    </script>
  </body>
</html>
`

const unfilteredJobsPayload = {
  total: 1378,
  jobPostings: [
    {
      title: 'SVP/ VP, Planned Trust Product Manager, Investment Products & Advisory, Consumer Banking Group',
      externalPath: '/job/Taipei/Trust-PM_WD86316',
      locationsText: 'Taipei',
      postedOn: 'Posted 12 Days Ago',
      bulletFields: ['WD86316'],
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
          facetParameter: 'locationCountry',
          descriptor: 'Market',
          values: [
            {
              descriptor: 'Australia',
              id: 'd903bb3fedad45039383f6de334ad4db',
              count: 6,
            },
            {
              descriptor: 'India',
              id: 'c4f78be1a8f14da0ab49ce1162348a5e',
              count: 484,
            },
          ],
        },
      ],
    },
  ],
}

const filteredIndiaJobsPayload = {
  total: 4,
  jobPostings: [
    {
      title: 'Assistant Officer, Personal Banker, Consumer Banking Group',
      externalPath: '/job/Bye-Pass-Road-Madurai/Personal-Banker_230000FK',
      locationsText: 'Bye-Pass Road, Madurai',
      postedOn: 'Posted Today',
      bulletFields: ['230000FK'],
    },
    {
      title: 'Associate, Relationship Manager, Credit Program Small, Small Medium Enterprises',
      externalPath: '/job/Kolkata-DBIL/Associate--Relationship-Manager--Credit-Program-Small--Small-Medium-Enterprises_WD86720',
      locationsText: 'Kolkata-DBIL',
      postedOn: 'Posted Today',
      bulletFields: ['WD86720'],
    },
    {
      title: 'Assistant Vice President , Regional Sales Manager ,Consumer Banking Group',
      externalPath: '/job/Hyderabad-DBIL/Assistant-Vice-President---Regional-Sales-Manager--Consumer-Banking-Group_WD86755',
      locationsText: 'Hyderabad-DBIL',
      postedOn: 'Posted Today',
      bulletFields: ['WD86755'],
    },
    {
      title: 'Vice President, Treasures Private Client, Consumer Banking Group',
      externalPath: '/job/Regional-Office-Mumbai/Vice-President--Treasures-Private-Client--Consumer-Banking-Group_WD86416',
      locationsText: 'Regional Office Mumbai',
      postedOn: 'Posted Today',
      bulletFields: ['WD86416'],
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../dbsbankindia/script.js')
  } catch {
    assert.fail('Expected DBS Bank India scraper module at ../dbsbankindia/script.js')
  }
}

test('DBS Bank India pins the verified first-party careers page, public Workday board, and India country facet contract', async () => {
  const dbsBankIndia = await loadModule()

  assert.equal(dbsBankIndia.SOURCE, 'dbsbankindia')
  assert.equal(dbsBankIndia.COMPANY, 'DBS Bank India')
  assert.equal(dbsBankIndia.CAREERS_URL, 'https://www.dbs.com/careers/default.page')
  assert.equal(dbsBankIndia.WORKDAY_BOARD_URL, 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers')
  assert.equal(
    dbsBankIndia.JOBS_API_URL,
    'https://dbs.wd3.myworkdayjobs.com/wday/cxs/dbs/DBS_Careers/jobs',
  )
  assert.equal(
    dbsBankIndia.VERIFIED_INDIA_COUNTRY_FACET_ID,
    'c4f78be1a8f14da0ab49ce1162348a5e',
  )
  assert.equal(dbsBankIndia.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    dbsBankIndia.extractVerifiedWorkdayBoardUrl(officialCareersHtml),
    'https://dbs.wd3.myworkdayjobs.com/DBS_Careers',
  )
  assert.equal(dbsBankIndia.hasOfficialWorkdayBoardSignal(officialWorkdayBoardHtml), true)
  assert.equal(
    dbsBankIndia.extractIndiaCountryFacetId(unfilteredJobsPayload),
    'c4f78be1a8f14da0ab49ce1162348a5e',
  )
  assert.deepEqual(
    JSON.parse(dbsBankIndia.buildUnfilteredJobsRequestBody({ offset: 0 })),
    {
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: '',
    },
  )
  assert.deepEqual(
    JSON.parse(
      dbsBankIndia.buildIndiaJobsRequestBody({
        offset: 20,
        countryFacetId: 'c4f78be1a8f14da0ab49ce1162348a5e',
      }),
    ),
    {
      appliedFacets: {
        locationCountry: ['c4f78be1a8f14da0ab49ce1162348a5e'],
      },
      limit: 20,
      offset: 20,
      searchText: '',
    },
  )
})

test('DBS Bank India run validates the verified first-party handoff and extracts India Workday jobs', async () => {
  const dbsBankIndia = await loadModule()
  const requestedPages = []
  const requestedJsonBodies = []

  const jobs = await dbsBankIndia.createDbsBankIndiaScraper({
    now: () => '2026-07-15T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === dbsBankIndia.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === dbsBankIndia.WORKDAY_BOARD_URL) {
        return {
          status: 200,
          url,
          html: officialWorkdayBoardHtml,
        }
      }

      throw new Error(`Unexpected DBS Bank India page URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      assert.equal(url, dbsBankIndia.JOBS_API_URL)
      requestedJsonBodies.push(JSON.parse(body))

      if (requestedJsonBodies.length === 1) {
        return unfilteredJobsPayload
      }

      if (requestedJsonBodies.length === 2) {
        return filteredIndiaJobsPayload
      }

      throw new Error(`Unexpected DBS Bank India jobs API call #${requestedJsonBodies.length}`)
    },
  })

  assert.deepEqual(requestedPages, [
    dbsBankIndia.CAREERS_URL,
    dbsBankIndia.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(requestedJsonBodies, [
    JSON.parse(dbsBankIndia.buildUnfilteredJobsRequestBody({ offset: 0 })),
    JSON.parse(
      dbsBankIndia.buildIndiaJobsRequestBody({
        offset: 0,
        countryFacetId: 'c4f78be1a8f14da0ab49ce1162348a5e',
      }),
    ),
  ])

  assert.deepEqual(jobs, [
    {
      jobId: '230000FK',
      title: 'Assistant Officer, Personal Banker, Consumer Banking Group',
      company: 'DBS Bank India',
      department: null,
      location: 'Madurai, India',
      city: 'Madurai',
      locations: ['Bye-Pass Road, Madurai'],
      link: 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Bye-Pass-Road-Madurai/Personal-Banker_230000FK',
      source: 'dbsbankindia',
      postedAt: null,
      closingDate: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      experienceRequired: null,
      requisitionId: '230000FK',
      scrapedAt: '2026-07-15T00:00:00.000Z',
    },
    {
      jobId: 'WD86755',
      title: 'Assistant Vice President , Regional Sales Manager ,Consumer Banking Group',
      company: 'DBS Bank India',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      locations: ['Hyderabad-DBIL'],
      link: 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Hyderabad-DBIL/Assistant-Vice-President---Regional-Sales-Manager--Consumer-Banking-Group_WD86755',
      source: 'dbsbankindia',
      postedAt: null,
      closingDate: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      experienceRequired: null,
      requisitionId: 'WD86755',
      scrapedAt: '2026-07-15T00:00:00.000Z',
    },
    {
      jobId: 'WD86720',
      title: 'Associate, Relationship Manager, Credit Program Small, Small Medium Enterprises',
      company: 'DBS Bank India',
      department: null,
      location: 'Kolkata, India',
      city: 'Kolkata',
      locations: ['Kolkata-DBIL'],
      link: 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Kolkata-DBIL/Associate--Relationship-Manager--Credit-Program-Small--Small-Medium-Enterprises_WD86720',
      source: 'dbsbankindia',
      postedAt: null,
      closingDate: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      experienceRequired: null,
      requisitionId: 'WD86720',
      scrapedAt: '2026-07-15T00:00:00.000Z',
    },
    {
      jobId: 'WD86416',
      title: 'Vice President, Treasures Private Client, Consumer Banking Group',
      company: 'DBS Bank India',
      department: null,
      location: 'Mumbai, India',
      city: 'Mumbai',
      locations: ['Regional Office Mumbai'],
      link: 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Regional-Office-Mumbai/Vice-President--Treasures-Private-Client--Consumer-Banking-Group_WD86416',
      source: 'dbsbankindia',
      postedAt: null,
      closingDate: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      experienceRequired: null,
      requisitionId: 'WD86416',
      scrapedAt: '2026-07-15T00:00:00.000Z',
    },
  ])
})

test('DBS Bank India fails closed when the verified careers handoff or India country facet changes materially', async () => {
  const dbsBankIndia = await loadModule()

  await assert.rejects(
    dbsBankIndia.createDbsBankIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === dbsBankIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1></body></html>',
          }
        }

        throw new Error(`Unexpected DBS Bank India page URL: ${url}`)
      },
      fetchJson: async () => filteredIndiaJobsPayload,
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    dbsBankIndia.createDbsBankIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === dbsBankIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml.replace(
              'https://dbs.wd3.myworkdayjobs.com/DBS_Careers',
              'https://example.com/jobs',
            ),
          }
        }

        throw new Error(`Unexpected DBS Bank India page URL: ${url}`)
      },
      fetchJson: async () => filteredIndiaJobsPayload,
    }),
    /verified workday handoff changed/i,
  )

  await assert.rejects(
    dbsBankIndia.createDbsBankIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === dbsBankIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === dbsBankIndia.WORKDAY_BOARD_URL) {
          return {
            status: 200,
            url,
            html: officialWorkdayBoardHtml,
          }
        }

        throw new Error(`Unexpected DBS Bank India page URL: ${url}`)
      },
      fetchJson: async () => ({
        total: 1378,
        jobPostings: [],
        facets: [{ facetParameter: 'jobFamilyGroup', values: [] }],
      }),
    }),
    /verified india country facet changed/i,
  )
})
