import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CURRENT_OPENINGS_URL,
  createEngineersIndiaLimitedScraper,
  extractOpenings,
  hasCurrentOpeningsSignal,
} from './script.js'

const openingsHtml = `
  <html>
    <head>
      <title>EIL Recruitment Portal</title>
    </head>
    <body>
      <h1>Current Openings</h1>
      <p>Recruitment of Fresher / Experienced Candidates: Live Advertisements / Print Outs</p>
      1. SRD FOR SC, ST &amp; OBCs (Adv No:HRD/RECTT./ADVT./2026-27/04)
      <a href="/applicnExpRecruitment/Printout_regno.aspx?adv=HRD%2FRECTT.%2FADVT.%2F2026-27%2F04">Print Application</a>
      2. FIXED TERM HIRING (Adv No:HRD/RECTT./ADVT./2026-27/02)
      <a href="/applicnExpRecruitment/Printout_regno.aspx?adv=HRD%2FRECTT.%2FADVT.%2F2026-27%2F02">Print Application</a>
      3. RECRUITMENT FOR EXPERIENCED PERSONNEL (Adv No:HRD/RECTT./ADVT./2026-27/03)
      <a href="/applicnExpRecruitment/Printout_regno.aspx?adv=HRD%2FRECTT.%2FADVT.%2F2026-27%2F03">Print Application</a>
      * * *
    </body>
  </html>
`

test('extractOpenings maps EIL recruitment portal entries into shared job fields', () => {
  assert.equal(hasCurrentOpeningsSignal(openingsHtml), true)
  assert.deepEqual(extractOpenings(openingsHtml), [
    {
      title: 'SRD FOR SC, ST & OBCs',
      company: 'Engineers India Limited',
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'eil-hrd-rectt-advt-2026-27-04',
      requisitionId: 'eil-hrd-rectt-advt-2026-27-04',
      sourceUrl: 'https://recruitment.eil.co.in/',
      applyUrl: 'https://recruitment.eil.co.in/applicnExpRecruitment/Printout_regno.aspx?adv=HRD%2FRECTT.%2FADVT.%2F2026-27%2F04',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Official EIL opening (HRD/RECTT./ADVT./2026-27/04). See the EIL Recruitment Portal for advertisement and application details.',
    },
    {
      title: 'FIXED TERM HIRING',
      company: 'Engineers India Limited',
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'eil-hrd-rectt-advt-2026-27-02',
      requisitionId: 'eil-hrd-rectt-advt-2026-27-02',
      sourceUrl: 'https://recruitment.eil.co.in/',
      applyUrl: 'https://recruitment.eil.co.in/applicnExpRecruitment/Printout_regno.aspx?adv=HRD%2FRECTT.%2FADVT.%2F2026-27%2F02',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Official EIL opening (HRD/RECTT./ADVT./2026-27/02). See the EIL Recruitment Portal for advertisement and application details.',
    },
    {
      title: 'RECRUITMENT FOR EXPERIENCED PERSONNEL',
      company: 'Engineers India Limited',
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'eil-hrd-rectt-advt-2026-27-03',
      requisitionId: 'eil-hrd-rectt-advt-2026-27-03',
      sourceUrl: 'https://recruitment.eil.co.in/',
      applyUrl: 'https://recruitment.eil.co.in/applicnExpRecruitment/Printout_regno.aspx?adv=HRD%2FRECTT.%2FADVT.%2F2026-27%2F03',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Official EIL opening (HRD/RECTT./ADVT./2026-27/03). See the EIL Recruitment Portal for advertisement and application details.',
    },
  ])
})

test('run fetches the official EIL recruitment portal and decorates jobs', async () => {
  const requestedUrls = []
  const jobs = await createEngineersIndiaLimitedScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return openingsHtml
    },
  })

  assert.deepEqual(requestedUrls, [CURRENT_OPENINGS_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'engineersindialimited')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('extractOpenings rejects an unexpected EIL recruitment page shape', () => {
  assert.equal(hasCurrentOpeningsSignal('<main><h1>Recruitment</h1></main>'), false)
  assert.throws(
    () => extractOpenings('<main><h1>Recruitment</h1></main>'),
    /expected current openings list/,
  )
})
