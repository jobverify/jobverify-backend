import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  JOBS_URL,
  createElektrobitAutomotiveScraper,
  hasOfficialCareersSignal,
  hasOfficialJobsPortalSignal,
} from './script.js'

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <a href="https://jobs.elektrobit.com/">Open positions</a>
      <a href="https://www.elektrobit.com/careers/">Working at Elektrobit</a>
    </body>
  </html>
`

const jobsPortalHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Jobs@Elektrobit</title>
    </head>
    <body>
      <p>Interested? We are looking forward to receiving your application.</p>
      <div class="filters">Location India - Bangalore Germany - Erlangen</div>
      <ul class="results">
        <li>
          <a href="/Director-of-strategy-eng-j9510.html">Director of strategy</a>
          <span>India - Bangalore</span>
          <span>Marketing, Software Development</span>
        </li>
        <li>
          <a href="/Legal-Advisor-j9520.html">Legal Advisor</a>
          <span>Germany - Erlangen</span>
          <span>Legal</span>
        </li>
      </ul>
    </body>
  </html>
`

const detailHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <h1>Director of strategy</h1>
      <p>Bangalore</p>
      <p>Hi, Welcome to Elektrobit!</p>
      <p>Would you like to have a job where you can influence one of the biggest industries?</p>
      <p>Would you like to help make this vision a reality and move the world with us?</p>
      <p>Experience level: 15+ years</p>
      <p>Location: India | Bangalore</p>
      <p>Department: Strategy &amp; Portfolio</p>
      <p>Employment Type: Full-Time</p>
      <h2>What you will need to be successful (Skills):</h2>
      <p>Qualifications</p>
      <p>- 15+ years of experience in crafting corporate strategy.</p>
      <p>- MBA or equivalent advanced degree strongly preferred.</p>
      <p>What You Bring</p>
      <p>- A visionary mindset with the ability to connect dots across markets.</p>
      <a href="https://jobs.elektrobit.com/apply/Director-of-strategy-eng-j9510.html">Apply now!</a>
    </body>
  </html>
`

test('verified official careers and jobs portal signals hold for Elektrobit Automotive', () => {
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
  assert.equal(hasOfficialJobsPortalSignal(jobsPortalHtml), true)
})

test('scraper run keeps only India listings and enriches them from the public detail page', async () => {
  const requestedUrls = []
  const scraper = createElektrobitAutomotiveScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === CAREERS_URL) return careersHtml
      if (url === JOBS_URL) return jobsPortalHtml
      if (url === 'https://jobs.elektrobit.com/Director-of-strategy-eng-j9510.html') return detailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_URL,
    JOBS_URL,
    'https://jobs.elektrobit.com/Director-of-strategy-eng-j9510.html',
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Director of strategy',
    company: 'Elektrobit Automotive',
    department: 'Strategy & Portfolio',
    location: 'India | Bangalore',
    city: 'Bangalore',
    country: 'India',
    jobId: 'director-of-strategy',
    requisitionId: 'director-of-strategy',
    sourceUrl: 'https://jobs.elektrobit.com/Director-of-strategy-eng-j9510.html',
    applyUrl: 'https://jobs.elektrobit.com/apply/Director-of-strategy-eng-j9510.html',
    employmentType: 'Full-time',
    experienceRequired: '15+ years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      '15+ years of experience in crafting corporate strategy.',
      'MBA or equivalent advanced degree strongly preferred.',
      'A visionary mindset with the ability to connect dots across markets.',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Would you like to have a job where you can influence one of the biggest industries? Would you like to help make this vision a reality and move the world with us?',
    source: 'elektrobitautomotive',
    link: 'https://jobs.elektrobit.com/apply/Director-of-strategy-eng-j9510.html',
    scrapedAt: jobs[0].scrapedAt,
  })
})

test('fails closed when the official Elektrobit careers page changes', async () => {
  await assert.rejects(
    createElektrobitAutomotiveScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_URL) return '<html><body>No jobs portal link</body></html>'
        return jobsPortalHtml
      },
    }),
    /Elektrobit careers page no longer matches the verified official public careers surface/i,
  )
})

test('fails closed when the official Elektrobit jobs portal changes', async () => {
  await assert.rejects(
    createElektrobitAutomotiveScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_URL) return careersHtml
        if (url === JOBS_URL) return '<html><body>No India roles</body></html>'
        return detailHtml
      },
    }),
    /Elektrobit jobs portal no longer matches the verified official public jobs surface/i,
  )
})
