import assert from 'node:assert/strict'
import test from 'node:test'

const SOURCE = 'sandboxaq'
const COMPANY = 'SandboxAQ'
const CAREERS_PAGE_URL = 'https://www.sandboxaq.com/careers'
const CAREERS_LIST_URL = 'https://www.sandboxaq.com/careers-list'
const ASHBY_PUBLIC_BOARD_URL = 'https://jobs.ashbyhq.com/sandboxaq'
const ASHBY_JOB_BOARD_URL = 'https://api.ashbyhq.com/posting-api/job-board/sandboxaq'

const loadSandboxAQModule = async () => import('./script.js')

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | SandboxAQ</title>
  </head>
  <body>
    <main>
      <h1>Careers at Sandbox<span>AQ</span></h1>
      <p>
        Embark on Your Next Great Adventure at SandboxAQ.
        Discover full-time roles and our <a href="https://www.sandboxaq.com/company/residencies">Residency Program</a>.
      </p>
      <a href="/careers-list" class="border-button">View Job Openings</a>
    </main>
  </body>
</html>
`

const CAREERS_LIST_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers List | SandboxAQ</title>
  </head>
  <body>
    <main>
      <h1>Sign up for email updates</h1>
      <p>Get updates on how SandboxAQ can power your organization.</p>
      <footer>© 2026 SandboxAQ</footer>
    </main>
  </body>
</html>
`

const ASHBY_PUBLIC_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>SandboxAQ Jobs</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
  </body>
</html>
`

const ASHBY_PAYLOAD = {
  jobs: [
    {
      id: 'job_1',
      isListed: true,
      title: 'Staff Machine Learning Engineer',
      department: 'Engineering',
      location: 'Remote, United States',
      workplaceType: 'Remote',
      isRemote: true,
      employmentType: 'FullTime',
      jobUrl: 'https://jobs.ashbyhq.com/sandboxaq/job_1',
      applyUrl: 'https://jobs.ashbyhq.com/sandboxaq/job_1/apply',
      publishedAt: '2026-07-30T00:00:00.000Z',
      descriptionPlain: 'Requires 8+ years of machine learning experience.',
      address: {
        postalAddress: {
          addressLocality: 'Remote',
          addressRegion: null,
          addressCountry: 'United States',
        },
      },
    },
    {
      id: 'job_2',
      isListed: false,
      title: 'Hidden Role',
      location: 'Remote',
      jobUrl: 'https://jobs.ashbyhq.com/sandboxaq/job_2',
      applyUrl: 'https://jobs.ashbyhq.com/sandboxaq/job_2/apply',
    },
  ],
}

test('SandboxAQ validates the current official careers and Ashby route chain', async () => {
  const sandboxaq = await loadSandboxAQModule()

  assert.equal(sandboxaq.SOURCE, SOURCE)
  assert.equal(sandboxaq.COMPANY, COMPANY)
  assert.equal(sandboxaq.CAREERS_PAGE_URL, CAREERS_PAGE_URL)
  assert.equal(sandboxaq.CAREERS_LIST_URL, CAREERS_LIST_URL)
  assert.equal(sandboxaq.ASHBY_PUBLIC_BOARD_URL, ASHBY_PUBLIC_BOARD_URL)
  assert.equal(sandboxaq.ASHBY_JOB_BOARD_URL, ASHBY_JOB_BOARD_URL)
  assert.equal(sandboxaq.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.equal(sandboxaq.extractVerifiedCareersListUrl(CAREERS_HTML), CAREERS_LIST_URL)
  assert.equal(sandboxaq.hasVerifiedCareersListShellSignal(CAREERS_LIST_HTML), true)
  assert.equal(sandboxaq.hasVerifiedAshbyPublicBoardShellSignal(ASHBY_PUBLIC_BOARD_HTML), true)
  assert.equal(sandboxaq.buildAshbyJobBoardUrl(ASHBY_PUBLIC_BOARD_URL), ASHBY_JOB_BOARD_URL)
})

test('SandboxAQ extracts listed Ashby jobs and normalizes the output', async () => {
  const sandboxaq = await loadSandboxAQModule()
  const jobs = sandboxaq.extractAshbyJobs(ASHBY_PAYLOAD)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Staff Machine Learning Engineer',
    company: COMPANY,
    department: 'Engineering',
    location: 'Remote, United States',
    city: 'Remote',
    state: null,
    country: 'United States',
    jobId: 'job_1',
    requisitionId: 'job_1',
    sourceUrl: 'https://jobs.ashbyhq.com/sandboxaq/job_1',
    applyUrl: 'https://jobs.ashbyhq.com/sandboxaq/job_1/apply',
    employmentType: 'Full Time',
    experienceRequired: '8+ years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-30T00:00:00.000Z',
    closingDate: null,
    jobDescription: 'Requires 8+ years of machine learning experience.',
    remoteStatus: 'Remote',
  })
})

test('SandboxAQ run() validates the route chain and returns Ashby jobs', async () => {
  const sandboxaq = await loadSandboxAQModule()
  const requestedText = []
  const requestedJson = []

  const jobs = await sandboxaq.createSandboxAQScraper({
    now: () => '2026-08-04T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedText.push(url)
      if (url === CAREERS_PAGE_URL) return CAREERS_HTML
      if (url === CAREERS_LIST_URL) return CAREERS_LIST_HTML
      if (url === ASHBY_PUBLIC_BOARD_URL) return ASHBY_PUBLIC_BOARD_HTML
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === ASHBY_JOB_BOARD_URL) return ASHBY_PAYLOAD
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedText, [
    CAREERS_PAGE_URL,
    CAREERS_LIST_URL,
    ASHBY_PUBLIC_BOARD_URL,
  ])
  assert.deepEqual(requestedJson, [ASHBY_JOB_BOARD_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, SOURCE)
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-08-04T00:00:00.000Z')
})
