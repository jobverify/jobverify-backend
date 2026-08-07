import assert from 'node:assert/strict'
import test from 'node:test'

const loadGoogleModule = async () => {
  try {
    return await import('../../scraper/google/script.js')
  } catch {
    assert.fail('Expected Google scraper module at ../../scraper/google/script.js')
  }
}

const PAGE_ONE_URL = 'https://www.google.com/about/careers/applications/jobs/results?location=India'
const PAGE_TWO_URL = 'https://www.google.com/about/careers/applications/jobs/results?location=India&page=2'
const FIRST_JOB_URL = 'https://www.google.com/about/careers/applications/jobs/results/123456789012345678-software-engineer?location=India'
const SECOND_JOB_URL = 'https://www.google.com/about/careers/applications/jobs/results/234567890123456789-data-engineer?location=India'
const FIRST_CANONICAL_URL = FIRST_JOB_URL.replace('?location=India', '')
const SECOND_CANONICAL_URL = SECOND_JOB_URL.replace('?location=India', '')

const detailHtml = (title, years) => `
  <html>
    <body>
      <h2>About the job</h2>
      <div>${title} builds core systems for India hiring.</div>
      <h3>Minimum qualifications</h3>
      <ul>
        <li>${years} years of software development experience</li>
        <li>Experience with distributed systems</li>
      </ul>
      <h3>Preferred qualifications</h3>
      <ul>
        <li>Experience building public cloud services</li>
      </ul>
    </body>
  </html>
`

test('Google scraper paginates with next links and enriches canonical detail URLs without a second browser page', async () => {
  const google = await loadGoogleModule()
  const pageData = {
    [PAGE_ONE_URL]: {
      jobs: [
        {
          title: 'Software Engineer',
          company: 'Google',
          location: 'Bengaluru, Karnataka, India',
          link: FIRST_JOB_URL,
        },
      ],
      nextUrl: PAGE_TWO_URL,
    },
    [PAGE_TWO_URL]: {
      jobs: [
        {
          title: 'Software Engineer',
          company: 'Google',
          location: 'Bengaluru, Karnataka, India',
          link: FIRST_JOB_URL,
        },
        {
          title: 'Data Engineer',
          company: 'Google',
          location: 'Hyderabad, Telangana, India',
          link: SECOND_JOB_URL,
        },
      ],
      nextUrl: null,
    },
  }
  const requestedDetails = []
  let browserClosed = false
  let currentUrl = PAGE_ONE_URL

  const fakeBrowser = {
    close: async () => {
      browserClosed = true
    },
  }
  const fakePage = {
    async goto(url) {
      currentUrl = url
    },
    async waitForSelector() {},
    async $$eval() {
      return pageData[currentUrl].jobs
    },
    async evaluate() {
      return pageData[currentUrl].nextUrl
    },
  }

  const jobs = await google.createGoogleScraper().run({
    launchBrowserImpl: async () => fakeBrowser,
    createOptimizedPageImpl: async () => fakePage,
    fetchText: async (url) => {
      requestedDetails.push(url)
      if (url === FIRST_CANONICAL_URL) {
        return detailHtml('Software Engineer', 5)
      }
      if (url === SECOND_CANONICAL_URL) {
        return detailHtml('Data Engineer', 4)
      }
      throw new Error(`Unexpected Google detail URL: ${url}`)
    },
    now: () => '2026-08-01T12:34:56.000Z',
  })

  assert.deepEqual(requestedDetails, [
    FIRST_CANONICAL_URL,
    SECOND_CANONICAL_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({ title: job.title, city: job.city, jobId: job.jobId, sourceUrl: job.sourceUrl })),
    [
      {
        title: 'Software Engineer',
        city: 'Bengaluru',
        jobId: '123456789012345678',
        sourceUrl: FIRST_CANONICAL_URL,
      },
      {
        title: 'Data Engineer',
        city: 'Hyderabad',
        jobId: '234567890123456789',
        sourceUrl: SECOND_CANONICAL_URL,
      },
    ],
  )
  assert.match(jobs[0].jobDescription, /Software Engineer builds core systems/i)
  assert.match(jobs[0].experienceRequired, /5 years/i)
  assert.equal(jobs[0].scrapedAt, '2026-08-01T12:34:56.000Z')
  assert.equal(browserClosed, true)
})
