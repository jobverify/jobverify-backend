import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-03T00:15:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Lexmark U.S. Careers</title>
  </head>
  <body>
    <main>
      <h1>Lexmark Careers</h1>
      <a href="https://lexmark.wd1.myworkdayjobs.com/Lexmark">Apply Now</a>
      <p>Lexmark Careers Overview</p>
      <p>Explore Job Listings</p>
    </main>
  </body>
</html>
`

const workdayBoardHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title></title>
    <meta property="og:title" content="Lexmark Careers" />
    <script>
      window.workday = {
        tenant: "lexmark",
        siteId: "Lexmark",
        clientOrigin: "https://www.myworkday.com"
      };
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const jobsApiPayload = {
  total: 2,
  jobPostings: [
    {
      title: 'Software Engineer',
      externalPath: '/job/Bengaluru--India/Software-Engineer_R1234',
      timeType: 'Full time',
      locationsText: 'Bengaluru  India',
      postedOn: 'Posted Today',
      bulletFields: ['Regular', 'R1234'],
    },
    {
      title: 'Logistic Specialist',
      externalPath: '/job/Shenzhen--China/Logistic-Specialist_R5733',
      timeType: 'Full time',
      locationsText: 'Shenzhen  China',
      postedOn: 'Posted Yesterday',
      bulletFields: ['Independent Contractor', 'R5733'],
    },
  ],
  facets: [],
  userAuthenticated: false,
}

const indiaDetailPayload = {
  jobPostingInfo: {
    id: 'india-id',
    title: 'Software Engineer',
    jobDescription: '<p>Build backend services for enterprise print workflows.</p>',
    location: 'Bengaluru  India',
    startDate: '2026-08-02',
    timeType: 'Full time',
    jobReqId: 'R1234',
    jobPostingId: 'Software-Engineer_R1234',
    country: {
      descriptor: 'India',
      alpha2Code: 'IN',
    },
    jobRequisitionLocation: {
      descriptor: 'Bengaluru  India',
      country: {
        descriptor: 'India',
        alpha2Code: 'IN',
      },
    },
    externalUrl: 'https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Bengaluru--India/Software-Engineer_R1234',
    endDate: '2026-09-01',
    canApply: true,
  },
}

const chinaDetailPayload = {
  jobPostingInfo: {
    id: 'china-id',
    title: 'Logistic Specialist',
    jobDescription: '<p>Coordinate outbound shipments.</p>',
    location: 'Shenzhen  China',
    startDate: '2026-08-01',
    timeType: 'Full time',
    jobReqId: 'R5733',
    jobPostingId: 'Logistic-Specialist_R5733',
    country: {
      descriptor: 'China',
      alpha2Code: 'CN',
    },
    jobRequisitionLocation: {
      descriptor: 'Shenzhen  China',
      country: {
        descriptor: 'China',
        alpha2Code: 'CN',
      },
    },
    externalUrl: 'https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Shenzhen--China/Logistic-Specialist_R5733',
    endDate: '2026-08-31',
    canApply: true,
  },
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/lexmarkinternational/script.js')
  } catch {
    assert.fail('Expected Lexmark International scraper module at ../../scraper/lexmarkinternational/script.js')
  }
}

test('Lexmark International scraper pins the verified careers handoff and Workday Candidate Experience API helpers', async () => {
  const lexmark = await loadScriptModule()

  assert.equal(lexmark.SOURCE, 'lexmarkinternational')
  assert.equal(lexmark.COMPANY, 'Lexmark International')
  assert.equal(lexmark.OFFICIAL_BRAND_NAME, 'Lexmark')
  assert.equal(lexmark.VERIFIED_ON, '2026-08-03')
  assert.equal(
    lexmark.CAREERS_URL,
    'https://www.lexmark.com/en_us/about-us/careers.html',
  )
  assert.equal(
    lexmark.WORKDAY_BASE_URL,
    'https://lexmark.wd1.myworkdayjobs.com/Lexmark',
  )
  assert.equal(
    lexmark.WORKDAY_JOBS_API_URL,
    'https://lexmark.wd1.myworkdayjobs.com/wday/cxs/lexmark/Lexmark/jobs',
  )
  assert.deepEqual(JSON.parse(lexmark.buildJobsRequestBody({ offset: 20 })), {
    appliedFacets: {},
    limit: 20,
    offset: 20,
    searchText: '',
  })
  assert.equal(
    lexmark.buildJobDetailApiUrl('/job/Bengaluru--India/Software-Engineer_R1234'),
    'https://lexmark.wd1.myworkdayjobs.com/wday/cxs/lexmark/Lexmark/job/Bengaluru--India/Software-Engineer_R1234',
  )
  assert.equal(
    lexmark.buildPublicJobUrl('/job/Bengaluru--India/Software-Engineer_R1234'),
    'https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Bengaluru--India/Software-Engineer_R1234',
  )
  assert.equal(lexmark.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    lexmark.extractVerifiedWorkdayHandoffUrl(careersHtml),
    'https://lexmark.wd1.myworkdayjobs.com/Lexmark',
  )
  assert.equal(lexmark.hasWorkdayBoardBootstrapSignal(workdayBoardHtml), true)
  assert.equal(lexmark.isWorkdayJobsApiPayload(jobsApiPayload), true)
  assert.equal(lexmark.hasWorkdayJobDetailSignal(indiaDetailPayload), true)
  assert.equal(lexmark.isIndiaJobDetail(indiaDetailPayload), true)
  assert.equal(lexmark.isIndiaJobDetail(chinaDetailPayload), false)
  assert.deepEqual(lexmark.mapIndiaJob(indiaDetailPayload, jobsApiPayload.jobPostings[0]), {
    title: 'Software Engineer',
    company: 'Lexmark International',
    department: null,
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'Software-Engineer_R1234',
    requisitionId: 'R1234',
    sourceUrl: 'https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Bengaluru--India/Software-Engineer_R1234',
    applyUrl: 'https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Bengaluru--India/Software-Engineer_R1234',
    employmentType: 'Full-Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-08-02',
    closingDate: '2026-09-01',
    jobDescription: 'Build backend services for enterprise print workflows.',
  })
})

test('Lexmark International run returns only India jobs from the Workday Candidate Experience API and detail JSON', async () => {
  const lexmark = await loadScriptModule()
  const requestedTextUrls = []
  const requestedJsonCalls = []

  const jobs = await lexmark.createLexmarkInternationalScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === lexmark.CAREERS_URL) return careersHtml
      if (url === lexmark.WORKDAY_BASE_URL) return workdayBoardHtml
      throw new Error(`Unexpected Lexmark International text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requestedJsonCalls.push([url, options.method || 'GET', options.body || null])
      if (url === lexmark.WORKDAY_JOBS_API_URL) return jobsApiPayload
      if (url === lexmark.buildJobDetailApiUrl('/job/Bengaluru--India/Software-Engineer_R1234')) {
        return indiaDetailPayload
      }
      if (url === lexmark.buildJobDetailApiUrl('/job/Shenzhen--China/Logistic-Specialist_R5733')) {
        return chinaDetailPayload
      }
      throw new Error(`Unexpected Lexmark International JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [
    lexmark.CAREERS_URL,
    lexmark.WORKDAY_BASE_URL,
  ])
  assert.deepEqual(requestedJsonCalls, [
    [lexmark.WORKDAY_JOBS_API_URL, 'POST', lexmark.buildJobsRequestBody()],
    [
      lexmark.buildJobDetailApiUrl('/job/Bengaluru--India/Software-Engineer_R1234'),
      'GET',
      null,
    ],
    [
      lexmark.buildJobDetailApiUrl('/job/Shenzhen--China/Logistic-Specialist_R5733'),
      'GET',
      null,
    ],
  ])
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      jobId: job.jobId,
      sourceUrl: job.sourceUrl,
      postingDate: job.postingDate,
      closingDate: job.closingDate,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Software Engineer',
        location: 'Bengaluru, India',
        jobId: 'Software-Engineer_R1234',
        sourceUrl: 'https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Bengaluru--India/Software-Engineer_R1234',
        postingDate: '2026-08-02',
        closingDate: '2026-09-01',
        source: 'lexmarkinternational',
        link: 'https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Bengaluru--India/Software-Engineer_R1234',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('Lexmark International returns an authoritative empty India result when the public board has no India jobs', async () => {
  const lexmark = await loadScriptModule()

  const jobs = await lexmark.createLexmarkInternationalScraper().run({
    fetchText: async (url) => {
      if (url === lexmark.CAREERS_URL) return careersHtml
      if (url === lexmark.WORKDAY_BASE_URL) return workdayBoardHtml
      throw new Error(`Unexpected Lexmark International text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      if (url === lexmark.WORKDAY_JOBS_API_URL) {
        return {
          ...jobsApiPayload,
          total: 1,
          jobPostings: [jobsApiPayload.jobPostings[1]],
        }
      }
      if (url === lexmark.buildJobDetailApiUrl('/job/Shenzhen--China/Logistic-Specialist_R5733')) {
        return chinaDetailPayload
      }
      throw new Error(`Unexpected Lexmark International JSON URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Lexmark International fails closed when the careers page, Workday shell, jobs API, or detail payload drift', async () => {
  const lexmark = await loadScriptModule()

  await assert.rejects(
    lexmark.createLexmarkInternationalScraper().run({
      fetchText: async (url) => {
        if (url === lexmark.CAREERS_URL) {
          return '<html><head><title>Unexpected</title></head><body>No Apply Now</body></html>'
        }
        throw new Error(`Unexpected Lexmark International text URL: ${url}`)
      },
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    lexmark.createLexmarkInternationalScraper().run({
      fetchText: async (url) => {
        if (url === lexmark.CAREERS_URL) return careersHtml
        if (url === lexmark.WORKDAY_BASE_URL) {
          return '<html><head><title>Placeholder</title></head><body><div id="root"></div></body></html>'
        }
        throw new Error(`Unexpected Lexmark International text URL: ${url}`)
      },
    }),
    /Candidate Experience shell no longer matches/i,
  )

  await assert.rejects(
    lexmark.createLexmarkInternationalScraper().run({
      fetchText: async (url) => {
        if (url === lexmark.CAREERS_URL) return careersHtml
        if (url === lexmark.WORKDAY_BASE_URL) return workdayBoardHtml
        throw new Error(`Unexpected Lexmark International text URL: ${url}`)
      },
      fetchJson: async (url, options = {}) => {
        if (url === lexmark.WORKDAY_JOBS_API_URL) return { total: '1' }
        throw new Error(`Unexpected Lexmark International JSON URL: ${url}`)
      },
    }),
    /jobs API no longer matches/i,
  )

  await assert.rejects(
    lexmark.createLexmarkInternationalScraper().run({
      fetchText: async (url) => {
        if (url === lexmark.CAREERS_URL) return careersHtml
        if (url === lexmark.WORKDAY_BASE_URL) return workdayBoardHtml
        throw new Error(`Unexpected Lexmark International text URL: ${url}`)
      },
      fetchJson: async (url, options = {}) => {
        if (url === lexmark.WORKDAY_JOBS_API_URL) {
          return {
            ...jobsApiPayload,
            total: 1,
            jobPostings: [jobsApiPayload.jobPostings[0]],
          }
        }
        if (url === lexmark.buildJobDetailApiUrl('/job/Bengaluru--India/Software-Engineer_R1234')) {
          return { jobPostingInfo: { title: 'Software Engineer' } }
        }
        throw new Error(`Unexpected Lexmark International JSON URL: ${url}`)
      },
    }),
    /job detail payload no longer matches/i,
  )
})
