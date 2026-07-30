import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  createElectrifexScraper,
  extractJobs,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <h1>Electrifex</h1>
      <p>Engineering innovative solutions for automotive, embedded, and cloud technologies.</p>
      <a href="https://talents.electrifex.com/">Careers</a>
    </body>
  </html>
`

const spaHomepageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta content="width=device-width,initial-scale=1" name="viewport">
      <title>Electrifex</title>
      <meta name="title" content="Electrifex">
      <meta
        name="description"
        content="Electrifex: Engineering innovative solutions for automotive, embedded, and cloud technologies. Discover our products, team, and culture."
      />
      <script type="module" crossorigin src="/assets/index-CZyhokCF.js"></script>
      <link rel="stylesheet" crossorigin href="/assets/index-ClzYOlaq.css">
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Electrifex | Career | Online Registration | Join Us</title>
    </head>
    <body>
      <h1>Recruitment Drive 2026</h1>
      <h2>Job Openings</h2>
      <div class="accordion-item">
        <h3>Fresher UI/UX Developer &amp; Content Creator</h3>
        <a href="/registration_form/17">Apply Now</a>
      </div>
      <div class="accordion-item">
        <h3>Experienced DevOps Engineer (Docker/Kubernetes)</h3>
        <a href="/registration_form/14">Apply Now</a>
      </div>
    </body>
  </html>
`

test('validates the verified official Electrifex public surfaces', () => {
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialHomepageSignal(spaHomepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
})

test('extractJobs maps public Electrifex job cards and login-gated apply targets', () => {
  const jobs = extractJobs(careersHtml)

  assert.deepEqual(jobs, [
    {
      title: 'Fresher UI/UX Developer & Content Creator',
      company: 'Electrifex',
      location: 'India',
      city: null,
      country: 'India',
      jobId: '17',
      requisitionId: '17',
      sourceUrl: 'https://talents.electrifex.com/',
      applyUrl: 'https://talents.electrifex.com/registration_form/17',
      employmentType: null,
      experienceRequired: 'Fresher',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
    {
      title: 'Experienced DevOps Engineer (Docker/Kubernetes)',
      company: 'Electrifex',
      location: 'India',
      city: null,
      country: 'India',
      jobId: '14',
      requisitionId: '14',
      sourceUrl: 'https://talents.electrifex.com/',
      applyUrl: 'https://talents.electrifex.com/registration_form/14',
      employmentType: null,
      experienceRequired: 'Experienced',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
  ])
})

test('run validates the official Electrifex surfaces before extracting jobs', async () => {
  const requestedUrls = []

  const jobs = await createElectrifexScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) return spaHomepageHtml
      if (url === CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'electrifex')
  assert.equal(jobs[0].link, 'https://talents.electrifex.com/registration_form/17')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('run fails closed when the Electrifex careers page signal changes', async () => {
  await assert.rejects(
    createElectrifexScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        return '<html><body>No visible jobs here</body></html>'
      },
    }),
    /verified official public jobs surface/i,
  )
})
