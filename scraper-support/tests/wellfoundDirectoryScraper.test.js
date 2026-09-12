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

test('Wellfound-directory scraper reports challenge-gated listings as failures', async () => {
  const requestedUrls = []
  const scraper = createWellfoundDirectoryScraper(provider)
  await assert.rejects(scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === provider.companyCareerPage) return directoryHtml
      if (url === 'https://wellfound.com/company/applied-intuition/jobs') {
        return '<html><title>wellfound.com</title><body>Please enable JavaScript</body></html>'
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  }), /challenge|javascript/i)

  assert.deepEqual(requestedUrls, [
    provider.companyCareerPage,
    'https://wellfound.com/company/applied-intuition/jobs',
  ])
})

test('Wellfound supports both linked and direct company job pages', async () => {
  const linked = await createWellfoundDirectoryScraper(provider).run({ fetchText: async (url) => url === provider.companyCareerPage ? directoryHtml : jobsHtml })
  const direct = await createWellfoundDirectoryScraper({ ...provider, companyCareerPage: 'https://wellfound.com/company/applied-intuition/jobs' }).run({ fetchText: async () => jobsHtml })
  assert.deepEqual(linked, direct)
  assert.equal(direct.length, 2)
})

test('Wellfound confirmed empty pages return zero jobs, while unknown pages and network errors fail', async () => {
  const scraper = createWellfoundDirectoryScraper({ ...provider, companyCareerPage: 'https://wellfound.com/company/applied-intuition/jobs' })
  assert.deepEqual(await scraper.run({ fetchText: async () => '<main>Applied Intuition has no open positions.</main>' }), [])
  await assert.rejects(scraper.run({ fetchText: async () => '<main>Loading jobs...</main>' }), /could not|unrecognized/i)
  await assert.rejects(scraper.run({ fetchText: async () => { throw new Error('HTTP 503') } }), /HTTP 503/)
})

test('Wellfound does not use an unrelated unlabeled company link', async () => {
  assert.equal(findCompanyJobsUrl({ html: '<a href="/company/unrelated/jobs"></a>', companyName: provider.companyName, baseUrl: provider.companyCareerPage }), null)
  await assert.rejects(createWellfoundDirectoryScraper(provider).run({ fetchText: async () => '<main>No matching company</main>' }), /company.*jobs|could not/i)
})

test('Wellfound does not invent India eligibility for overseas locations', () => {
  const html = '<article><a href="/jobs/7654321-engineer">Engineer</a><span data-location>Remote, United States</span></article>'
  assert.deepEqual(extractWellfoundJobs({ html, provider, jobsUrl: 'https://wellfound.com/company/applied-intuition/jobs' }), [])
})

test('Wellfound reports missing listing location as a parser failure instead of successful empty', async () => {
  const scraper = createWellfoundDirectoryScraper({ ...provider, companyCareerPage: 'https://wellfound.com/company/applied-intuition/jobs' })
  await assert.rejects(scraper.run({ fetchText: async () => '<article><a href="/jobs/1234567-engineer">Engineer</a><span class="unknown-field">Mumbai, India</span></article>' }), /location|parse/i)
  const jobs = await scraper.run({ fetchText: async () => '<article><a href="/jobs/1234567-engineer">Engineer</a><span class="workplace">Mumbai, India</span></article>' })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].location, 'Mumbai, India')
})
