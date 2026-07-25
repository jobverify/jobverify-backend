import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
  <html>
    <head><title>Live Bus Tracking, Buy Bus Tickets Online | Chalo App India</title></head>
    <body>
      <a href="/jobs">Jobs</a>
      <p>Track your bus live with the Chalo App.</p>
    </body>
  </html>
`

const jobsHtml = `
  <html>
    <head><title>Jobs at Chalo</title></head>
    <body>
      <div class="jobs--wrap filterable">
        <div class="job-block" data-category="Engineering" data-city="Bengaluru">
          <h4>Software Engineer</h4>
          <h6>Bengaluru</h6>
          <h6>Engineering</h6>
          <p>Build reliable transport products for riders and fleets.</p>
        </div>
        <div class="job-block" data-category="Operations" data-city="Mumbai">
          <h4>City Operations Manager</h4>
          <h6>Mumbai</h6>
          <h6>Operations</h6>
          <p>Own daily service rollouts and city partnerships.</p>
        </div>
      </div>
      <form action="https://chalo.com/web/jobs/upload" method="post"></form>
      <a href="mailto:talent@chalo.com">talent@chalo.com</a>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../chalo/script.js')
  } catch {
    assert.fail('Expected Chalo scraper module at ../scraper/chalo/script.js')
  }
}

test('Chalo verifies the official homepage and jobs page signals', async () => {
  const chalo = await loadModule()

  assert.equal(chalo.SOURCE, 'chalo')
  assert.equal(chalo.COMPANY, 'Chalo')
  assert.equal(chalo.HOMEPAGE_URL, 'https://chalo.com/')
  assert.equal(chalo.JOBS_URL, 'https://chalo.com/jobs')
  assert.equal(chalo.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(chalo.hasOfficialJobsSignal(jobsHtml), true)
})

test('extractPublicListings maps first-party Chalo job cards into the shared job shape', async () => {
  const chalo = await loadModule()
  const jobs = chalo.extractPublicListings(jobsHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Software Engineer',
    company: 'Chalo',
    department: 'Engineering',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    state: null,
    country: 'India',
    jobId: 'chalo-software-engineer-bengaluru',
    requisitionId: 'chalo-software-engineer-bengaluru',
    sourceUrl: 'https://chalo.com/jobs',
    applyUrl: 'https://chalo.com/jobs',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build reliable transport products for riders and fleets.',
  })
})

test('run decorates Chalo jobs with shared runner fields', async () => {
  const chalo = await loadModule()
  const jobs = await chalo.createChaloScraper().run({
    fetchText: async (url) => {
      if (url === chalo.HOMEPAGE_URL) return homepageHtml
      if (url === chalo.JOBS_URL) return jobsHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'chalo')
  assert.equal(jobs[0].link, 'https://chalo.com/jobs')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
