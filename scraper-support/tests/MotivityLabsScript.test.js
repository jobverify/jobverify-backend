import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T18:00:00.000Z'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Join the circle of Motivating Innovators</h1>
    <p>Current Roles Available</p>
    <a href="/job-openings/">View More Button</a>
    <p>Send your CV to careers@motivitylabs.com</p>
  </body>
</html>
`

const listingsPageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <a href="https://motivitylabs.com/jobs/sr-test-engineer/" class="awsm-job-item">
      <h2 class="awsm-job-post-title">Sr.Test Engineer</h2>
      <div class="awsm-job-specification-wrapper">
        <div class="awsm-job-specification-item awsm-job-specification-job-category">
          <span class="awsm-job-specification-term">5+ Years</span>
        </div>
        <div class="awsm-job-specification-item awsm-job-specification-job-location">
          <span class="awsm-job-specification-term">Hyderabad</span>
        </div>
      </div>
      <div class="awsm-job-more-container"><span class="awsm-job-more">More Details</span></div>
    </a>
    <a href="https://motivitylabs.com/jobs/senior-ai-ml-gen-ai-engineer/" class="awsm-job-item">
      <h2 class="awsm-job-post-title">Senior AI/ML &amp; Gen AI Engineer</h2>
      <div class="awsm-job-specification-wrapper">
        <div class="awsm-job-specification-item awsm-job-specification-job-category">
          <span class="awsm-job-specification-term">8+ years</span>
        </div>
        <div class="awsm-job-specification-item awsm-job-specification-job-location">
          <span class="awsm-job-specification-term">Hyderabad</span>
        </div>
      </div>
      <div class="awsm-job-more-container"><span class="awsm-job-more">More Details</span></div>
    </a>
  </body>
</html>
`

const srTestEngineerDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Sr.Test Engineer</h1>
    <p>Job Description:</p>
    <p>Job Title: Sr.Test Engineer</p>
    <p>Experience Level: 5+ years</p>
    <p>Area Role &amp; Responsibilities</p>
    <p>Should be able to work on Devices &amp; Embedded Software's Validation.</p>
    <p>Required Competencies</p>
    <p>Strong Experience in Manual Testing including Testing Types.</p>
    <p>Strong Experience in Automation Testing with Python Scripting.</p>
    <p>Experience with any one operating system would be an added advantage.</p>
    <p>Please share your references to Talent@motivitylabs.com / referrals@motivitylabs.com</p>
    <p>Experience: 5+ Years</p>
    <p>Job Type: Full Time</p>
    <p>Job Location: Hyderabad</p>
    <p>Apply for this position</p>
  </body>
</html>
`

const aiEngineerDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Senior AI/ML &amp; Gen AI Engineer</h1>
    <p>Job Description:</p>
    <p>Job Title: Senior AI/ML &amp; Gen AI Engineer</p>
    <p>Experience Level: 8+ years</p>
    <p>Area Role &amp; Responsibilities</p>
    <p>Build production-ready AI and ML systems.</p>
    <p>Required Competencies</p>
    <p>LLM application design.</p>
    <p>MLOps and cloud deployment.</p>
    <p>Please share your references to Talent@motivitylabs.com / referrals@motivitylabs.com</p>
    <p>Experience: 8+ Years</p>
    <p>Job Type: Full Time</p>
    <p>Job Location: Hyderabad</p>
    <p>Apply for this position</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/motivitylabs/script.js')
  } catch {
    assert.fail('Expected MotivityLabs scraper module at ../../scraper/motivitylabs/script.js')
  }
}

test('MotivityLabs helpers stay pinned to the verified openings list and same-domain detail pages', async () => {
  const motivity = await loadModule()

  assert.equal(motivity.SOURCE, 'motivitylabs')
  assert.equal(motivity.COMPANY, 'MotivityLabs')
  assert.equal(motivity.OFFICIAL_BRAND_NAME, 'Motivity Labs')
  assert.equal(motivity.CAREERS_URL, 'https://motivitylabs.com/careers/')
  assert.equal(motivity.JOB_OPENINGS_URL, 'https://motivitylabs.com/job-openings/')
  assert.equal(motivity.VERIFIED_ON, '2026-08-03')
  assert.equal(motivity.hasOfficialCareersSignal(careersPageHtml), true)
  assert.equal(motivity.hasJobOpeningsSignal(listingsPageHtml), true)
  assert.deepEqual(motivity.extractJobCards(listingsPageHtml), [
    {
      title: 'Sr.Test Engineer',
      experienceRequired: '5+ Years',
      location: 'Hyderabad',
      detailUrl: 'https://motivitylabs.com/jobs/sr-test-engineer/',
    },
    {
      title: 'Senior AI/ML & Gen AI Engineer',
      experienceRequired: '8+ years',
      location: 'Hyderabad',
      detailUrl: 'https://motivitylabs.com/jobs/senior-ai-ml-gen-ai-engineer/',
    },
  ])
  assert.deepEqual(
    motivity.extractJobDetail(srTestEngineerDetailHtml, {
      title: 'Sr.Test Engineer',
      experienceRequired: '5+ Years',
      location: 'Hyderabad',
      detailUrl: 'https://motivitylabs.com/jobs/sr-test-engineer/',
    }, {
      scrapedAt: FIXED_SCRAPED_AT,
    }),
    {
      title: 'Sr.Test Engineer',
      company: 'MotivityLabs',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'sr-test-engineer',
      requisitionId: 'sr-test-engineer',
      sourceUrl: 'https://motivitylabs.com/jobs/sr-test-engineer/',
      applyUrl: 'https://motivitylabs.com/jobs/sr-test-engineer/',
      employmentType: 'Full Time',
      experienceRequired: '5+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Strong Experience in Manual Testing including Testing Types.',
        'Strong Experience in Automation Testing with Python Scripting.',
        'Experience with any one operating system would be an added advantage.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: "Should be able to work on Devices & Embedded Software's Validation.",
      remoteStatus: 'On-site',
      source: 'motivitylabs',
      link: 'https://motivitylabs.com/jobs/sr-test-engineer/',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  )
})

test('MotivityLabs run validates the careers handoff, openings page, and detail pages', async () => {
  const motivity = await loadModule()
  const requestedUrls = []

  const jobs = await motivity.createMotivityLabsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === motivity.CAREERS_URL) return careersPageHtml
      if (url === motivity.JOB_OPENINGS_URL) return listingsPageHtml
      if (url === 'https://motivitylabs.com/jobs/sr-test-engineer/') return srTestEngineerDetailHtml
      if (url === 'https://motivitylabs.com/jobs/senior-ai-ml-gen-ai-engineer/') return aiEngineerDetailHtml

      throw new Error(`Unexpected MotivityLabs URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    motivity.CAREERS_URL,
    motivity.JOB_OPENINGS_URL,
    'https://motivitylabs.com/jobs/sr-test-engineer/',
    'https://motivitylabs.com/jobs/senior-ai-ml-gen-ai-engineer/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Sr.Test Engineer')
  assert.equal(jobs[1].title, 'Senior AI/ML & Gen AI Engineer')
})

test('MotivityLabs fails closed when the verified openings surface drifts', async () => {
  const motivity = await loadModule()

  await assert.rejects(
    motivity.createMotivityLabsScraper().run({
      fetchText: async (url) => {
        if (url === motivity.CAREERS_URL) return careersPageHtml
        if (url === motivity.JOB_OPENINGS_URL) return '<html><body><h1>Jobs</h1></body></html>'
        throw new Error(`Unexpected MotivityLabs URL: ${url}`)
      },
    }),
    /verified Motivity Labs job openings page/i,
  )
})
