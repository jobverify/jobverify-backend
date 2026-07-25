import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Micron India</title>
  </head>
  <body>
    <main>
      <h1>Great place to work in India</h1>
      <p>At Micron Hyderabad and Bengaluru, we advance the transformation of information into intelligence.</p>
      <a href="https://careers.micron.com/careers?domain=micron.com&pid=25253497&sort_by=relevance">Search current jobs</a>
      <a href="https://careers.micron.com/careers?domain=micron.com&pid=25253497&sort_by=relevance">Find your next career</a>
    </main>
  </body>
</html>
`

const SEARCH_PAYLOAD = {
  status: 200,
  error: {
    message: '',
    body: '',
  },
  data: {
    positions: [
      {
        id: 42296091,
        displayJobId: 'JR102906',
        name: 'Principal Engineer- HIG HBM Layout',
        locations: ['Hyderabad, Telangana, India'],
        standardizedLocations: ['Hyderabad, TS, IN'],
        postedTs: 1780963200,
        department: 'HIG',
        positionUrl: '/careers/job/42296091',
      },
      {
        id: 42296092,
        displayJobId: 'JR102999',
        name: 'US Role',
        locations: ['Boise, Idaho, United States'],
        standardizedLocations: ['Boise, ID, US'],
        postedTs: 1780963200,
        department: 'Operations',
        positionUrl: '/careers/job/42296092',
      },
    ],
    count: 2,
  },
}

const DETAIL_PAYLOADS = new Map([
  [
    42296091,
    {
      status: 200,
      data: {
        publicUrl: 'https://careers.micron.com/careers/job/42296091',
        jobDescription: '<p>Drive HBM physical design execution from Hyderabad.</p>',
      },
    },
  ],
  [
    42296092,
    {
      status: 200,
      data: {
        publicUrl: 'https://careers.micron.com/careers/job/42296092',
        jobDescription: '<p>Ignore this non-India role.</p>',
      },
    },
  ],
])

const loadModule = async () => {
  try {
    return await import('../microntechnologyindia/script.js')
  } catch {
    assert.fail('Expected Micron Technology India scraper module at ../microntechnologyindia/script.js')
  }
}

test('Micron Technology India scraper constants stay pinned to the verified first-party careers page and public Eightfold routes from Thursday, July 16, 2026', async () => {
  const micron = await loadModule()

  assert.equal(micron.SOURCE, 'microntechnologyindia')
  assert.equal(micron.COMPANY, 'Micron Technology India')
  assert.equal(micron.OFFICIAL_BRAND_NAME, 'Micron Technology')
  assert.equal(micron.VERIFIED_ON, '2026-07-16')
  assert.equal(micron.HOMEPAGE_URL, 'https://in.micron.com/')
  assert.equal(micron.OFFICIAL_CAREERS_URL, 'https://in.micron.com/about/careers')
  assert.equal(
    micron.PUBLIC_BOARD_URL,
    'https://careers.micron.com/careers?domain=micron.com&pid=25253497&sort_by=relevance',
  )
  assert.equal(micron.LISTING_API_URL, 'https://careers.micron.com/api/pcsx/search')
  assert.equal(
    micron.buildListingApiUrl(),
    'https://careers.micron.com/api/pcsx/search?domain=micron.com&query=&location=India&start=0&limit=10',
  )
  assert.equal(
    micron.buildListingApiUrl({ start: 10, limit: 5 }),
    'https://careers.micron.com/api/pcsx/search?domain=micron.com&query=&location=India&start=10&limit=5',
  )
  assert.equal(
    micron.buildDetailApiUrl(42296091),
    'https://careers.micron.com/api/pcsx/position_details?position_id=42296091&domain=micron.com&hl=en',
  )
  assert.match(micron.VERIFIED_SURFACE_SUMMARY, /Search current jobs/i)
  assert.match(micron.VERIFIED_SURFACE_SUMMARY, /Principal Engineer- HIG HBM Layout/i)
  assert.equal(micron.hasOfficialMicronIndiaCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(micron.hasOfficialMicronIndiaCareersSignal('<html><body>unexpected</body></html>'), false)
  assert.equal(micron.isIndiaLocation('Hyderabad, Telangana, India'), true)
  assert.equal(micron.isIndiaLocation('Boise, Idaho, United States'), false)
})

test('Micron Technology India run verifies the official careers page and maps public India Eightfold jobs into Jobify jobs', async () => {
  const micron = await loadModule()
  const requestedUrls = []
  const scraper = micron.createMicronTechnologyIndiaScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === micron.OFFICIAL_CAREERS_URL) {
        return OFFICIAL_CAREERS_HTML
      }

      throw new Error(`Unexpected Micron Technology India text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (url === micron.buildListingApiUrl()) {
        return SEARCH_PAYLOAD
      }

      const detailMatch = url.match(/position_id=(\d+)/)
      if (detailMatch) {
        return DETAIL_PAYLOADS.get(Number(detailMatch[1]))
      }

      throw new Error(`Unexpected Micron Technology India JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    micron.OFFICIAL_CAREERS_URL,
    micron.buildListingApiUrl(),
    micron.buildDetailApiUrl(42296091),
    micron.buildDetailApiUrl(42296092),
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Principal Engineer- HIG HBM Layout',
      company: 'Micron Technology India',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      link: 'https://careers.micron.com/careers/job/42296091',
      applyUrl: 'https://careers.micron.com/careers/job/42296091',
      sourceUrl: 'https://careers.micron.com/careers/job/42296091',
      source: 'microntechnologyindia',
      jobId: 42296091,
      requisitionId: 'JR102906',
      department: 'HIG',
      employmentType: null,
      experienceRequired: null,
      postingDate: 1780963200,
      jobDescription: '<p>Drive HBM physical design execution from Hyderabad.</p>',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      remoteStatus: 'On-site',
      scrapedAt: jobs[0].scrapedAt,
    },
  ])
})

test('Micron Technology India fails closed when the verified official careers page no longer matches the public jobs handoff', async () => {
  const micron = await loadModule()

  await assert.rejects(
    micron.createMicronTechnologyIndiaScraper().run({
      fetchText: async () => '<html><body>No verified handoff here</body></html>',
      fetchJson: async () => SEARCH_PAYLOAD,
    }),
    /verified Micron India careers page/i,
  )
})
