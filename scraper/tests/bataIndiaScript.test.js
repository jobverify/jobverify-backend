import assert from 'node:assert/strict'
import test from 'node:test'

const loadBataIndiaModule = async () => {
  try {
    return await import('../bataindia/script.js')
  } catch {
    assert.fail('Expected Bata India scraper module at ../bataindia/script.js')
  }
}

const OFFICIAL_HOMEPAGE_HTML = `
  <html>
    <head>
      <title>Bata India Official</title>
    </head>
    <body>
      <footer>
        <a href="https://bata.sensehq.com/careers">Careers</a>
      </footer>
    </body>
  </html>
`

const ROOT_LISTING_HTML = String.raw`<!DOCTYPE html><html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"organization":{"name":"Bata"},"jobsData":{"rows":[{"id":530,"created_on":1780484415340,"job_status":"OPEN","department":"Corporate","title":"Assistant Manager - B2B Ops","location":"Kolkata","experience_end":8,"experience_start":5,"description_external":"<p><strong>Skills :</strong> B2B Sales, Channel Operations</p><p>Lead B2B operations.</p>","job_type":"FULLTIME","code":"COR00517","office":{"city":"Kolkata","country":"India","location":"Kolkata","name":"Head Office"}},{"id":499,"created_on":1780398015340,"job_status":"OPEN","department":"Finance","title":"Group Manager - SCM Finance","location":"Gurugram, Haryana","experience_end":12,"experience_start":8,"description_external":"<div><b>Skills :</b> Supply Chain Finance, SAP</div><div>Own finance planning.</div>","job_type":"FULLTIME","code":"FIN00486","office":{"city":"Gurugram","country":"India","location":"Gurugram","name":"Corporate Office"}}],"count":3}}},"page":"/careers","query":{},"buildId":"bata-build","isFallback":false,"gssp":true}</script></body></html>`

const IFRAME_LISTING_HTML = String.raw`<!DOCTYPE html><html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"jobsData":{"rows":[{"id":272,"created_on":1779257067290,"job_status":"OPEN","department":"Franchise","title":"Franchisee Business Development Manager","location":"Hyderabad","experience_end":10,"experience_start":6,"description_external":"<div><b>Skills :</b> Franchise Sales, Expansion Planning</div><div>Drive franchise business growth.</div>","job_type":"FULLTIME","code":"FRA00265","office":{"city":"Hyderabad","country":"India","location":"Hyderabad","name":"Retail West"}},{"id":530,"created_on":1780484415340,"job_status":"OPEN","department":"Corporate","title":"Assistant Manager - B2B Ops","location":"Kolkata","experience_end":8,"experience_start":5,"description_external":"<p><strong>Skills :</strong> B2B Sales, Channel Operations</p><p>Lead B2B operations.</p>","job_type":"FULLTIME","code":"COR00517","office":{"city":"Kolkata","country":"India","location":"Kolkata","name":"Head Office"}}],"count":3}}},"page":"/iframe/jobs","query":{"page":"1","isIframe":"true"},"buildId":"bata-build","isFallback":false,"gssp":true}</script></body></html>`

test('Bata India helpers keep the official homepage handoff and canonical SenseHQ URLs stable', async () => {
  const {
    CAREERS_BOARD_URL,
    HOMEPAGE_URL,
    IFRAME_LISTINGS_URL,
    buildIframeListingUrl,
    buildJobUrl,
    extractSenseHqCareersUrl,
    hasOfficialCareersPageSignal,
  } = await loadBataIndiaModule()

  assert.equal(HOMEPAGE_URL, 'https://www.bata.in/')
  assert.equal(CAREERS_BOARD_URL, 'https://bata.sensehq.com/careers')
  assert.equal(IFRAME_LISTINGS_URL, 'https://bata.sensehq.com/careers/iframe/jobs?page=1&isIframe=true')
  assert.equal(hasOfficialCareersPageSignal(OFFICIAL_HOMEPAGE_HTML), true)
  assert.equal(extractSenseHqCareersUrl(OFFICIAL_HOMEPAGE_HTML), CAREERS_BOARD_URL)
  assert.equal(buildIframeListingUrl(), IFRAME_LISTINGS_URL)
  assert.equal(
    buildIframeListingUrl({ page: 2 }),
    'https://bata.sensehq.com/careers/iframe/jobs?page=2&isIframe=true',
  )
  assert.equal(buildJobUrl(530), 'https://bata.sensehq.com/careers/jobs/530')
})

test('extractSearchResults keeps open India jobs and normalizes the Bata India root board payload', async () => {
  const { extractBoardSummary, extractSearchResults } = await loadBataIndiaModule()
  const jobs = extractSearchResults(ROOT_LISTING_HTML)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Assistant Manager - B2B Ops',
    company: 'Bata India',
    department: 'Corporate',
    location: 'Kolkata, India',
    city: 'Kolkata',
    jobId: '530',
    requisitionId: 'COR00517',
    sourceUrl: 'https://bata.sensehq.com/careers/jobs/530',
    applyUrl: 'https://bata.sensehq.com/careers/jobs/530',
    employmentType: 'Full-time',
    experienceRequired: '5-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'B2B Sales',
      'Channel Operations',
    ],
    postingDate: '2026-06-03',
    closingDate: null,
    jobDescription: 'Skills : B2B Sales, Channel Operations Lead B2B operations.',
  })

  assert.deepEqual(extractBoardSummary(ROOT_LISTING_HTML), {
    currentPage: 1,
    pageSize: 2,
    totalCount: 3,
    totalPages: 2,
    hasNext: true,
  })
})

test('run verifies the official Bata India handoff, merges root and iframe listings, and deduplicates repeated jobs', async () => {
  const {
    CAREERS_BOARD_URL,
    HOMEPAGE_URL,
    buildIframeListingUrl,
    createBataIndiaScraper,
  } = await loadBataIndiaModule()
  const requests = []
  const scraper = createBataIndiaScraper({ maxJobs: 3 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === HOMEPAGE_URL) return OFFICIAL_HOMEPAGE_HTML
      if (url === CAREERS_BOARD_URL) return ROOT_LISTING_HTML
      if (url === buildIframeListingUrl({ page: 1 })) return IFRAME_LISTING_HTML

      throw new Error(`Unexpected Bata India URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    HOMEPAGE_URL,
    CAREERS_BOARD_URL,
    buildIframeListingUrl({ page: 1 }),
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'bataindia')
  assert.equal(jobs[0].company, 'Bata India')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[2].title, 'Franchisee Business Development Manager')
  assert.deepEqual(jobs[2].requiredSkills, [
    'Franchise Sales',
    'Expansion Planning',
  ])
  assert.ok(jobs.every((job) => typeof job.scrapedAt === 'string' && job.scrapedAt.length > 0))
})

test('run falls back to the verified SenseHQ board when the official Bata India homepage times out from Node', async () => {
  const {
    CAREERS_BOARD_URL,
    HOMEPAGE_URL,
    buildIframeListingUrl,
    createBataIndiaScraper,
  } = await loadBataIndiaModule()
  const requests = []
  const scraper = createBataIndiaScraper({ maxJobs: 3 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === HOMEPAGE_URL) {
        const error = new TypeError('fetch failed')
        error.cause = { code: 'UND_ERR_CONNECT_TIMEOUT' }
        throw error
      }

      if (url === CAREERS_BOARD_URL) return ROOT_LISTING_HTML
      if (url === buildIframeListingUrl({ page: 1 })) return IFRAME_LISTING_HTML

      throw new Error(`Unexpected Bata India URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    HOMEPAGE_URL,
    CAREERS_BOARD_URL,
    buildIframeListingUrl({ page: 1 }),
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[2].jobId, '272')
})
