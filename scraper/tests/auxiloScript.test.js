import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Education Loans - Apply for Student Loan from Auxilo</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/careers">Careers</a>
      </nav>
    </header>
    <main>
      <h1>Auxilo</h1>
      <p>Education loans that support students and institutions.</p>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Opportunity to join us | Auxilo Finserve</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Browse all available jobs at Auxilo</p>
      <a href="https://app1176.workline.hr/candidate">Click here to View Current Openings</a>
    </main>
  </body>
</html>
`

const jobsBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Auxilo - Workline - Possibilities Infinite</title>
  </head>
  <body>
    <main>
      <h1>Begin your search for greater opportunities</h1>
      <button>Search Jobs</button>
      <button>Post Resume</button>
    </main>
    <script src="GeneralOpenings.js"></script>
  </body>
</html>
`

const listingRecords = [
  {
    Req_No: '2321',
    Position_Name: 'Territory Credit Head - EIL',
    LOCATIONNAME: 'Hyderabad',
    Experience: '8 to 16 years',
    PublishDate: '14-Jul-2026',
    TrackToken: 'b48c8d0a-777c-4046-8617-f41f8bfe5004',
    SearchKeyWord: 'Territory-Credit-Head---EIL-Job-in-Hyderabad-1325',
    Field1: 'Education Institution Loans',
    Field2: 'Hyderabad',
    TimeDiff: 'Posted 7 hours ago',
    FunName: 'Credit - EIL',
    State_Name: 'Telangana',
    Country_Name: 'India',
    GradeName: 'Senior Manager',
    CustomName1: 'PM',
    Business_Name: 'Auxilo',
    No_Of_Vacancies: 1,
  },
  {
    Req_No: '2316',
    Position_Name: 'Office 365 Administrator',
    LOCATIONNAME: 'Mumbai - Corporate Office 1',
    Experience: '0 years',
    PublishDate: '13-Jul-2026',
    TrackToken: '06fe21e0-d262-4b08-b0f3-ccedc41492d9',
    SearchKeyWord: 'Office-365-Administrator-Job-in-Mumbai---Corporate-Office-1-1320',
    Field1: 'Technology',
    Field2: 'Mumbai - Corporate Office 1',
    FunName: 'IT Infrastructure',
    Country_Name: 'India',
    GradeName: 'Executive',
    Business_Name: 'Auxilo',
    No_Of_Vacancies: 1,
  },
]

const jobsApiPayload = {
  d: {
    obj1: JSON.stringify(listingRecords),
    obj2: JSON.stringify([
      {
        Name: 'Location',
        Values: ['Hyderabad', 'Mumbai - Corporate Office 1'],
      },
    ]),
  },
}

const buildDetailHtml = ({ title, reqNo, location, publishDate, trackToken }) => `
<!doctype html>
<html lang="en">
  <head>
    <title>${title}</title>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <div>Job Code: ${reqNo}</div>
      <div>Location: ${location}</div>
      <div>Posted Date: ${publishDate}</div>
      <section>
        <h2>Job Description</h2>
        <p>Key Responsibilities</p>
      </section>
      <a href="../../Candidate/SignInv1.aspx?PRFCode=${trackToken}&Flag=C&DirectApply=1">Apply for this job</a>
    </main>
  </body>
</html>
`

const buildCurrentDetailHtml = ({ title, reqNo, location, publishDate, trackToken }) => `
<!doctype html>
<html lang="en">
  <head>
    <title>${title}</title>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <div>Job Code: ${reqNo}</div>
      <div>Location: ${location}</div>
      <div>Posted Date: ${publishDate}</div>
      <section>
        <h2>Job Description</h2>
        <p>Key Responsibilities</p>
      </section>
      <a href="../../Candidate/SignInv1.aspx?PRFCode=${trackToken}&Flag=C&DirectApply=1">Apply Now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../auxilo/script.js')
  } catch {
    assert.fail('Expected Auxilo scraper module at ../auxilo/script.js')
  }
}

test('Auxilo pins the verified homepage, careers handoff, Workline board, API payload contract, and detail/apply route patterns', async () => {
  const auxilo = await loadModule()

  assert.equal(auxilo.SOURCE, 'auxilo')
  assert.equal(auxilo.COMPANY, 'Auxilo')
  assert.equal(auxilo.OFFICIAL_BRAND_NAME, 'Auxilo Finserve')
  assert.equal(auxilo.VERIFIED_AT, '2026-07-15')
  assert.equal(auxilo.HOMEPAGE_URL, 'https://www.auxilo.com/')
  assert.equal(auxilo.CAREERS_URL, 'https://www.auxilo.com/careers')
  assert.equal(auxilo.JOBS_BOARD_ENTRY_URL, 'https://app1176.workline.hr/candidate')
  assert.equal(auxilo.JOBS_BOARD_URL, 'https://app1176.workline.hr/Cportal/GeneralOpening.aspx')
  assert.equal(
    auxilo.JOBS_API_URL,
    'https://app1176.workline.hr/CPortal/generalopening.aspx/GetCurrentopening',
  )
  assert.deepEqual(auxilo.JOBS_API_BODY, {
    JDFileName: '',
    OrgCode: '',
    KeyName: '',
  })
  assert.equal(auxilo.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(auxilo.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(auxilo.extractJobsBoardEntryUrl(careersHtml), auxilo.JOBS_BOARD_ENTRY_URL)
  assert.equal(auxilo.hasOfficialJobsBoardSignal(jobsBoardHtml), true)
  assert.equal(auxilo.hasVerifiedJobsPayloadContract(jobsApiPayload), true)
  assert.deepEqual(auxilo.extractListingRecords(jobsApiPayload), listingRecords)
  assert.equal(
    auxilo.buildDetailUrl(listingRecords[0]),
    'https://app1176.workline.hr/CandidatePortal/b48c8d0a-777c-4046-8617-f41f8bfe5004/Territory-Credit-Head---EIL-Job-in-Hyderabad-1325',
  )
  assert.equal(
    auxilo.buildApplyUrl(listingRecords[0]),
    'https://app1176.workline.hr/Candidate/SignInv1.aspx?PRFCode=b48c8d0a-777c-4046-8617-f41f8bfe5004&Flag=C&DirectApply=1',
  )

  const detailHtml = buildDetailHtml({
    title: listingRecords[0].Position_Name,
    reqNo: listingRecords[0].Req_No,
    location: listingRecords[0].LOCATIONNAME,
    publishDate: listingRecords[0].PublishDate,
    trackToken: listingRecords[0].TrackToken,
  })

  assert.equal(auxilo.hasOfficialDetailPageSignal(detailHtml, listingRecords[0]), true)
  assert.equal(auxilo.hasOfficialDetailPageSignal(buildCurrentDetailHtml({
    title: listingRecords[0].Position_Name,
    reqNo: listingRecords[0].Req_No,
    location: listingRecords[0].LOCATIONNAME,
    publishDate: listingRecords[0].PublishDate,
    trackToken: listingRecords[0].TrackToken,
  }), listingRecords[0]), true)
  assert.equal(
    auxilo.extractApplyUrl(detailHtml),
    'https://app1176.workline.hr/Candidate/SignInv1.aspx?PRFCode=b48c8d0a-777c-4046-8617-f41f8bfe5004&Flag=C&DirectApply=1',
  )
  assert.deepEqual(
    auxilo.mapListingRecordToJob(listingRecords[0], {
      scrapedAt: '2026-07-15T09:00:00.000Z',
    }),
    {
      title: 'Territory Credit Head - EIL',
      company: 'Auxilo',
      department: 'Credit - EIL',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      sourceUrl:
        'https://app1176.workline.hr/CandidatePortal/b48c8d0a-777c-4046-8617-f41f8bfe5004/Territory-Credit-Head---EIL-Job-in-Hyderabad-1325',
      applyUrl:
        'https://app1176.workline.hr/Candidate/SignInv1.aspx?PRFCode=b48c8d0a-777c-4046-8617-f41f8bfe5004&Flag=C&DirectApply=1',
      jobId: 'auxilo-2321',
      requisitionId: '2321',
      employmentType: null,
      workplaceType: null,
      experienceRequired: '8 to 16 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      compensation: null,
      postingDate: '2026-07-14',
      closingDate: null,
      jobDescription: [
        'Business: Auxilo',
        'Line of business: Education Institution Loans',
        'Function: Credit - EIL',
        'Location: Hyderabad',
        'Grade: Senior Manager',
        'Open positions: 1',
        'Posted: 14-Jul-2026',
      ].join('\n'),
      source: 'auxilo',
      companyCareerPage: 'https://www.auxilo.com/careers',
      companyDomain: 'auxilo.com',
      atsPlatform: 'workline-public-jobs-api',
      link:
        'https://app1176.workline.hr/Candidate/SignInv1.aspx?PRFCode=b48c8d0a-777c-4046-8617-f41f8bfe5004&Flag=C&DirectApply=1',
      scrapedAt: '2026-07-15T09:00:00.000Z',
    },
  )
})

test('Auxilo run validates the first-party careers handoff, Workline board, public API, and detail apply routes before returning normalized jobs', async () => {
  const auxilo = await loadModule()
  const pageRequests = []
  const jsonRequests = []

  const jobs = await auxilo.createAuxiloScraper({
    now: () => '2026-07-15T10:15:00.000Z',
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === auxilo.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === auxilo.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === auxilo.JOBS_BOARD_ENTRY_URL) {
        return { status: 200, url: auxilo.JOBS_BOARD_URL, html: jobsBoardHtml }
      }

      if (url === auxilo.buildDetailUrl(listingRecords[0])) {
        return {
          status: 200,
          url,
          html: buildDetailHtml({
            title: listingRecords[0].Position_Name,
            reqNo: listingRecords[0].Req_No,
            location: listingRecords[0].LOCATIONNAME,
            publishDate: listingRecords[0].PublishDate,
            trackToken: listingRecords[0].TrackToken,
          }),
        }
      }

      if (url === auxilo.buildDetailUrl(listingRecords[1])) {
        return {
          status: 200,
          url,
          html: buildDetailHtml({
            title: listingRecords[1].Position_Name,
            reqNo: listingRecords[1].Req_No,
            location: listingRecords[1].LOCATIONNAME,
            publishDate: listingRecords[1].PublishDate,
            trackToken: listingRecords[1].TrackToken,
          }),
        }
      }

      throw new Error(`Unexpected Auxilo URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      jsonRequests.push({
        url,
        method: options.method || 'GET',
        body: options.body ?? null,
      })

      if (url === auxilo.JOBS_API_URL) {
        return jobsApiPayload
      }

      throw new Error(`Unexpected Auxilo JSON URL: ${url}`)
    },
  })

  assert.deepEqual(pageRequests, [
    auxilo.HOMEPAGE_URL,
    auxilo.CAREERS_URL,
    auxilo.JOBS_BOARD_ENTRY_URL,
    auxilo.buildDetailUrl(listingRecords[0]),
    auxilo.buildDetailUrl(listingRecords[1]),
  ])
  assert.deepEqual(jsonRequests, [
    {
      url: auxilo.JOBS_API_URL,
      method: 'POST',
      body: JSON.stringify({
        JDFileName: '',
        OrgCode: '',
        KeyName: '',
      }),
    },
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Territory Credit Head - EIL')
  assert.equal(jobs[0].company, 'Auxilo')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-15T10:15:00.000Z')
  assert.equal(jobs[1].title, 'Office 365 Administrator')
  assert.equal(jobs[1].city, 'Mumbai - Corporate Office 1')
  assert.equal(jobs[1].postingDate, '2026-07-13')
})

test('Auxilo fails closed when the homepage, careers handoff, jobs board, API contract, or detail apply route drift', async () => {
  const auxilo = await loadModule()

  await assert.rejects(
    auxilo.createAuxiloScraper().run({
      fetchPage: async (url) => {
        if (url === auxilo.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Unexpected</title></head><body>Placeholder</body></html>' }
        }

        throw new Error(`Unexpected Auxilo URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    auxilo.createAuxiloScraper().run({
      fetchPage: async (url) => {
        if (url === auxilo.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === auxilo.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace(
              'https://app1176.workline.hr/candidate',
              'https://careers.example.com/jobs',
            ),
          }
        }

        throw new Error(`Unexpected Auxilo URL: ${url}`)
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    auxilo.createAuxiloScraper().run({
      fetchPage: async (url) => {
        if (url === auxilo.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === auxilo.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === auxilo.JOBS_BOARD_ENTRY_URL) {
          return { status: 200, url: auxilo.JOBS_BOARD_URL, html: '<html><head><title>Workline</title></head><body>Login</body></html>' }
        }

        throw new Error(`Unexpected Auxilo URL: ${url}`)
      },
    }),
    /verified jobs board/i,
  )

  await assert.rejects(
    auxilo.createAuxiloScraper().run({
      fetchPage: async (url) => {
        if (url === auxilo.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === auxilo.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === auxilo.JOBS_BOARD_ENTRY_URL) {
          return { status: 200, url: auxilo.JOBS_BOARD_URL, html: jobsBoardHtml }
        }

        throw new Error(`Unexpected Auxilo URL: ${url}`)
      },
      fetchJson: async () => ({ d: { obj1: '{}' } }),
    }),
    /verified jobs api/i,
  )

  await assert.rejects(
    auxilo.createAuxiloScraper().run({
      fetchPage: async (url) => {
        if (url === auxilo.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === auxilo.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === auxilo.JOBS_BOARD_ENTRY_URL) {
          return { status: 200, url: auxilo.JOBS_BOARD_URL, html: jobsBoardHtml }
        }

        if (url === auxilo.buildDetailUrl(listingRecords[0])) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Broken detail</title></head><body><h1>Broken detail</h1></body></html>',
          }
        }

        if (url === auxilo.buildDetailUrl(listingRecords[1])) {
          return {
            status: 200,
            url,
            html: buildDetailHtml({
              title: listingRecords[1].Position_Name,
              reqNo: listingRecords[1].Req_No,
              location: listingRecords[1].LOCATIONNAME,
              publishDate: listingRecords[1].PublishDate,
              trackToken: listingRecords[1].TrackToken,
            }),
          }
        }

        throw new Error(`Unexpected Auxilo URL: ${url}`)
      },
      fetchJson: async () => jobsApiPayload,
    }),
    /verified detail page/i,
  )
})
