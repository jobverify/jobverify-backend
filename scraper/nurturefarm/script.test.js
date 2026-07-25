import assert from 'node:assert/strict'
import test from 'node:test'

const loadNurtureFarmModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const CAREERS_HTML = `
  <html>
    <head><title>Job openings at Nurture.Farm</title></head>
    <body>
      <main>
        <h1>Job openings at Nurture.Farm</h1>
        <p>6 Open Jobs</p>
        <div>Department</div>
        <div>All Departments Engineering Product Management Retail</div>
        <div>Location</div>
        <div>All Locations Bangalore</div>
        <div>ROLE</div>
        <div>LOCATION</div>
        <div>DEPARTMENT</div>
        <article>
          <h2>Data Analyst</h2>
          <div>Bangalore</div>
          <div>Retail</div>
          <a href="/jobs/data-analyst">View Job</a>
        </article>
        <article>
          <h2>Product Manager</h2>
          <div>Bangalore</div>
          <div>Product Management</div>
          <a href="/jobs/product-manager">View Job</a>
        </article>
        <article>
          <h2>Technical lead-Backend Engineer</h2>
          <div>Bangalore</div>
          <div>Engineering</div>
          <a href="/jobs/technical-lead-backend-engineer">View Job</a>
        </article>
        <section>
          <h2>Join Talent Pool</h2>
          <p>Submit Resume</p>
        </section>
        <footer>powered-by-skillate</footer>
      </main>
    </body>
  </html>
`

test('extractJobListings reads the verified Skillate listing sequence for Nurture.Farm', async () => {
  const nurturefarm = await loadNurtureFarmModule()
  assert.ok(nurturefarm, 'Expected nurturefarm/script.js to exist')

  assert.equal(nurturefarm.hasOfficialCareersSignal(CAREERS_HTML), true)

  const jobs = nurturefarm.extractJobListings(CAREERS_HTML)

  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Data Analyst',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'data-analyst',
    requisitionId: 'data-analyst',
    sourceUrl: 'https://nurture.skillate.com/',
    applyUrl: 'https://nurture.skillate.com/jobs/data-analyst',
    department: 'Retail',
    employmentType: null,
    experienceRequired: null,
    postingDate: null,
    closingDate: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    jobDescription: null,
    remoteStatus: 'On-site',
  })

  assert.deepEqual(jobs[2], {
    title: 'Technical lead-Backend Engineer',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'technical-lead-backend-engineer',
    requisitionId: 'technical-lead-backend-engineer',
    sourceUrl: 'https://nurture.skillate.com/',
    applyUrl: 'https://nurture.skillate.com/jobs/technical-lead-backend-engineer',
    department: 'Engineering',
    employmentType: null,
    experienceRequired: null,
    postingDate: null,
    closingDate: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    jobDescription: null,
    remoteStatus: 'On-site',
  })
})

test('run fetches the Skillate jobs page and decorates the shared runner fields for Nurture.Farm', async () => {
  const nurturefarm = await loadNurtureFarmModule()
  assert.ok(nurturefarm, 'Expected nurturefarm/script.js to exist')

  const requested = []
  const jobs = await nurturefarm.createNurtureFarmScraper().run({
    fetchText: async (url) => {
      requested.push(url)
      return CAREERS_HTML
    },
  })

  assert.deepEqual(requested, ['https://nurture.skillate.com/'])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].company, 'Nurture.Farm')
  assert.equal(jobs[0].source, 'nurturefarm')
  assert.equal(jobs[0].link, 'https://nurture.skillate.com/jobs/data-analyst')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
