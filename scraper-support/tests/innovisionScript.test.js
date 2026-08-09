import assert from 'node:assert/strict'
import test from 'node:test'

const careersPage = {
  status: 200,
  url: 'https://www.innovision.co.in/careers/',
  html: `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Innovision Security | Innovision Limited</title>
  </head>
  <body>
    <h1>Build Your Future</h1>
    <h2>Careers at Innovision</h2>
    <h3>Current Openings</h3>
    <div class="opening-card">
      <h4>Security Supervisor</h4>
      <p>Mumbai, Delhi, Bangalore</p>
      <p>Full-time</p>
      <p>Operations</p>
      <button type="button">Apply Now</button>
    </div>
    <div class="opening-card">
      <h4>Facility Manager</h4>
      <p>Pan India</p>
      <p>Full-time</p>
      <p>Facility Management</p>
      <button type="button">Apply Now</button>
    </div>
    <div class="opening-card">
      <h4>HR Operations Executive</h4>
      <p>Gurgaon</p>
      <p>Full-time</p>
      <p>Human Resources</p>
      <button type="button">Apply Now</button>
    </div>
    <div class="opening-card">
      <h4>Toll Operations Manager</h4>
      <p>Multiple Locations</p>
      <p>Full-time</p>
      <p>Toll Management</p>
      <button type="button">Apply Now</button>
    </div>
    <div class="opening-card">
      <h4>Training &amp; Development Officer</h4>
      <p>Delhi NCR</p>
      <p>Full-time</p>
      <p>Training</p>
      <button type="button">Apply Now</button>
    </div>
    <p>Don't see a suitable position? Send us your resume at <a href="mailto:careers@innovision.co.in">careers@innovision.co.in</a></p>
  </body>
</html>
`,
}

const loadInnovisionModule = async () => {
  try {
    return await import('../../scraper/innovision/script.js')
  } catch {
    assert.fail('Expected Innovision scraper module at ../../scraper/innovision/script.js')
  }
}

test('Innovision verifies the first-party inline openings surface and shared application email', async () => {
  const innovision = await loadInnovisionModule()

  assert.equal(innovision.CAREERS_PAGE_URL, 'https://www.innovision.co.in/careers/')
  assert.equal(innovision.APPLICATION_URL, 'mailto:careers@innovision.co.in')
  assert.equal(innovision.hasOfficialCareersSignal(careersPage), true)
  assert.equal(innovision.extractApplyEmail(careersPage.html), innovision.APPLICATION_URL)
})

test('Innovision extracts the visible first-party openings and maps them to the shared email apply surface', async () => {
  const innovision = await loadInnovisionModule()

  const jobs = innovision.extractOpenings(careersPage.html)

  assert.deepEqual(jobs, [
    {
      title: 'Facility Manager',
      company: 'Innovision',
      department: 'Facility Management',
      location: 'Pan India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'facility-manager',
      requisitionId: 'facility-manager',
      sourceUrl: 'https://www.innovision.co.in/careers/',
      applyUrl: 'mailto:careers@innovision.co.in',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'HR Operations Executive',
      company: 'Innovision',
      department: 'Human Resources',
      location: 'Gurgaon, India',
      city: 'Gurgaon',
      state: null,
      country: 'India',
      jobId: 'hr-operations-executive',
      requisitionId: 'hr-operations-executive',
      sourceUrl: 'https://www.innovision.co.in/careers/',
      applyUrl: 'mailto:careers@innovision.co.in',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Security Supervisor',
      company: 'Innovision',
      department: 'Operations',
      location: 'Mumbai, Delhi, Bangalore, India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'security-supervisor',
      requisitionId: 'security-supervisor',
      sourceUrl: 'https://www.innovision.co.in/careers/',
      applyUrl: 'mailto:careers@innovision.co.in',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Toll Operations Manager',
      company: 'Innovision',
      department: 'Toll Management',
      location: 'Multiple Locations, India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'toll-operations-manager',
      requisitionId: 'toll-operations-manager',
      sourceUrl: 'https://www.innovision.co.in/careers/',
      applyUrl: 'mailto:careers@innovision.co.in',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Training & Development Officer',
      company: 'Innovision',
      department: 'Training',
      location: 'Delhi NCR, India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'training-and-development-officer',
      requisitionId: 'training-and-development-officer',
      sourceUrl: 'https://www.innovision.co.in/careers/',
      applyUrl: 'mailto:careers@innovision.co.in',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('Innovision run verifies the trusted careers page before returning the visible openings', async () => {
  const innovision = await loadInnovisionModule()
  const requested = []

  const jobs = await innovision.createInnovisionScraper().run({
    fetchPage: async (url) => {
      requested.push(url)
      if (url === innovision.CAREERS_PAGE_URL) return careersPage
      throw new Error(`Unexpected Innovision page URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requested, [innovision.CAREERS_PAGE_URL])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'innovision')
  assert.equal(jobs[0].link, 'mailto:careers@innovision.co.in')
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('Innovision fails closed when the verified careers page drifts materially', async () => {
  const innovision = await loadInnovisionModule()

  await assert.rejects(
    innovision.createInnovisionScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: innovision.CAREERS_PAGE_URL,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified Innovision careers page/i,
  )
})
