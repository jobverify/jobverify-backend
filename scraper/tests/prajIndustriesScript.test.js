import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const officialCareersHtml = `
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <title>Careers - Praj Industries</title>
    <link rel="canonical" href="https://www.praj.net/careers/" />
  </head>
  <body>
    <h2>Careers</h2>
    <p>In case of any assistance required from the Human Capital Team including queries on employment verification, kindly send an email on prajhumancapitalconnect@praj.net</p>
    <a href="https://praj.darwinbox.in/ms/candidate/careers">SEARCH FOR JOB</a>
    <h2>Life At Praj</h2>
  </body>
</html>
`

const listingPayload = {
  status: 'success',
  message: {
    jobscount: 2,
    jobs: [
      {
        id: 'a6a55a83432880',
        title: 'Chief Manager_CNOS',
        created_on: '2026-07-14T03:08:36.000Z',
        officelocation_show_arr: 'Praj Project Site (CNOS), Pune, Maharashtra, India',
        job_posting_on: 1783967400,
        department: 'CNOS',
        emp_type: 'Regular',
        experience_from_num: '10',
        experience_to_num: '15',
        tool_tip_locations: ['Praj Project Site (CNOS), Pune, Maharashtra, India'],
        timezone: 'Asia/Kolkata',
      },
      {
        id: 'praj-us-001',
        title: 'North America Operations Lead',
        created_on: '2026-07-14T07:37:30.000Z',
        officelocation_show_arr: 'Houston, Texas, United States',
        job_posting_on: 1783967400,
        department: 'International Projects',
        emp_type: 'Regular',
        experience_from_num: '10',
        experience_to_num: '15',
        tool_tip_locations: ['Houston, Texas, United States'],
        timezone: 'America/Chicago',
      },
    ],
  },
}

const detailPayload = {
  status: 'success',
  message: {
    job: [
      {
        id: 'a6a55a83432880',
        experience: '10 - 15 Years',
        jd: '<p>Lead CNOS site execution.</p>',
        officelocation_show_arr: 'Praj Project Site (CNOS), Pune, Maharashtra, India',
        posted_on: '14-Jul-2026',
        department: 'CNOS',
        emp_type: 'Regular',
        title: 'Chief Manager_CNOS',
      },
    ],
  },
}

const loadPrajIndustriesModule = async () => {
  try {
    return await import('../prajindustries/script.js')
  } catch {
    assert.fail('Expected Praj Industries scraper module at ../prajindustries/script.js')
  }
}

test('Praj Industries pins the verified first-party careers handoff and Darwinbox routes', async () => {
  const praj = await loadPrajIndustriesModule()

  assert.equal(praj.SOURCE, 'prajindustries')
  assert.equal(praj.COMPANY, 'Praj Industries')
  assert.equal(praj.OFFICIAL_BRAND_NAME, 'Praj Industries')
  assert.equal(praj.VERIFIED_ON, '2026-07-17')
  assert.equal(praj.OFFICIAL_CAREERS_URL, 'https://www.praj.net/careers/')
  assert.equal(praj.DARWINBOX_HANDOFF_URL, 'https://praj.darwinbox.in/ms/candidate/careers')
  assert.equal(praj.DARWINBOX_ORIGIN, 'https://praj.darwinbox.in')
  assert.equal(praj.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(typeof praj.extractOfficialDarwinboxUrl, 'function')
  assert.equal(typeof praj.hasVerifiedCareersPageSignals, 'function')
  assert.equal(typeof praj.buildListingApiUrl, 'function')
  assert.equal(typeof praj.buildJobDetailApiUrl, 'function')
  assert.equal(typeof praj.buildJobDetailUrl, 'function')
  assert.equal(typeof praj.extractListings, 'function')
  assert.equal(typeof praj.extractJobDetail, 'function')
  assert.equal(typeof praj.createPrajIndustriesScraper, 'function')

  assert.equal(
    praj.extractOfficialDarwinboxUrl(officialCareersHtml),
    'https://praj.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(praj.hasVerifiedCareersPageSignals(officialCareersHtml), true)
  assert.equal(praj.hasVerifiedCareersPageSignals('<html><body>No trusted Praj careers content</body></html>'), false)
  assert.equal(praj.buildListingApiUrl(1), 'https://praj.darwinbox.in/ms/candidateapi/job?page=1')
  assert.equal(praj.buildListingApiUrl(2), 'https://praj.darwinbox.in/ms/candidateapi/job?page=2')
  assert.equal(
    praj.buildJobDetailApiUrl('a6a55a83432880'),
    'https://praj.darwinbox.in/ms/candidateapi/job/a6a55a83432880',
  )
  assert.equal(
    praj.buildJobDetailUrl('a6a55a83432880'),
    'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
  )
})

test('Praj Industries maps only India listings from the official public candidate API', async () => {
  const { extractListings } = await loadPrajIndustriesModule()
  const listings = extractListings(listingPayload)

  assert.deepEqual(listings, [
    {
      title: 'Chief Manager_CNOS',
      company: 'Praj Industries',
      department: 'CNOS',
      location: 'Praj Project Site (CNOS), Pune, Maharashtra, India',
      city: 'Pune',
      jobId: 'a6a55a83432880',
      requisitionId: null,
      sourceUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
      applyUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
      employmentType: 'Regular',
      experienceRequired: '10 - 15 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-14',
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('Praj Industries enriches a listing from the official public job detail API', async () => {
  const { extractJobDetail } = await loadPrajIndustriesModule()
  const detail = extractJobDetail(detailPayload, {
    title: 'Chief Manager_CNOS',
    company: 'Praj Industries',
    department: 'CNOS',
    location: 'Praj Project Site (CNOS), Pune, Maharashtra, India',
    city: 'Pune',
    jobId: 'a6a55a83432880',
    requisitionId: null,
    sourceUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
    applyUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
    employmentType: 'Regular',
    experienceRequired: '10 - 15 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-14',
    closingDate: null,
    jobDescription: null,
  })

  assert.deepEqual(detail, {
    title: 'Chief Manager_CNOS',
    company: 'Praj Industries',
    department: 'CNOS',
    location: 'Praj Project Site (CNOS), Pune, Maharashtra, India',
    city: 'Pune',
    jobId: 'a6a55a83432880',
    requisitionId: null,
    sourceUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
    applyUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
    employmentType: 'Regular',
    experienceRequired: '10 - 15 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '14-Jul-2026',
    closingDate: null,
    jobDescription: '<p>Lead CNOS site execution.</p>',
  })
})

test('Praj Industries validates the official careers page before returning India jobs', async () => {
  const {
    OFFICIAL_CAREERS_URL,
    createPrajIndustriesScraper,
  } = await loadPrajIndustriesModule()
  const requests = []
  const jobs = await createPrajIndustriesScraper({
    now: () => FIXED_SCRAPED_AT,
    maxPages: 1,
  }).run({
    fetchText: async (url) => {
      requests.push({ url, type: 'text' })
      if (url === OFFICIAL_CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected text URL ${url}`)
    },
    fetchJson: async (url) => {
      requests.push({ url, type: 'json' })
      if (url === 'https://praj.darwinbox.in/ms/candidateapi/job?page=1') return listingPayload
      if (url === 'https://praj.darwinbox.in/ms/candidateapi/job/a6a55a83432880') return detailPayload
      throw new Error(`Unexpected JSON URL ${url}`)
    },
  })

  assert.deepEqual(requests, [
    {
      url: 'https://www.praj.net/careers/',
      type: 'text',
    },
    {
      url: 'https://praj.darwinbox.in/ms/candidateapi/job?page=1',
      type: 'json',
    },
    {
      url: 'https://praj.darwinbox.in/ms/candidateapi/job/a6a55a83432880',
      type: 'json',
    },
  ])

  assert.deepEqual(jobs, [
    {
      title: 'Chief Manager_CNOS',
      company: 'Praj Industries',
      department: 'CNOS',
      location: 'Praj Project Site (CNOS), Pune, Maharashtra, India',
      city: 'Pune',
      jobId: 'a6a55a83432880',
      requisitionId: null,
      sourceUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
      applyUrl: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
      employmentType: 'Regular',
      experienceRequired: '10 - 15 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '14-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Lead CNOS site execution.</p>',
      source: 'prajindustries',
      link: 'https://praj.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a55a83432880',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Praj Industries falls back to browser-backed Darwinbox API fetches when direct API requests return HTTP 403', async () => {
  const {
    OFFICIAL_CAREERS_URL,
    createPrajIndustriesScraper,
  } = await loadPrajIndustriesModule()
  const requests = []
  const browserRequests = []

  const jobs = await createPrajIndustriesScraper({
    now: () => FIXED_SCRAPED_AT,
    maxPages: 1,
  }).run({
    fetchText: async (url) => {
      requests.push({ url, type: 'text' })
      if (url === OFFICIAL_CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected text URL ${url}`)
    },
    fetchJson: async (url) => {
      requests.push({ url, type: 'json' })
      throw new Error(`HTTP 403 for ${url}`)
    },
    fetchBrowserJson: async (url) => {
      browserRequests.push(url)
      if (url === 'https://praj.darwinbox.in/ms/candidateapi/job?page=1') return listingPayload
      if (url === 'https://praj.darwinbox.in/ms/candidateapi/job/a6a55a83432880') return detailPayload
      throw new Error(`Unexpected browser JSON URL ${url}`)
    },
  })

  assert.deepEqual(requests, [
    {
      url: 'https://www.praj.net/careers/',
      type: 'text',
    },
    {
      url: 'https://praj.darwinbox.in/ms/candidateapi/job?page=1',
      type: 'json',
    },
    {
      url: 'https://praj.darwinbox.in/ms/candidateapi/job/a6a55a83432880',
      type: 'json',
    },
  ])
  assert.deepEqual(browserRequests, [
    'https://praj.darwinbox.in/ms/candidateapi/job?page=1',
    'https://praj.darwinbox.in/ms/candidateapi/job/a6a55a83432880',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, 'a6a55a83432880')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Praj Industries fails closed when the verified official careers handoff drifts', async () => {
  const { createPrajIndustriesScraper } = await loadPrajIndustriesModule()
  const scraper = createPrajIndustriesScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml.replace(
        'https://praj.darwinbox.in/ms/candidate/careers',
        'https://example.com/jobs',
      ),
      fetchJson: async () => listingPayload,
    }),
    /verified careers page/i,
  )
})
