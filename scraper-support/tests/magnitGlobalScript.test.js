import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
  <html>
    <head><title>Careers</title></head>
    <body>
      <h1>Career Opportunities</h1>
      <h2>India</h2>
      <a href="https://jobs.dayforcehcm.com/prounlimited/CANDIDATEPORTAL">Learn More</a>
    </body>
  </html>
`

const dayforceBoardHtml = `
  <html>
    <head><title>Job Board | Dayforce Jobs</title></head>
    <body>
      <script id="__NEXT_DATA__" type="application/json">
        {
          "props": {
            "pageProps": {
              "dehydratedState": {
                "queries": [
                  {
                    "state": {
                      "data": {
                        "clientNamespace": "prounlimited",
                        "jobBoardCode": "candidateportal",
                        "cultureCode": "en-US",
                        "jobBoardId": 1
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      </script>
    </body>
  </html>
`

const searchPayload = {
  totalCount: 2,
  jobPostings: [
    {
      jobPostingId: 7167,
      jobReqId: 2759,
      jobTitle: 'Analyst, Accounts Payable',
      jobDescription: 'Position Summary',
      postingStartTimestampUTC: '2026-07-16T00:00:00+00:00',
      postingLocations: [
        {
          formattedAddress: 'Vadodara, Gujarat, India',
          isoCountryCode: 'IN',
          stateCode: 'GJ',
          cityName: 'Vadodara',
        },
      ],
    },
    {
      jobPostingId: 7170,
      jobReqId: 2738,
      jobTitle: 'Delivery Partner (EST)',
      jobDescription: 'Remote US role',
      postingStartTimestampUTC: '2026-07-15T00:00:00+00:00',
      postingLocations: [
        {
          formattedAddress: 'United States',
          isoCountryCode: 'US',
        },
      ],
    },
  ],
}

test('Magnit Global recognizes the verified careers handoff and normalizes India Dayforce jobs', async () => {
  const magnit = await import('../../scraper/magnitglobal/script.js')

  assert.equal(
    magnit.extractOfficialDayforceUrl(officialCareersHtml),
    'https://jobs.dayforcehcm.com/prounlimited/CANDIDATEPORTAL',
  )
  assert.equal(magnit.hasOfficialMagnitCareersSignals(officialCareersHtml), true)
  assert.deepEqual(magnit.extractDayforceSiteInfoFromBoardHtml(dayforceBoardHtml), {
    clientNamespace: 'prounlimited',
    jobBoardCode: 'candidateportal',
    cultureCode: 'en-US',
    jobBoardId: 1,
  })
  assert.equal(magnit.hasVerifiedDayforceSiteContext(
    magnit.extractDayforceSiteInfoFromBoardHtml(dayforceBoardHtml),
  ), true)
  assert.deepEqual(magnit.buildSearchRequestPayload(0), {
    clientNamespace: 'prounlimited',
    jobBoardCode: 'CANDIDATEPORTAL',
    cultureCode: 'en-US',
    distanceUnit: 0,
    paginationStart: 0,
    location: 'India',
  })
  assert.deepEqual(
    magnit.extractSearchPostings(searchPayload).map((posting) => magnit.normalizeSearchPosting(posting)).filter(Boolean),
    [
      {
        title: 'Analyst, Accounts Payable',
        company: 'Magnit Global',
        department: null,
        location: 'Vadodara, Gujarat, India',
        city: 'Vadodara',
        country: 'India',
        jobId: '7167',
        requisitionId: '2759',
        sourceUrl: 'https://jobs.dayforcehcm.com/prounlimited/CANDIDATEPORTAL/jobs/7167',
        applyUrl: 'https://jobs.dayforcehcm.com/prounlimited/CANDIDATEPORTAL/jobs/7167',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: '2026-07-16T00:00:00+00:00',
        closingDate: null,
        jobDescription: 'Position Summary',
      },
    ],
  )
})

test('Magnit Global scraper returns only India jobs from the Dayforce search payload', async () => {
  const magnit = await import('../../scraper/magnitglobal/script.js')
  const jobs = await magnit.createMagnitGlobalScraper({
    now: () => '2026-08-03T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      if (url === magnit.CAREERS_URL) return officialCareersHtml
      if (url === magnit.OFFICIAL_DAYFORCE_URL) return dayforceBoardHtml
      throw new Error(`Unexpected Magnit URL: ${url}`)
    },
    searchJobPostings: async () => searchPayload,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Analyst, Accounts Payable')
  assert.equal(jobs[0].source, 'magnitglobal')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('Magnit Global uses the default Dayforce session bootstrap when overrides are absent', async () => {
  const magnit = await import('../../scraper/magnitglobal/script.js')
  const requested = []

  const jobs = await magnit.createMagnitGlobalScraper().run({
    fetchText: async (url) => {
      if (url === magnit.CAREERS_URL) return officialCareersHtml
      if (url === magnit.OFFICIAL_DAYFORCE_URL) return dayforceBoardHtml
      throw new Error(`Unexpected Magnit URL: ${url}`)
    },
    createDayforceSessionImpl: async () => ({
      csrfToken: 'csrf-token',
      cookieHeader: 'cookie-a=1; cookie-b=2',
    }),
    fetchJson: async (url, options = {}) => {
      requested.push({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || null,
      })

      if (url === magnit.buildSearchApiUrl()) return searchPayload

      throw new Error(`Unexpected Magnit JSON URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(requested, [
    {
      url: magnit.buildSearchApiUrl(),
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
        Cookie: 'cookie-a=1; cookie-b=2',
        'X-CSRF-Token': 'csrf-token',
        Referer: magnit.OFFICIAL_DAYFORCE_URL,
        Origin: magnit.DAYFORCE_ORIGIN,
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(magnit.buildSearchRequestPayload(0)),
    },
  ])
})

test('fails closed when the Magnit Dayforce board site context no longer matches the pinned board', async () => {
  const magnit = await import('../../scraper/magnitglobal/script.js')

  await assert.rejects(
    magnit.createMagnitGlobalScraper().run({
      fetchText: async (url) => {
        if (url === magnit.CAREERS_URL) return officialCareersHtml
        if (url === magnit.OFFICIAL_DAYFORCE_URL) return '<html><head><title>Job Board | Dayforce Jobs</title></head><body></body></html>'
        throw new Error(`Unexpected Magnit URL: ${url}`)
      },
      searchJobPostings: async () => searchPayload,
    }),
    /Magnit verified Dayforce public jobs surface no longer matches the pinned site context/i,
  )
})
