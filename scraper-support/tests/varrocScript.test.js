import assert from 'node:assert/strict'
import test from 'node:test'

const loadVarrocModule = async () => {
  try {
    return await import('../../scraper/varroc/script.js')
  } catch {
    assert.fail('Expected Varroc scraper module at ../../scraper/varroc/script.js')
  }
}

const OFFICIAL_CAREERS_HTML = `
  <html>
    <head>
      <title>Varroc Careers | Varroc Engineering Jobs | Varroc Vacancy</title>
    </head>
    <body>
      <main>
        <h1>Work @ Varroc</h1>
        <a href="https://varroc.sensehq.com/careers" target="_blank">Join us</a>
      </main>
    </body>
  </html>
`

const LISTING_PAGE_1_HTML = String.raw`<!DOCTYPE html><html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"jobsData":{"rows":[{"id":65024,"created_on":1780484415340,"job_status":"OPEN","department":"Varroc Engineering Limited - Business I - Corporate - Corporate - HR & ER - Human Resources","title":"Head HR- Plant","location":"Chakan, Pune","open_positions":1,"experience_end":12,"experience_start":8,"description_external":"<p><strong>Skills :</strong> Employee Relations, Plant HR, Labor Compliance</p><p>Lead plant HR operations.</p>","job_type":"FULLTIME","code":"10367320260511","office":{"city":"Pune","country":"India","location":"VEL-VI","name":"5000_5000","state":"Maharashtra","pin_code":"440012"}},{"id":65025,"created_on":1780485415340,"job_status":"CLOSED","department":"Varroc Engineering Limited - Business I - Operations","title":"Closed Role","location":"Bangkok","open_positions":1,"experience_end":5,"experience_start":2,"description_external":"<p>Closed posting.</p>","job_type":"FULLTIME","code":"CLS-1","office":{"city":"Bangkok","country":"Thailand","location":"Thailand","name":"TH-1","state":"Bangkok","pin_code":"10100"}}],"count":3}}},"page":"/jobs","query":{},"buildId":"varroc-build","assetPrefix":"/careers","isFallback":false,"gssp":true,"customServer":true}</script></body></html>`

const LISTING_PAGE_2_HTML = String.raw`<!DOCTYPE html><html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"jobsData":{"rows":[{"id":64357,"created_on":1779257067290,"job_status":"OPEN","department":"Varroc Engineering Limited - Business I - Operations - Region 2 - Production & Operations - Operations","title":"Head Production - Plant","location":"Chakan, Pune","open_positions":1,"experience_end":15,"experience_start":10,"description_external":"<div><b>Skills :</b> SMT, IPC-A-610, Manufacturing Engineering</div><div>Lead SMT production and operations.</div>","job_type":"FULLTIME","code":"5005831620260520","office":{"city":"Pune","country":"India","location":"VEL-III","name":"2200_2200","state":"Maharashtra","pin_code":"440012"}}],"count":3}}},"page":"/jobs","query":{"page":"2"},"buildId":"varroc-build","assetPrefix":"/careers","isFallback":false,"gssp":true,"customServer":true}</script></body></html>`

test('Varroc helpers verify the official careers handoff and keep SenseHQ URLs stable', async () => {
  const {
    API_BASE_URL,
    CAREER_PAGE_URL,
    buildJobUrl,
    buildListingUrl,
    extractSenseHqCareersUrl,
    hasOfficialCareersPageSignal,
  } = await loadVarrocModule()

  assert.equal(CAREER_PAGE_URL, 'https://www.varroc.com/careers')
  assert.equal(API_BASE_URL, 'https://varroc.sensehq.com/careers')
  assert.equal(hasOfficialCareersPageSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(extractSenseHqCareersUrl(OFFICIAL_CAREERS_HTML), API_BASE_URL)
  assert.equal(buildListingUrl(), 'https://varroc.sensehq.com/careers/jobs')
  assert.equal(buildListingUrl({ page: 2 }), 'https://varroc.sensehq.com/careers/jobs?page=2')
  assert.equal(buildJobUrl(65024), 'https://varroc.sensehq.com/careers/jobs/65024')
})

test('extractSearchResults keeps only open India jobs from the Varroc SenseHQ listings pages', async () => {
  const { extractPaginationSummary, extractSearchResults } = await loadVarrocModule()
  const jobs = extractSearchResults(LISTING_PAGE_1_HTML)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Head HR- Plant',
    company: 'Varroc',
    department: 'Varroc Engineering Limited - Business I - Corporate - Corporate - HR & ER - Human Resources',
    location: 'Chakan, Pune, India',
    city: 'Chakan',
    jobId: '65024',
    requisitionId: '10367320260511',
    sourceUrl: 'https://varroc.sensehq.com/careers/jobs/65024',
    applyUrl: 'https://varroc.sensehq.com/careers/jobs/65024',
    employmentType: 'Full-time',
    experienceRequired: '8-12 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Employee Relations',
      'Plant HR',
      'Labor Compliance',
    ],
    postingDate: '2026-06-03',
    closingDate: null,
    jobDescription: 'Skills : Employee Relations, Plant HR, Labor Compliance Lead plant HR operations.',
  })

  assert.deepEqual(extractPaginationSummary(LISTING_PAGE_1_HTML), {
    currentPage: 1,
    pageSize: 2,
    totalCount: 3,
    totalPages: 2,
    hasNext: true,
  })
})

test('run verifies the official Varroc handoff, paginates the SenseHQ board, and decorates shared runner fields', async () => {
  const {
    CAREER_PAGE_URL,
    buildListingUrl,
    createVarrocScraper,
  } = await loadVarrocModule()
  const requests = []
  const scraper = createVarrocScraper({ maxPages: 2, maxJobs: 2 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === CAREER_PAGE_URL) return OFFICIAL_CAREERS_HTML
      if (url === buildListingUrl({ page: 1 })) return LISTING_PAGE_1_HTML
      if (url === buildListingUrl({ page: 2 })) return LISTING_PAGE_2_HTML

      throw new Error(`Unexpected Varroc URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    CAREER_PAGE_URL,
    buildListingUrl({ page: 1 }),
    buildListingUrl({ page: 2 }),
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'varroc')
  assert.equal(jobs[0].company, 'Varroc')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[1].title, 'Head Production - Plant')
  assert.deepEqual(jobs[1].requiredSkills, [
    'SMT',
    'IPC-A-610',
    'Manufacturing Engineering',
  ])
  assert.ok(jobs.every((job) => typeof job.scrapedAt === 'string' && job.scrapedAt.length > 0))
})

test('run falls back to the verified SenseHQ board when the official Varroc page times out from Node', async () => {
  const {
    CAREER_PAGE_URL,
    buildListingUrl,
    createVarrocScraper,
  } = await loadVarrocModule()
  const requests = []
  const scraper = createVarrocScraper({ maxPages: 1, maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === CAREER_PAGE_URL) {
        const error = new TypeError('fetch failed')
        error.cause = { code: 'UND_ERR_CONNECT_TIMEOUT' }
        throw error
      }

      if (url === buildListingUrl({ page: 1 })) return LISTING_PAGE_1_HTML

      throw new Error(`Unexpected Varroc URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    CAREER_PAGE_URL,
    buildListingUrl({ page: 1 }),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, '65024')
})
