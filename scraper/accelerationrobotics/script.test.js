import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const careersHtml = `
  <main>
    <article class="job-card">
      <a href="/jobs/123e4567-e89b-12d3-a456-426614174000">
        <h3>Robotics Software Engineer - Outdoor Autonomy</h3>
        <span class="category">Software</span>
        <span class="location">Pune</span>
        <span class="work-mode">Onsite</span>
        <span class="employment-type">Full Time</span>
        <span class="experience">5+ yrs</span>
        <time datetime="2026-05-25">Posted 2026-05-25</time>
      </a>
    </article>
  </main>
`

const detailHtml = `
  <main>
    <h1>Robotics Software Engineer - Outdoor Autonomy</h1>
    <div class="job-meta">
      <span>Software</span><span>Pune</span><span>Onsite</span>
      <span>Full Time</span><span>5+ years</span>
      <span>Posted 2026-05-25</span>
    </div>
    <section><h2>About the Role</h2><p>Build reliable autonomy for outdoor robots.</p></section>
    <section><h2>Requirements &amp; Qualifications</h2><ul><li>Strong robotics software experience.</li></ul></section>
    <a href="/jobs/123e4567-e89b-12d3-a456-426614174000/apply">Apply Now</a>
  </main>
`

test('extractJobListings maps official Acceleration Robotics career cards', async () => {
  const accelerationRobotics = await loadModule()
  assert.ok(accelerationRobotics)
  const { CAREERS_URL, extractJobListings } = accelerationRobotics

  assert.equal(CAREERS_URL, 'https://recruit.accelerationrobotics.in/')

  assert.deepEqual(extractJobListings(careersHtml), [{
    title: 'Robotics Software Engineer - Outdoor Autonomy',
    location: 'Pune',
    city: 'Pune',
    country: 'India',
    jobId: '123e4567-e89b-12d3-a456-426614174000',
    requisitionId: '123e4567-e89b-12d3-a456-426614174000',
    sourceUrl: 'https://recruit.accelerationrobotics.in/jobs/123e4567-e89b-12d3-a456-426614174000',
    applyUrl: null,
    department: 'Software',
    employmentType: 'Full-time',
    experienceRequired: '5+ years',
    postingDate: '2026-05-25',
  }])
})

test('run enriches official Acceleration Robotics listings from their detail pages', async () => {
  const accelerationRobotics = await loadModule()
  assert.ok(accelerationRobotics)
  const { CAREERS_URL, createAccelerationRoboticsScraper } = accelerationRobotics

  const requestedUrls = []
  const scraper = createAccelerationRoboticsScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_URL) return careersHtml
      if (url.endsWith('/123e4567-e89b-12d3-a456-426614174000')) return detailHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_URL,
    'https://recruit.accelerationrobotics.in/jobs/123e4567-e89b-12d3-a456-426614174000',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Acceleration Robotics')
  assert.equal(jobs[0].jobDescription, 'Build reliable autonomy for outdoor robots.')
  assert.equal(jobs[0].applyUrl, 'https://recruit.accelerationrobotics.in/jobs/123e4567-e89b-12d3-a456-426614174000/apply')
  assert.equal(jobs[0].source, 'accelerationrobotics')
})
