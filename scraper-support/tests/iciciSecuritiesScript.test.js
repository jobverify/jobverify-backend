import assert from 'node:assert/strict'
import test from 'node:test'

const loadIciciSecuritiesModule = async () => {
  try {
    return await import('../../scraper/icicisecurities/script.js')
  } catch {
    assert.fail('Expected ICICI Securities scraper module at ../../scraper/icicisecurities/script.js')
  }
}

const careersHtml = `
  <html lang="en">
    <head>
      <title>ICICI Securities Current Openings</title>
    </head>
    <body>
      <h1>Current Openings</h1>
      <script>
        fetch('https://www.icicisecurities.com/get-branches', {
          method: 'POST',
        })
      </script>
    </body>
  </html>
`

const sampleListingsPayload = {
  success: true,
  data: [
    {
      job_title: 'Private Wealth Relationship Manager',
      cw_upload_id: 'ODQ=',
      function: 'Private Wealth Management',
      experience: '17-26 years',
      vacancy_count: '10',
      location: 'Mumbai',
      all_location: 'Delhi, Hyderabad, Bangalore, Pune',
      flag: '1',
      posted_from_date: '06/07/26',
      posted_to_date: '10/08/26',
      key_requirement: 'Wealth Experience and knowledge of investment products',
      job_summary: '<p>Handle HNI client relationships.</p>',
      job_template: '<div><p>Drive wealth sales and portfolio growth.</p></div>',
    },
    {
      job_title: 'Sales Manager',
      cw_upload_id: 'NjQ=',
      function: 'Acquisition',
      experience: '3-8 years',
      vacancy_count: '100',
      location: 'PAN India',
      all_location: '',
      flag: '0',
      posted_from_date: '06/03/26',
      posted_to_date: '29/06/26',
      key_requirement: 'Sales and sourcing background',
      job_summary: '<p>Expired role that should not be returned after July 16, 2026.</p>',
      job_template: '<div><p>Ignore stale postings.</p></div>',
    },
  ],
}

test('ICICI Securities helpers stay pinned to the verified first-party current-openings page and listing API', async () => {
  const iciciSecurities = await loadIciciSecuritiesModule()

  assert.equal(iciciSecurities.SOURCE, 'icicisecurities')
  assert.equal(iciciSecurities.COMPANY, 'ICICI Securities')
  assert.equal(
    iciciSecurities.OFFICIAL_CAREERS_URL,
    'https://www.icicisecurities.com/careers-current-opening',
  )
  assert.equal(iciciSecurities.SEARCH_API_URL, 'https://www.icicisecurities.com/get-branches')
  assert.equal(iciciSecurities.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    iciciSecurities.extractListingApiUrl(careersHtml),
    iciciSecurities.SEARCH_API_URL,
  )
  assert.deepEqual(JSON.parse(iciciSecurities.buildSearchRequestBody()), {
    locations: [],
    experience: [],
    functions: [],
    q: '',
    val: 16,
  })
})

test('extractPublicJobs keeps only active ICICI Securities roles from the verified first-party feed', async () => {
  const iciciSecurities = await loadIciciSecuritiesModule()

  assert.deepEqual(
    iciciSecurities.extractPublicJobs(sampleListingsPayload, { today: '2026-07-16' }),
    [
      {
        title: 'Private Wealth Relationship Manager',
        company: 'ICICI Securities',
        department: 'Private Wealth Management',
        location: 'Mumbai, Delhi, Hyderabad, Bangalore, Pune, India',
        city: 'Mumbai',
        country: 'India',
        jobId: 'ODQ=',
        requisitionId: 'ODQ=',
        sourceUrl: 'https://www.icicisecurities.com/careers-current-opening',
        applyUrl: 'https://www.icicisecurities.com/careers-current-opening',
        employmentType: null,
        experienceRequired: '17-26 years',
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [
          'Wealth Experience and knowledge of investment products',
        ],
        postingDate: '2026-07-06',
        closingDate: '2026-08-10',
        jobDescription: 'Handle HNI client relationships. Drive wealth sales and portfolio growth.',
      },
    ],
  )
})

test('run validates the official current-openings page before reading the first-party listing feed', async () => {
  const iciciSecurities = await loadIciciSecuritiesModule()
  const requested = []

  const jobs = await iciciSecurities.createIciciSecuritiesScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === iciciSecurities.OFFICIAL_CAREERS_URL) return careersHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, method: options.method || 'GET', body: options.body })
      if (url === iciciSecurities.SEARCH_API_URL) return sampleListingsPayload
      throw new Error(`Unexpected json URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requested, [
    { type: 'text', url: iciciSecurities.OFFICIAL_CAREERS_URL },
    {
      type: 'json',
      url: iciciSecurities.SEARCH_API_URL,
      method: 'POST',
      body: iciciSecurities.buildSearchRequestBody(),
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'icicisecurities')
  assert.equal(jobs[0].company, 'ICICI Securities')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('run fails closed when the verified ICICI Securities careers surface changes', async () => {
  const iciciSecurities = await loadIciciSecuritiesModule()

  await assert.rejects(
    iciciSecurities.createIciciSecuritiesScraper().run({
      fetchText: async () => '<html><body><h1>Join us</h1></body></html>',
      fetchJson: async () => sampleListingsPayload,
    }),
    /official current openings page changed/i,
  )
})
