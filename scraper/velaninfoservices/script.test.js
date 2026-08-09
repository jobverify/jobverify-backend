import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMPANY,
  JOBS_URL,
  OVERVIEW_URL,
  SOURCE,
  createVelanInfoServicesScraper,
  extractJobs,
  hasOfficialCareersSignal,
  hasOfficialJobsSignal,
} from './script.js'

const careersHtml = `
  <html>
    <head><title>Velan | Jobs | Career Opportunities | IT &amp; BPO Jobs</title></head>
    <body>
      <h1>Career Opportunities</h1>
      <a class="joinus" href="https://www.velaninfo.com/jobs">Current Openings</a>
      <h2>Build Your Dream Career with Velan</h2>
    </body>
  </html>
`

const jobsHtml = `
  <html>
    <head><title>Velan | Current Openings | IT &amp; BPO Job Opportunites at Velan</title></head>
    <body>
      <h1>Join Our Team</h1>
      <h2>Current Openings</h2>
      <p>If you would like to work with us, send your resume to careers@velaninfo.com</p>
      <div class="job-opening-list">
        <h3>Senior Accountant (JOB ID: 072026-62029) - <span>3 <span>Positions</span></span></h3>
        <ul>
          <li>Yardi/Buildium/AppFolio, US Accounting</li>
          <li>|</li>
          <li><b>Experience:</b> 7+ Years</li>
          <li>|</li>
          <li><b>Location:</b> Coimbatore</li>
        </ul>
        <p class="cpst">Posted on: 16-07-2026</p>
        <a href="https://www.velaninfo.com/jobs/senior-accountant-072026-62029"><button>Apply Now</button></a>
      </div>
      <div class="job-opening-list">
        <h3>Process Executive (JOB ID: 072026-62030) - <span>4 <span>Positions</span></span></h3>
        <ul>
          <li>Data processing and quality checks</li>
          <li>|</li>
          <li><b>Experience:</b> 1+ Years</li>
          <li>|</li>
          <li><b>Location:</b> Coimbatore</li>
        </ul>
        <p class="cpst">Posted on: 16-07-2026</p>
        <a href="https://www.velaninfo.com/jobs/process-executive-072026-62030"><button>Apply Now</button></a>
      </div>
    </body>
  </html>
`

test('Velan verifies the careers handoff and extracts jobs from the live current-openings board', () => {
  assert.equal(SOURCE, 'velaninfoservices')
  assert.equal(COMPANY, 'Velan Info Services')
  assert.equal(OVERVIEW_URL, 'https://www.velaninfo.com/careers/')
  assert.equal(JOBS_URL, 'https://www.velaninfo.com/jobs')
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
  assert.equal(hasOfficialJobsSignal(jobsHtml), true)
  assert.deepEqual(extractJobs(jobsHtml), [
    {
      title: 'Senior Accountant',
      company: 'Velan Info Services',
      department: null,
      location: 'Coimbatore, India',
      city: 'Coimbatore',
      country: 'India',
      jobId: '072026-62029',
      requisitionId: '072026-62029',
      sourceUrl: 'https://www.velaninfo.com/jobs',
      applyUrl: 'https://www.velaninfo.com/jobs/senior-accountant-072026-62029',
      employmentType: 'Full-time',
      experienceRequired: '7+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16-07-2026',
      closingDate: null,
      jobDescription: 'Yardi/Buildium/AppFolio, US Accounting',
    },
    {
      title: 'Process Executive',
      company: 'Velan Info Services',
      department: null,
      location: 'Coimbatore, India',
      city: 'Coimbatore',
      country: 'India',
      jobId: '072026-62030',
      requisitionId: '072026-62030',
      sourceUrl: 'https://www.velaninfo.com/jobs',
      applyUrl: 'https://www.velaninfo.com/jobs/process-executive-072026-62030',
      employmentType: 'Full-time',
      experienceRequired: '1+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16-07-2026',
      closingDate: null,
      jobDescription: 'Data processing and quality checks',
    },
  ])
})

test('Velan runner follows the first-party careers page to the live jobs board', async () => {
  const requestedUrls = []
  const jobs = await createVelanInfoServicesScraper({
    now: () => '2026-08-06T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === OVERVIEW_URL) return careersHtml
      if (url === JOBS_URL) return jobsHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [OVERVIEW_URL, JOBS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, SOURCE)
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-08-06T00:00:00.000Z')
})
