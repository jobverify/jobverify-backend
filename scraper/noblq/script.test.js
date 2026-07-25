import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ABOUT_US_URL,
  CAREERS_API_URL,
  CAREERS_PORTAL_URL,
  HOMEPAGE_URL,
  createNoblQScraper,
  extractIndiaJobs,
  hasOfficialAboutUsSignal,
  hasOfficialHomepageSignal,
  hasOfficialPortalSignal,
} from './script.js'

const homepageHtml = `
  <html lang="en">
    <head>
      <title>Noblq Global Digital Solutions Partner</title>
    </head>
    <body>
      <a href="https://www.noblq.com/about-us">About Us</a>
      <a href="/contact-us">Contact Us</a>
      <a href="mailto:reachout@noblq.com">reachout@noblq.com</a>
      <span>+1 972 401 3771</span>
    </body>
  </html>
`

const aboutUsHtml = `
  <html lang="en">
    <head>
      <title>About Noblq Driven by Purpose, Built to Solve</title>
    </head>
    <body>
      <section>
        <h2>Culture and Careers</h2>
        <h3>CAREERS FOR CURIOUS PROBLEM SOLVERS</h3>
        <p>If you share our love for learning and growth, join us.</p>
        <a href="https://talent.noblq.com/jobs/Careers">Explore Opportunities</a>
      </section>
    </body>
  </html>
`

const portalHtml = `
  <html lang="en">
    <head>
      <title>Jobs at NoblQ</title>
      <meta property="og:url" content="https://talent.noblq.com/jobs/Careers">
      <meta property="og:site_name" content="NoblQ">
      <meta name="description" content="Everyone at NoblQ is free to explore and work the way you want. Come join us!">
    </head>
    <body>
      <input type="hidden" id="pageJson" value="{&quot;detail&quot;:{&quot;section&quot;:{&quot;data&quot;:[{&quot;blocktype&quot;:&quot;jobs&quot;,&quot;subtitle&quot;:&quot;Current Openings&quot;}]}}}">
      <input type="hidden" id="moduleMeta" value="[{&quot;api_name&quot;:&quot;Job_Openings&quot;}]">
      <input type="hidden" id="jobs" value="[{&quot;id&quot;:&quot;160617000009815136&quot;}]">
    </body>
  </html>
`

const apiPayload = {
  code: 'success',
  data: [
    {
      Posting_Title: 'Oracle Apps Technical Consultant',
      Job_Opening_Name: 'Oracle Apps Technical Consultant',
      Is_Locked: false,
      City: 'Bengaluru',
      Industry: 'IT Services',
      Job_Description: 'Design and deliver Oracle Apps solutions.',
      Job_Type: 'Full time',
      State: 'Karnataka',
      Currency: 'INR',
      Country: 'India',
      $url: 'https://talent.noblq.com/jobs/Careers/160617000009815136/Oracle-Apps-Technical-Consultant?source=CareerSite',
      id: '160617000009815136',
      Publish: true,
      Date_Opened: '01/07/2026',
      Keep_on_Career_Site: false,
    },
    {
      Posting_Title: 'Pre-Sales Consultant',
      Job_Opening_Name: 'Pre-Sales Consultant',
      City: 'Salem',
      Industry: 'IT Services',
      Job_Description: 'Support solution design and demos.',
      Job_Type: 'Full time',
      State: 'Tamil Nadu',
      Country: 'India',
      $url: 'https://talent.noblq.com/jobs/Careers/160617000009284509/Pre-Sales-Consultant?source=CareerSite',
      id: '160617000009284509',
      Publish: true,
      Date_Opened: '12/09/2025',
    },
    {
      Posting_Title: 'US Delivery Manager',
      Job_Opening_Name: 'US Delivery Manager',
      City: 'Dallas',
      Industry: 'Consulting',
      Job_Description: 'Lead global delivery.',
      Job_Type: 'Full time',
      State: 'Texas',
      Country: 'United States',
      $url: 'https://talent.noblq.com/jobs/Careers/160617000019999999/US-Delivery-Manager?source=CareerSite',
      id: '160617000019999999',
      Publish: true,
      Date_Opened: '01/02/2026',
    },
  ],
}

test('NoblQ constants stay pinned to the verified first-party homepage and public careers surfaces', () => {
  assert.equal(HOMEPAGE_URL, 'https://www.noblq.com/')
  assert.equal(ABOUT_US_URL, 'https://www.noblq.com/about-us')
  assert.equal(CAREERS_PORTAL_URL, 'https://talent.noblq.com/jobs/Careers')
  assert.equal(
    CAREERS_API_URL,
    'https://talent.noblq.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialAboutUsSignal(aboutUsHtml), true)
  assert.equal(hasOfficialPortalSignal(portalHtml), true)
})

test('extractIndiaJobs keeps only India openings and normalizes shared scraper fields', () => {
  assert.deepEqual(extractIndiaJobs(apiPayload), [
    {
      title: 'Oracle Apps Technical Consultant',
      company: 'NoblQ',
      department: null,
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: '160617000009815136',
      requisitionId: '160617000009815136',
      sourceUrl: 'https://talent.noblq.com/jobs/Careers/160617000009815136/Oracle-Apps-Technical-Consultant?source=CareerSite',
      applyUrl: 'https://talent.noblq.com/jobs/Careers/160617000009815136/Oracle-Apps-Technical-Consultant?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '01/07/2026',
      closingDate: null,
      jobDescription: 'Design and deliver Oracle Apps solutions.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Pre-Sales Consultant',
      company: 'NoblQ',
      department: null,
      location: 'Salem, Tamil Nadu, India',
      city: 'Salem',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: '160617000009284509',
      requisitionId: '160617000009284509',
      sourceUrl: 'https://talent.noblq.com/jobs/Careers/160617000009284509/Pre-Sales-Consultant?source=CareerSite',
      applyUrl: 'https://talent.noblq.com/jobs/Careers/160617000009284509/Pre-Sales-Consultant?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '12/09/2025',
      closingDate: null,
      jobDescription: 'Support solution design and demos.',
      remoteStatus: 'On-site',
    },
  ])
})

test('run verifies the homepage, careers handoff, portal, and public jobs API before returning India roles', async () => {
  const requestedUrls = []

  const jobs = await createNoblQScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === ABOUT_US_URL) return aboutUsHtml
      if (url === CAREERS_PORTAL_URL) return portalHtml
      throw new Error(`Unexpected HTML URL ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, CAREERS_API_URL)
      return apiPayload
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    ABOUT_US_URL,
    CAREERS_PORTAL_URL,
    CAREERS_API_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'noblq')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-11T00:00:00.000Z')
})

test('run fails closed when the verified NoblQ careers handoff disappears', async () => {
  await assert.rejects(
    createNoblQScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === ABOUT_US_URL) {
          return '<html><head><title>About Noblq</title></head><body>No careers link here.</body></html>'
        }
        return portalHtml
      },
      fetchJson: async () => apiPayload,
    }),
    /official NoblQ about-us careers handoff/i,
  )
})
