import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  createTechmaghiScraper,
  extractPublicJobs,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const homepageHtml = `
  <html>
    <head><title>TECHMAGHI</title></head>
    <body>
      <a href="https://techmaghi.com/career-2/">Careers</a>
      <p>Explore the magic in technologies</p>
      <p>info@techmaghi.com</p>
      <p>+91 89212 38815</p>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head><title>Careers - TECHMAGHI</title></head>
    <body>
      <h1>Careers</h1>
      <h5>Join Our Team</h5>
      <p>Choose from our extensive range of available roles!</p>
      <div class="job-list">
        <h3>Job Openings</h3>
        <div class="job-item">
          <img src="https://techmaghi.com/wp-content/uploads/2025/02/Hiring.jpg" alt="Sr.Business Development Associate">
          <div>
            <strong>Business Development Associate</strong>
            <p>Business Development Associate role at Techmaghi</p>
          </div>
          <button class="apply-btn" onclick="showDetails('Business Development Associate', \`Job Description:
As a Business Development Associate (BDA) at Techmaghi, you will play a crucial role in identifying new business opportunities and driving revenue growth.
\`, 'https://forms.gle/bkHQTFv7iXPbefnw6')">Apply</button>
        </div>
        <div class="job-item">
          <img src="https://techmaghi.com/wp-content/uploads/2025/02/Hiring.jpg" alt="Accounts Intern">
          <div>
            <strong>HR Intern</strong>
            <p>Assist in daily accounting and finance operations.</p>
          </div>
          <button class="apply-btn" onclick="showDetails('Accounts Intern', \`Position: HR Intern
Location: Hybrid
Duration: 2 months
Start Date: Immediate
\`, 'https://forms.gle/bkHQTFv7iXPbefnw6')">Apply</button>
        </div>
        <div class="job-item">
          <img src="https://techmaghi.com/wp-content/uploads/2025/02/Hiring.jpg" alt="Marketing Intern">
          <div>
            <strong>Marketing Intern</strong>
            <p>Support digital campaigns and social media promotions.</p>
          </div>
          <button class="apply-btn" onclick="showDetails('Marketing Intern', \`Position: Marketing Intern
Location: Hybrid
Duration: 2 months
Stipend: Performance-based
\`, 'https://forms.gle/bkHQTFv7iXPbefnw6')">Apply</button>
        </div>
        <div class="job-item">
          <img src="https://techmaghi.com/wp-content/uploads/2025/02/Hiring.jpg" alt="Job Closed">
          <div>
            <strong>Accounts Intern</strong>
            <p>Analyze and interpret complex data sets.</p>
          </div>
          <span class="job-closed">Closed</span>
        </div>
      </div>
      <div class="job-details" id="job-details">
        <h3>Job Details</h3>
        <a id="apply-now-btn" class="apply-now-btn" href="#" target="_blank">Apply Now</a>
      </div>
    </body>
  </html>
`

test('verified Techmaghi signals match the official homepage and careers page', () => {
  assert.equal(HOMEPAGE_URL, 'https://techmaghi.com/')
  assert.equal(CAREERS_URL, 'https://techmaghi.com/career-2/')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
})

test('extractPublicJobs returns open jobs and ignores closed listings', () => {
  assert.deepEqual(extractPublicJobs(careersHtml), [
    {
      title: 'Business Development Associate',
      company: 'Techmaghi',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'techmaghi-business-development-associate',
      requisitionId: 'techmaghi-business-development-associate',
      sourceUrl: CAREERS_URL,
      applyUrl: 'https://forms.gle/bkHQTFv7iXPbefnw6',
      employmentType: null,
      workplaceType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      compensation: null,
      postingDate: null,
      closingDate: null,
      jobDescription: 'Job Description: As a Business Development Associate (BDA) at Techmaghi, you will play a crucial role in identifying new business opportunities and driving revenue growth.',
    },
    {
      title: 'HR Intern',
      company: 'Techmaghi',
      department: null,
      location: 'Hybrid, India',
      city: null,
      country: 'India',
      jobId: 'techmaghi-hr-intern',
      requisitionId: 'techmaghi-hr-intern',
      sourceUrl: CAREERS_URL,
      applyUrl: 'https://forms.gle/bkHQTFv7iXPbefnw6',
      employmentType: 'Internship',
      workplaceType: 'Hybrid',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      compensation: null,
      postingDate: null,
      closingDate: null,
      jobDescription: 'Position: HR Intern Location: Hybrid Duration: 2 months Start Date: Immediate',
    },
    {
      title: 'Marketing Intern',
      company: 'Techmaghi',
      department: null,
      location: 'Hybrid, India',
      city: null,
      country: 'India',
      jobId: 'techmaghi-marketing-intern',
      requisitionId: 'techmaghi-marketing-intern',
      sourceUrl: CAREERS_URL,
      applyUrl: 'https://forms.gle/bkHQTFv7iXPbefnw6',
      employmentType: 'Internship',
      workplaceType: 'Hybrid',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      compensation: 'Performance-based',
      postingDate: null,
      closingDate: null,
      jobDescription: 'Position: Marketing Intern Location: Hybrid Duration: 2 months Stipend: Performance-based',
    },
  ])
})

test('run validates the official surfaces and decorates Techmaghi jobs for persistence', async () => {
  const requestedUrls = []
  const jobs = await createTechmaghiScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-13T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    CAREERS_URL,
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'techmaghi')
  assert.equal(jobs[0].companyCareerPage, CAREERS_URL)
  assert.equal(jobs[0].companyDomain, 'techmaghi.com')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-13T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
