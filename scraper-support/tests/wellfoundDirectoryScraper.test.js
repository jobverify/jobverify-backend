import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createWellfoundDirectoryScraper,
  extractWellfoundJobs,
  findCompanyJobsUrl,
} from '../wellfoundDirectory/engine.js'

const provider = {
  source: 'applied-intuition.wellfoundDirectory',
  companyName: 'Applied Intuition',
  companyCareerPage: 'https://wellfound.com/startups/location/bangalore?page=2',
  wellfoundDirectoryPageUrl: 'https://wellfound.com/startups/location/bangalore?page=2',
  wellfoundOpeningsShown: 231,
  verifiedOn: '2026-07-19',
  atsPlatform: 'wellfound-directory',
  countryFilter: 'India',
}

const directoryHtml = `
  <section>
    <a href="/company/applied-intuition">Applied Intuition</a>
    <a href="/company/applied-intuition/jobs">View all 231 jobs at Applied Intuition</a>
  </section>
`

const jobsHtml = `
  <main>
    <article>
      <a href="/jobs/1234567-autonomy-software-engineer">Autonomy Software Engineer</a>
      <span data-location>Bengaluru, Karnataka, India</span>
      <span>Full-time</span>
      <p>Build autonomy systems for vehicles.</p>
    </article>
    <article>
      <a href="https://wellfound.com/jobs/7654321-simulation-engineer">Simulation Engineer</a>
      <span data-location>Remote, India</span>
      <p>Own simulation infrastructure.</p>
    </article>
  </main>
`

test('findCompanyJobsUrl resolves the matching Wellfound jobs link from a directory page', () => {
  assert.equal(
    findCompanyJobsUrl({
      html: directoryHtml,
      companyName: 'Applied Intuition',
      baseUrl: provider.companyCareerPage,
    }),
    'https://wellfound.com/company/applied-intuition/jobs',
  )
})

test('extractWellfoundJobs maps public Wellfound job links into Jobverify job records', () => {
  assert.deepEqual(extractWellfoundJobs({
    html: jobsHtml,
    provider,
    jobsUrl: 'https://wellfound.com/company/applied-intuition/jobs',
  }), [
    {
      title: 'Autonomy Software Engineer',
      company: 'Applied Intuition',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      link: 'https://wellfound.com/jobs/1234567-autonomy-software-engineer',
      applyUrl: 'https://wellfound.com/jobs/1234567-autonomy-software-engineer',
      sourceUrl: 'https://wellfound.com/jobs/1234567-autonomy-software-engineer',
      source: 'applied-intuition.wellfoundDirectory',
      jobId: '1234567',
      requisitionId: '1234567',
      department: null,
      employmentType: 'Full-time',
      jobDescription: 'Build autonomy systems for vehicles.',
      remoteStatus: 'On-site',
      atsPlatform: 'wellfound-directory',
    },
    {
      title: 'Simulation Engineer',
      company: 'Applied Intuition',
      location: 'Remote, India',
      city: 'Remote',
      country: 'India',
      link: 'https://wellfound.com/jobs/7654321-simulation-engineer',
      applyUrl: 'https://wellfound.com/jobs/7654321-simulation-engineer',
      sourceUrl: 'https://wellfound.com/jobs/7654321-simulation-engineer',
      source: 'applied-intuition.wellfoundDirectory',
      jobId: '7654321',
      requisitionId: '7654321',
      department: null,
      employmentType: null,
      jobDescription: 'Own simulation infrastructure.',
      remoteStatus: 'Remote',
      atsPlatform: 'wellfound-directory',
    },
  ])
})

test('Wellfound-directory scraper falls back to a truthful aggregate hiring signal when listings are challenge-gated', async () => {
  const requestedUrls = []
  const scraper = createWellfoundDirectoryScraper(provider)
  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === provider.companyCareerPage) return directoryHtml
      if (url === 'https://wellfound.com/company/applied-intuition/jobs') {
        return '<html><title>wellfound.com</title><body>Please enable JavaScript</body></html>'
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    provider.companyCareerPage,
    'https://wellfound.com/company/applied-intuition/jobs',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Current openings at Applied Intuition')
  assert.equal(jobs[0].company, 'Applied Intuition')
  assert.equal(jobs[0].location, 'Bangalore, India')
  assert.equal(jobs[0].source, 'applied-intuition.wellfoundDirectory')
  assert.equal(jobs[0].sourceUrl, 'https://wellfound.com/company/applied-intuition/jobs')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.match(jobs[0].jobDescription, /231 current openings/i)
})
