import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en-IN">
  <head>
    <title data-react-helmet="true">Careers At Navi | Join Our Team</title>
  </head>
  <body>
    <main>
      <h1>Careers At Navi</h1>
      <p>Join us in simplifying finance for a billion people.</p>
      <a
        href="https://navi.turbohire.co/dashboardv2?orgId=3e818601-0baa-429c-b6f8-4b21903ae0e6&type=0"
        target="_blank"
        rel="noopener noreferrer"
      >
        View Open Roles
      </a>
    </main>
  </body>
</html>
`

const officialBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Navi</title>
    <meta property="og:title" content="Navi - Career Page" />
    <meta property="og:description" content="Explore job opportunities at Navi" />
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`

const tokenPayload = {
  access_token: 'public-token-123',
}

const sampleFilteredJobsPayload = {
  Total: 2,
  Result: [
    {
      JobId: '25fcd1c3-d23d-4b08-99fd-204ec8f4b696',
      JobIdObfuscated: 'Cvxwte5N5snwG3hC%2FJkmZDU3RTVAq0zyKiiGLI4keyB3_3_ZUhAlZKVULxyMnx6q',
      JobCode: 'N-54856',
      JobTitle: 'Associate Manager II - Economist(Credit Risk)',
      Department: 'Credit Risk',
      PublishedDate: '2026-07-16T05:43:36.5983344Z',
      ExpiryDates: {
        CAREERPAGE: '2026-08-31T18:29:00.32Z',
      },
      Location: '[{"Address":"Bangalore, Karnataka, India","PlaceId":null}]',
      JobTypeV2: 'Full Time',
      Experience: {},
      Skills: [
        'Economics',
        'Time series modelling',
        'Macro economics',
        'Stress testing',
        'Forecasting',
      ],
      OrgDetails: {
        OrgID: '3e818601-0baa-429c-b6f8-4b21903ae0e6',
        OrgName: 'Navi',
      },
      JobDescV2:
        '<h3>About the Team</h3><p>The Credit Risk team at Navi drives risk strategy and forecasting.</p>',
    },
    {
      JobId: 'ignore-non-india-role',
      JobIdObfuscated: 'ignore-obfuscated-role',
      JobCode: 'OTHER-101',
      JobTitle: 'Ignore This Role',
      Department: 'Other',
      PublishedDate: '2026-07-10T00:00:00.0000000Z',
      ExpiryDates: {
        CAREERPAGE: '2026-12-31T00:00:00',
      },
      Location: '[{"Address":"London, United Kingdom","PlaceId":null}]',
      JobTypeV2: 'Full Time',
      Experience: {
        MinExp: 2,
        MaxExp: 3,
      },
      Skills: ['Ignore'],
      OrgDetails: {
        OrgID: 'other-org-id',
        OrgName: 'Other Company',
      },
      JobDescV2: '<p>Ignore this job.</p>',
    },
  ],
}

const loadNaviModule = async () => {
  try {
    return await import('../../scraper/navi/script.js')
  } catch {
    assert.fail('Expected Navi scraper module at ../../scraper/navi/script.js')
  }
}

test('Navi helpers stay pinned to the verified first-party careers handoff and TurboHire public jobs contract', async () => {
  const navi = await loadNaviModule()

  assert.equal(navi.SOURCE, 'navi')
  assert.equal(navi.COMPANY_NAME, 'Navi')
  assert.equal(navi.OFFICIAL_BRAND_NAME, 'Navi Limited')
  assert.equal(navi.CAREERS_PAGE_URL, 'https://navi.com/careers')
  assert.equal(
    navi.TURBOHIRE_BOARD_URL,
    'https://navi.turbohire.co/dashboardv2?orgId=3e818601-0baa-429c-b6f8-4b21903ae0e6&type=0',
  )
  assert.equal(navi.ORIGIN, 'https://navi.turbohire.co')
  assert.equal(navi.ORG_ID, '3e818601-0baa-429c-b6f8-4b21903ae0e6')
  assert.equal(navi.NOAUTH_TOKEN_URL, 'https://thapi.azurewebsites.net/api/token/noauth')
  assert.equal(
    navi.FILTERED_JOBS_URL,
    'https://thapi.azurewebsites.net/api/careerpagev2/filteredjobs?orgId=3e818601-0baa-429c-b6f8-4b21903ae0e6&pageType=0',
  )
  assert.equal(navi.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(
    navi.extractTurboHireHandoffUrl(officialCareersHtml),
    'https://navi.turbohire.co/dashboardv2?orgId=3e818601-0baa-429c-b6f8-4b21903ae0e6&type=0',
  )
  assert.equal(navi.hasOfficialBoardSignal(officialBoardHtml), true)
  assert.deepEqual(JSON.parse(navi.buildFilteredJobsRequestBody()), {
    SortByV2: { Key: 'PostedDate', Order: 2 },
    BunitIds: { Value: null, FilterType: 0 },
    Experience: { Value: null, FilterType: 0 },
    JobTypes: { Value: null, FilterType: 0 },
    JobTypeV2: { Value: null, FilterType: 0 },
    Locations: { Value: null, FilterType: 0 },
    CreatedDate: { Value: null, FilterType: 0 },
    Compensation: { Value: null, FilterType: 0 },
    Skills: { Value: null, FilterType: 0 },
    Keyword: '',
    ClientIds: { Value: null, FilterType: 0 },
    Department: '',
    CustomFields: {},
  })
  assert.deepEqual(navi.extractPublicJobs(sampleFilteredJobsPayload), [
    {
      title: 'Associate Manager II - Economist(Credit Risk)',
      company: 'Navi',
      department: 'Credit Risk',
      location: 'Bangalore, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '25fcd1c3-d23d-4b08-99fd-204ec8f4b696',
      requisitionId: 'N-54856',
      sourceUrl: 'https://navi.turbohire.co/job/publicjobs/Cvxwte5N5snwG3hC%2FJkmZDU3RTVAq0zyKiiGLI4keyB3_3_ZUhAlZKVULxyMnx6q',
      applyUrl: 'https://navi.turbohire.co/job/publicjobs/Cvxwte5N5snwG3hC%2FJkmZDU3RTVAq0zyKiiGLI4keyB3_3_ZUhAlZKVULxyMnx6q',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Economics',
        'Time series modelling',
        'Macro economics',
        'Stress testing',
        'Forecasting',
      ],
      postingDate: '2026-07-16T05:43:36.5983344Z',
      closingDate: '2026-08-31T18:29:00.32Z',
      jobDescription: 'About the Team The Credit Risk team at Navi drives risk strategy and forecasting.',
      publicExperienceChecked: true,
    },
  ])
})

test('Navi run validates the official careers handoff, board shell, and public TurboHire feed', async () => {
  const navi = await loadNaviModule()
  const pageRequests = []
  const jsonRequests = []

  const jobs = await navi.createNaviScraper({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === navi.CAREERS_PAGE_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === navi.TURBOHIRE_BOARD_URL) {
        return {
          status: 200,
          url,
          html: officialBoardHtml,
        }
      }

      throw new Error(`Unexpected Navi page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      jsonRequests.push({
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
      })

      if (url === navi.NOAUTH_TOKEN_URL) return tokenPayload
      if (url === navi.FILTERED_JOBS_URL) return sampleFilteredJobsPayload

      throw new Error(`Unexpected Navi json URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  }).run()

  assert.deepEqual(pageRequests, [
    navi.CAREERS_PAGE_URL,
    navi.TURBOHIRE_BOARD_URL,
  ])
  assert.deepEqual(
    jsonRequests.map((request) => [request.url, request.method]),
    [
      [navi.NOAUTH_TOKEN_URL, 'GET'],
      [navi.FILTERED_JOBS_URL, 'POST'],
    ],
  )
  assert.equal(jsonRequests[0].headers.Origin, 'https://navi.turbohire.co')
  assert.equal(jsonRequests[1].headers.Authorization, 'Bearer public-token-123')
  assert.equal(jsonRequests[1].headers['Content-Type'], 'application/json')
  assert.equal(jsonRequests[1].body, navi.buildFilteredJobsRequestBody())
  assert.deepEqual(jobs, [
    {
      title: 'Associate Manager II - Economist(Credit Risk)',
      company: 'Navi',
      department: 'Credit Risk',
      location: 'Bangalore, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '25fcd1c3-d23d-4b08-99fd-204ec8f4b696',
      requisitionId: 'N-54856',
      sourceUrl: 'https://navi.turbohire.co/job/publicjobs/Cvxwte5N5snwG3hC%2FJkmZDU3RTVAq0zyKiiGLI4keyB3_3_ZUhAlZKVULxyMnx6q',
      applyUrl: 'https://navi.turbohire.co/job/publicjobs/Cvxwte5N5snwG3hC%2FJkmZDU3RTVAq0zyKiiGLI4keyB3_3_ZUhAlZKVULxyMnx6q',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Economics',
        'Time series modelling',
        'Macro economics',
        'Stress testing',
        'Forecasting',
      ],
      postingDate: '2026-07-16T05:43:36.5983344Z',
      closingDate: '2026-08-31T18:29:00.32Z',
      jobDescription: 'About the Team The Credit Risk team at Navi drives risk strategy and forecasting.',
      publicExperienceChecked: true,
      source: 'navi',
      link: 'https://navi.turbohire.co/job/publicjobs/Cvxwte5N5snwG3hC%2FJkmZDU3RTVAq0zyKiiGLI4keyB3_3_ZUhAlZKVULxyMnx6q',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
  ])
})

test('Navi fails closed when the verified official careers handoff or board changes materially', async () => {
  const navi = await loadNaviModule()

  await assert.rejects(
    navi.createNaviScraper({
      fetchPage: async (url) => {
        if (url === navi.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Navi careers changed</h1></body></html>',
          }
        }

        throw new Error(`Unexpected Navi page URL: ${url}`)
      },
    }).run(),
    /verified official careers page/i,
  )

  await assert.rejects(
    navi.createNaviScraper({
      fetchPage: async (url) => {
        if (url === navi.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === navi.TURBOHIRE_BOARD_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Board changed</h1></body></html>',
          }
        }

        throw new Error(`Unexpected Navi page URL: ${url}`)
      },
    }).run(),
    /verified turbohire board/i,
  )
})
