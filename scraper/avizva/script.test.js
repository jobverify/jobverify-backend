import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  createAvizvaScraper,
  extractJobs,
  hasOfficialCareersSignal,
} from './script.js'

const currentCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Avizva Careers | Explore Exciting Opportunities</title>
  </head>
  <body>
    <main>
      <h1>We Aim, Learn, and Grow Each Day with Passion and Purpose</h1>
      <label>Select Role</label>
      <label>Select Location</label>

      <div class="job-box">
        <p>DevOps Engineering</p>
        <p>5 - 8 Years</p>
        <h3>Senior Engineer</h3>
        <h4>Locations</h4>
        <ul>
          <li>Gurugram - India</li>
          <li>Indore - India</li>
        </ul>
        <a href="https://avizva.keka.com/careers/jobdetails/154027">Apply Now</a>
      </div>

      <div class="job-box">
        <p>Design</p>
        <p>3 - 5 Years</p>
        <h3>Visual Product Design</h3>
        <h4>Locations</h4>
        <ul>
          <li>Gurugram - India</li>
          <li>Indore - India</li>
        </ul>
        <a href="https://avizva.keka.com/careers/jobdetails/153673">Apply Now</a>
      </div>

      <div class="job-box">
        <p>Backend Technologies</p>
        <p>5 - 8 Years</p>
        <h3>Senior Python Engineer</h3>
        <h4>Locations</h4>
        <ul>
          <li>Gurugram - India</li>
          <li>Indore - India</li>
        </ul>
        <a href="https://avizva.keka.com/careers/jobdetails/152565">Apply Now</a>
      </div>

      <div class="job-box">
        <p>Backend Technologies</p>
        <p>3 - 5 Years</p>
        <h3>Python Engineer</h3>
        <h4>Locations</h4>
        <ul>
          <li>Gurugram - India</li>
          <li>Indore - India</li>
        </ul>
        <a href="https://avizva.keka.com/careers/jobdetails/152543">Apply Now</a>
      </div>
    </main>
  </body>
</html>
`

test('AVIZVA recognizes the current first-party careers contract', () => {
  assert.equal(hasOfficialCareersSignal(currentCareersHtml), true)
})

test('AVIZVA extracts the current Keka-backed job boxes', () => {
  const jobs = extractJobs(currentCareersHtml)

  assert.equal(jobs.length, 4)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Senior Engineer',
      'Visual Product Design',
      'Senior Python Engineer',
      'Python Engineer',
    ],
  )
  assert.deepEqual(jobs[0].locations, ['Gurugram, India', 'Indore, India'])
})

test('AVIZVA scraper returns jobs from the verified first-party careers page', async () => {
  const requestedUrls = []

  const jobs = await createAvizvaScraper({
    now: () => '2026-08-04T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_URL) return currentCareersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].company, 'AVIZVA')
  assert.equal(jobs[0].country, 'India')
  const seniorEngineerJob = jobs.find((job) => job.title === 'Senior Engineer')
  assert.ok(seniorEngineerJob)
  assert.equal(seniorEngineerJob.applyUrl, 'https://avizva.keka.com/careers/jobdetails/154027')
})
