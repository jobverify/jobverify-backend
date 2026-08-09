import assert from 'node:assert/strict'
import test from 'node:test'

import {
  APPLICATION_EMAIL,
  CAREERS_PAGE_URL,
  COMPANY_HOME_URL,
  createAlohaTechnologyScraper,
  extractCareerJobs,
  pageIndicatesAlohaTechnologyCareers,
} from './script.js'

const careersHtml = `
  <html>
    <body>
      <section>
        <h1>Careers at Aloha Technology</h1>
        <p>
          Join Aloha and contribute to building enterprise-grade software solutions.
          If you would like to work with us, please send your resume at
          <a href="mailto:hr@alohatechnology.com">hr@alohatechnology.com</a>.
          Our team will get back to you.
        </p>
        <h2>JOIN OUR TEAM</h2>
        <h2>Open Roles</h2>
        <p>Explore Current Opportunities</p>

        <div class="opening">
          <div>QA Automation Engineer</div>
          <div>Experience: 3-5 yrs.</div>
          <div>Profile</div>
          <ul>
            <li>Strong experience in QA automation using Selenium, Cypress, Playwright, or similar automation frameworks.</li>
            <li>Good knowledge of API testing, SQL, and test case design.</li>
            <li>Hands-on experience with CI/CD tools, Git, Jira, and Agile methodologies.</li>
          </ul>
        </div>

        <div class="opening">
          <div>Senior AI/ML Engineer</div>
          <div>Experience: 5-7 yrs.</div>
          <div>Profile</div>
          <ul>
            <li>Strong experience in Machine Learning and Deep Learning using Python.</li>
            <li>Hands-on expertise in Generative AI, LLMs, and RAG pipelines.</li>
            <li>Good knowledge of MLOps, Docker, Kubernetes, REST APIs, Git, and cloud platforms.</li>
          </ul>
        </div>
      </section>
    </body>
  </html>
`

test('extractCareerJobs parses the public Aloha Technology openings from the official careers page shape', () => {
  assert.equal(COMPANY_HOME_URL, 'https://www.alohatechnology.com/')
  assert.equal(CAREERS_PAGE_URL, 'https://www.alohatechnology.com/careers.html')
  assert.equal(APPLICATION_EMAIL, 'hr@alohatechnology.com')
  assert.equal(pageIndicatesAlohaTechnologyCareers(careersHtml), true)

  assert.deepEqual(extractCareerJobs(careersHtml), [
    {
      title: 'QA Automation Engineer',
      company: 'Aloha Technology',
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: 'alohatechnology-qa-automation-engineer',
      requisitionId: 'alohatechnology-qa-automation-engineer',
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: 'mailto:hr@alohatechnology.com',
      employmentType: null,
      experienceRequired: '3-5 yrs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Strong experience in QA automation using Selenium, Cypress, Playwright, or similar automation frameworks.',
        'Good knowledge of API testing, SQL, and test case design.',
        'Hands-on experience with CI/CD tools, Git, Jira, and Agile methodologies.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Experience: 3-5 yrs. Profile: Strong experience in QA automation using Selenium, Cypress, Playwright, or similar automation frameworks. Good knowledge of API testing, SQL, and test case design. Hands-on experience with CI/CD tools, Git, Jira, and Agile methodologies. Apply by emailing hr@alohatechnology.com.',
    },
    {
      title: 'Senior AI/ML Engineer',
      company: 'Aloha Technology',
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: 'alohatechnology-senior-ai-ml-engineer',
      requisitionId: 'alohatechnology-senior-ai-ml-engineer',
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: 'mailto:hr@alohatechnology.com',
      employmentType: null,
      experienceRequired: '5-7 yrs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Strong experience in Machine Learning and Deep Learning using Python.',
        'Hands-on expertise in Generative AI, LLMs, and RAG pipelines.',
        'Good knowledge of MLOps, Docker, Kubernetes, REST APIs, Git, and cloud platforms.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Experience: 5-7 yrs. Profile: Strong experience in Machine Learning and Deep Learning using Python. Hands-on expertise in Generative AI, LLMs, and RAG pipelines. Good knowledge of MLOps, Docker, Kubernetes, REST APIs, Git, and cloud platforms. Apply by emailing hr@alohatechnology.com.',
    },
  ])
})

test('run fetches the official Aloha Technology careers page and decorates jobs for persistence', async () => {
  const requestedUrls = []
  const jobs = await createAlohaTechnologyScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_PAGE_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'alohatechnology')
  assert.equal(jobs[0].link, 'mailto:hr@alohatechnology.com')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('extractCareerJobs rejects an unexpected Aloha Technology careers page shape', () => {
  assert.equal(pageIndicatesAlohaTechnologyCareers('<main><h1>Careers</h1></main>'), false)
  assert.throws(
    () => extractCareerJobs('<main><h1>Careers</h1></main>'),
    /expected public openings/,
  )
})
