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

const searchPayload = {
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
    fetchText: async () => officialCareersHtml,
    searchJobPostings: async () => searchPayload,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Analyst, Accounts Payable')
  assert.equal(jobs[0].source, 'magnitglobal')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('fails closed when Magnit Global has no demonstrated session-free Dayforce HTTP client', async () => {
  const magnit = await import('../../scraper/magnitglobal/script.js')

  await assert.rejects(
    magnit.createMagnitGlobalScraper().run({
      fetchText: async () => officialCareersHtml,
    }),
    /Magnit Global API-only migration incomplete: no session-free Dayforce search contract has been demonstrated/i,
  )
})
