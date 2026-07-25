import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | L&T Finance</title>
  </head>
  <body>
    <main>
      <h1>Shape your future with us</h1>
      <h2>Current Openings</h2>
      <a href="https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx">View all openings</a>
      <a href="https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx">Business Operations</a>
      <a href="https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx">Retail housing finance</a>
    </main>
  </body>
</html>
`

const jobsBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>LTFS - Workline - Possibilities Infinite</title>
  </head>
  <body>
    <main>
      <h1>Begin your search for greater opportunities</h1>
      <button>Search Jobs</button>
      <button>Post Resume</button>
    </main>
    <script src="GeneralOpenings7.js"></script>
  </body>
</html>
`

const listingRecords = [
  {
    PRFCode: 172337,
    ERFCode: 271427,
    ERF_Code: 271427,
    No_Of_Vacancies: 1,
    Req_No: '236010',
    Position_Name: 'AREA COLLECTION MANAGER',
    PublishDate: '16-Jul-2026',
    SearchKeyWord: 'AREA-COLLECTION-MANAGER-Job-in-VELLORE-VIRUTHAMPET-271427',
    TrackToken: '2afe821a-bfe0-4770-82f3-8ea3d05e94f4',
    City_Name: 'Vellore',
    state_name: 'Tamil Nadu',
    State: 'Tamil Nadu',
    Country_Name: 'India',
    Company_Name: 'URBAN FINANCE',
    FunctionName: 'TWO WHEELER FINANCE',
    FunName: 'TW - COLLECTIONS',
    Field1: 'TWO WHEELER FINANCE',
    Field2: 'VELLORE-VIRUTHAMPET',
    LOCATIONNAME: 'VELLORE-VIRUTHAMPET',
    Experience: '2 to 20 years',
  },
  {
    PRFCode: 172400,
    ERFCode: 271500,
    ERF_Code: 271500,
    No_Of_Vacancies: 1,
    Req_No: '236099',
    Position_Name: 'REGIONAL OPERATIONS MANAGER',
    PublishDate: '16-Jul-2026',
    SearchKeyWord: 'REGIONAL-OPERATIONS-MANAGER-Job-in-Dubai-271500',
    TrackToken: 'uuid-non-india-role',
    City_Name: 'Dubai',
    state_name: 'Dubai',
    State: 'Dubai',
    Country_Name: 'United Arab Emirates',
    Company_Name: 'INTERNATIONAL BUSINESS',
    FunctionName: 'OPERATIONS',
    FunName: 'OPERATIONS',
    Field1: 'OPERATIONS',
    Field2: 'Dubai',
    LOCATIONNAME: 'Dubai',
    Experience: '8 to 12 years',
  },
]

const jobsApiPayload = {
  d: {
    obj1: JSON.stringify(listingRecords),
    obj2: JSON.stringify([
      {
        OrgLabel: 'Location',
        AsFieldName: 'LOCATIONNAME',
      },
    ]),
  },
}

const loadScriptModule = async () => {
  try {
    return await import('../ltfinance/script.js')
  } catch {
    assert.fail('Expected L&T Finance scraper module at ../ltfinance/script.js')
  }
}

test('L&T Finance helpers stay pinned to the verified first-party careers handoff, Workline board, and jobs payload contract', async () => {
  const ltFinance = await loadScriptModule()

  assert.equal(ltFinance.SOURCE, 'ltfinance')
  assert.equal(ltFinance.COMPANY, 'L&T Finance')
  assert.equal(ltFinance.OFFICIAL_BRAND_NAME, 'L&T Finance')
  assert.equal(ltFinance.VERIFIED_ON, '2026-07-16')
  assert.equal(ltFinance.CAREERS_URL, 'https://www.ltfinance.com/careers')
  assert.equal(
    ltFinance.JOBS_BOARD_URL,
    'https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx',
  )
  assert.equal(
    ltFinance.JOBS_API_URL,
    'https://myltfs.ltfs.com/CPortal/generalopening.aspx/GetCurrentopening',
  )
  assert.deepEqual(ltFinance.JOBS_API_BODY, {
    JDFileName: '',
    OrgCode: '',
    KeyName: '',
    Type: 'D',
    StateCode: '',
  })
  assert.equal(ltFinance.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    ltFinance.extractJobsBoardUrl(careersHtml),
    ltFinance.JOBS_BOARD_URL,
  )
  assert.equal(ltFinance.hasOfficialJobsBoardSignal(jobsBoardHtml), true)
  assert.equal(ltFinance.hasVerifiedJobsPayloadContract(jobsApiPayload), true)
  assert.deepEqual(ltFinance.extractListingRecords(jobsApiPayload), listingRecords)
  assert.equal(
    ltFinance.buildDetailUrl(listingRecords[0]),
    'https://myltfs.ltfs.com/CandidatePortal/2afe821a-bfe0-4770-82f3-8ea3d05e94f4/AREA-COLLECTION-MANAGER-Job-in-VELLORE-VIRUTHAMPET-271427',
  )
  assert.deepEqual(
    ltFinance.mapListingRecordToJob(listingRecords[0], {
      scrapedAt: '2026-07-16T11:00:00.000Z',
    }),
    {
      title: 'AREA COLLECTION MANAGER',
      company: 'L&T Finance',
      department: 'TW - COLLECTIONS',
      location: 'VELLORE-VIRUTHAMPET, Tamil Nadu, India',
      city: 'Vellore',
      country: 'India',
      sourceUrl:
        'https://myltfs.ltfs.com/CandidatePortal/2afe821a-bfe0-4770-82f3-8ea3d05e94f4/AREA-COLLECTION-MANAGER-Job-in-VELLORE-VIRUTHAMPET-271427',
      applyUrl:
        'https://myltfs.ltfs.com/CandidatePortal/2afe821a-bfe0-4770-82f3-8ea3d05e94f4/AREA-COLLECTION-MANAGER-Job-in-VELLORE-VIRUTHAMPET-271427',
      jobId: 'ltfinance-271427',
      requisitionId: '236010',
      employmentType: null,
      workplaceType: null,
      experienceRequired: '2 to 20 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      compensation: null,
      postingDate: '2026-07-16',
      closingDate: null,
      jobDescription: [
        'Platform: URBAN FINANCE',
        'Business unit: TWO WHEELER FINANCE',
        'Function: TW - COLLECTIONS',
        'Location: VELLORE-VIRUTHAMPET',
        'City: Vellore',
        'Open positions: 1',
        'Posted: 16-Jul-2026',
      ].join('\n'),
      source: 'ltfinance',
      companyCareerPage: 'https://www.ltfinance.com/careers',
      companyDomain: 'ltfinance.com',
      atsPlatform: 'workline-public-jobs-api',
      link:
        'https://myltfs.ltfs.com/CandidatePortal/2afe821a-bfe0-4770-82f3-8ea3d05e94f4/AREA-COLLECTION-MANAGER-Job-in-VELLORE-VIRUTHAMPET-271427',
      scrapedAt: '2026-07-16T11:00:00.000Z',
    },
  )
})

test('L&T Finance run validates the first-party careers handoff, Workline board, and jobs payload before returning normalized India jobs', async () => {
  const ltFinance = await loadScriptModule()
  const pageRequests = []
  const jsonRequests = []

  const jobs = await ltFinance.createLtFinanceScraper({
    now: () => '2026-07-16T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === ltFinance.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected L&T Finance URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      jsonRequests.push({
        url,
        method: options.method || 'GET',
        body: options.body ?? null,
      })

      if (url === ltFinance.JOBS_API_URL) {
        return jobsApiPayload
      }

      throw new Error(`Unexpected L&T Finance JSON URL: ${url}`)
    },
  })

  assert.deepEqual(pageRequests, [
    ltFinance.CAREERS_URL,
  ])
  assert.deepEqual(jsonRequests, [
    {
      url: ltFinance.JOBS_API_URL,
      method: 'POST',
      body: JSON.stringify({
        JDFileName: '',
        OrgCode: '',
        KeyName: '',
        Type: 'D',
        StateCode: '',
      }),
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'AREA COLLECTION MANAGER')
  assert.equal(jobs[0].company, 'L&T Finance')
  assert.equal(jobs[0].city, 'Vellore')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-16T12:00:00.000Z')
})

test('L&T Finance fails closed when the careers handoff, Workline board, or API contract drifts', async () => {
  const ltFinance = await loadScriptModule()

  await assert.rejects(
    ltFinance.createLtFinanceScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: ltFinance.CAREERS_URL,
        html: '<html><head><title>Unexpected</title></head><body>Placeholder</body></html>',
      }),
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    ltFinance.createLtFinanceScraper().run({
      fetchPage: async (url) => {
        if (url === ltFinance.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replaceAll(
              'https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx',
              'https://example.com/jobs',
            ),
          }
        }

        throw new Error(`Unexpected L&T Finance URL: ${url}`)
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    ltFinance.createLtFinanceScraper().run({
      fetchPage: async (url) => {
        if (url === ltFinance.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        throw new Error(`Unexpected L&T Finance URL: ${url}`)
      },
      fetchJson: async () => ({ d: { obj1: '{}' } }),
    }),
    /verified jobs api/i,
  )
})
