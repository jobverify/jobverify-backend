import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T18:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Techwave Careers: Empowering Your Success</title>
  </head>
  <body>
    <h1>Work that moves you.</h1>
    <a href="https://techwave.wd108.myworkdayjobs.com/TechWave_Careers">Explore Opportunities</a>
    <a href="https://www.techwave.com/careers/">View Open Roles</a>
  </body>
</html>
`

const workdayBoardHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <link rel="canonical" href="https://techwave.wd108.myworkdayjobs.com/TechWave_Careers" />
  </head>
  <body>
    <img src="https://techwave.wd108.myworkdayjobs.com/TechWave_Careers/assets/logo" />
  </body>
</html>
`

const unfilteredPayload = {
  total: 72,
  jobPostings: [
    {
      title: 'Finance Intern',
      externalPath: '/job/Budapest/Finance-Intern_TW-1280',
      locationsText: 'Budapest',
      postedOn: 'Posted Today',
      bulletFields: ['TW-1280'],
      timeType: 'Part time',
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
            { descriptor: 'Bangalore', id: 'bangalore-id', count: 3 },
            { descriptor: 'GDC Financial District', id: 'gdc-financial-id', count: 42 },
            { descriptor: 'GDC HiTech', id: 'gdc-hitech-id', count: 3 },
            { descriptor: 'Khammam', id: 'khammam-id', count: 3 },
            { descriptor: 'Budapest', id: 'budapest-id', count: 19 },
          ],
        },
      ],
    },
  ],
}

const filteredIndiaPayload = {
  total: 4,
  jobPostings: [
    {
      title: 'Sr. Data Architect (Databricks)',
      externalPath: '/job/GDC-Financial-District/Sr-Data-Architect--Databricks-_TW-1275',
      locationsText: 'GDC Financial District',
      postedOn: 'Posted Today',
      bulletFields: ['TW-1275'],
      timeType: 'Full time',
    },
    {
      title: 'Telecom-ATT-(ES050)',
      externalPath: '/job/GDC-HiTech/Telecom-ATT--ES050-_',
      locationsText: '2 Locations',
      postedOn: 'Posted Yesterday',
      bulletFields: [],
      timeType: 'Full time',
    },
    {
      title: 'Service Delivery Manager – AI/ML and Data',
      externalPath: '/job/GDC-Financial-District/Service-Delivery-Manager---AI-ML-and-Data_TW-1262',
      locationsText: 'GDC Financial District',
      postedOn: 'Posted 3 Days Ago',
      bulletFields: ['TW-1262'],
      timeType: 'Full time',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../techwaveconsulting/script.js')
  } catch {
    assert.fail('Expected Techwave Consulting scraper module at ../techwaveconsulting/script.js')
  }
}

test('Techwave Consulting helpers stay pinned to the verified shell, public Workday board, and India location facets', async () => {
  const techwave = await loadModule()

  assert.equal(techwave.SOURCE, 'techwaveconsulting')
  assert.equal(techwave.COMPANY, 'Techwave Consulting')
  assert.equal(techwave.CAREERS_URL, 'https://www.techwave.com/career/')
  assert.equal(techwave.WORKDAY_BOARD_URL, 'https://techwave.wd108.myworkdayjobs.com/TechWave_Careers')
  assert.equal(
    techwave.JOBS_API_URL,
    'https://techwave.wd108.myworkdayjobs.com/wday/cxs/techwave/TechWave_Careers/jobs',
  )
  assert.equal(techwave.VERIFIED_ON, '2026-07-17')
  assert.equal(techwave.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(techwave.hasOfficialWorkdayBoardSignal(workdayBoardHtml), true)
  assert.deepEqual(techwave.extractIndiaLocationFacetIds(unfilteredPayload), [
    'bangalore-id',
    'gdc-financial-id',
    'gdc-hitech-id',
    'khammam-id',
  ])
})

test('Techwave Consulting run validates the shell and returns India jobs from the public Workday jobs API', async () => {
  const techwave = await loadModule()
  const requestedTexts = []
  const requestedJsonBodies = []

  const jobs = await techwave.createTechwaveConsultingScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === techwave.CAREERS_URL) return careersHtml
      if (url === techwave.WORKDAY_BOARD_URL) return workdayBoardHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      assert.equal(url, techwave.JOBS_API_URL)
      requestedJsonBodies.push(JSON.parse(body))
      if (requestedJsonBodies.length === 1) return unfilteredPayload
      if (requestedJsonBodies.length === 2) return filteredIndiaPayload
      throw new Error(`Unexpected Techwave API call #${requestedJsonBodies.length}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    techwave.CAREERS_URL,
    techwave.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(requestedJsonBodies, [
    {
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: '',
    },
    {
      appliedFacets: {
        locations: ['bangalore-id', 'gdc-financial-id', 'gdc-hitech-id', 'khammam-id'],
      },
      limit: 20,
      offset: 0,
      searchText: '',
    },
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'techwaveconsulting')
  assert.equal(jobs[0].companyCareerPage, 'https://www.techwave.com/career/')
  assert.equal(jobs[0].companyDomain, 'techwave.com')
  assert.equal(jobs[0].atsPlatform, 'workday-jobs-api')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[0].jobId, 'TW-1275')
  assert.equal(jobs[1].location, '2 Locations, India')
})

test('Techwave Consulting fails closed when the shell, board, or India location facets change', async () => {
  const techwave = await loadModule()

  await assert.rejects(
    techwave.createTechwaveConsultingScraper().run({
      fetchText: async (url) => (url === techwave.CAREERS_URL ? '<html><body><h1>Careers</h1></body></html>' : workdayBoardHtml),
      fetchJson: async () => unfilteredPayload,
    }),
    /verified Techwave careers shell/i,
  )

  await assert.rejects(
    techwave.createTechwaveConsultingScraper().run({
      fetchText: async (url) => (url === techwave.CAREERS_URL ? careersHtml : '<html><body><h1>Board</h1></body></html>'),
      fetchJson: async () => unfilteredPayload,
    }),
    /verified Techwave workday board/i,
  )

  await assert.rejects(
    techwave.createTechwaveConsultingScraper().run({
      fetchText: async (url) => (url === techwave.CAREERS_URL ? careersHtml : workdayBoardHtml),
      fetchJson: async () => ({
        total: 72,
        jobPostings: [],
        facets: [],
      }),
    }),
    /verified Techwave india workday facet/i,
  )
})
