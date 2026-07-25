import assert from 'node:assert/strict'
import test from 'node:test'

import {
  API_BASE_URL,
  FILTERED_JOBS_URL,
  NOAUTH_TOKEN_URL,
  OFFICIAL_CAREERS_URL,
  ORG_ID,
  ORIGIN,
  createJswScraper,
  extractPublicJobs,
  extractTurboHireHandoffUrl,
  hasOfficialCareersSignal,
} from './script.js'

const careersHtml = `
  <html lang="en">
    <head>
      <title>Explore Growth &amp; Opportunities | JSW Careers</title>
      <link rel="canonical" href="https://www.jsw.in/careers/">
    </head>
    <body>
      <h1>JSW Careers - Discover the Pathways to Your Future</h1>
      <a href="https://jswgroup.turbohire.co">Apply Now</a>
      <p>Visit the Careers section of our website for authentic openings across various JSW Group companies.</p>
    </body>
  </html>
`

const sampleTurboHirePayload = {
  Total: 2,
  Result: [
    {
      JobId: '5586ffa0-79df-4465-af1b-0a7cee325095',
      JobIdObfuscated: 'f4FnLzXjmnTjCAa7USd3SBvElOegOmwa6L3A3AQBQoEajIVxWAvtASpga_1QBGuu',
      JobCode: 'REQ_15530',
      JobTitle: 'Accessories Development Lead',
      Department: 'Sales & Marketing',
      PublishedDate: '2026-06-05T11:31:33.925923Z',
      ExpiryDates: {
        CAREERPAGE: '2026-09-30T00:00:00',
      },
      Location: '[{"Address":"Mum - JSW Centre,Mumbai, Maharashtra, India, (Corporate)","PlaceId":null}]',
      JobTypeV2: 'Full Time',
      Experience: {
        MinExp: 12,
        MaxExp: 15,
      },
      Skills: [
        'Accessories Development',
        'vendor development',
        'Supply Chain Planning',
      ],
      JobDescV2: '<p>Lead the end-to-end development of vehicle accessories for JSW Motors.</p>',
    },
    {
      JobId: 'non-india-role',
      JobIdObfuscated: 'ignored',
      JobCode: 'REQ_X',
      JobTitle: 'Overseas Role',
      Department: 'International',
      PublishedDate: '2026-06-05T11:31:33.925923Z',
      ExpiryDates: {
        CAREERPAGE: '2026-09-30T00:00:00',
      },
      Location: '[{"Address":"Dubai, United Arab Emirates","PlaceId":null}]',
      JobTypeV2: 'Full Time',
      Experience: {
        MinExp: 8,
        MaxExp: 10,
      },
      Skills: ['Global Sales'],
      JobDescV2: '<p>Ignored because not India.</p>',
    },
  ],
}

test('JSW scraper pins the verified official careers page and TurboHire feed', () => {
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.jsw.in/careers/')
  assert.equal(ORIGIN, 'https://jswgroup.turbohire.co')
  assert.equal(ORG_ID, '9b510aa7-a9f2-46a7-aeb7-8853d81bcf10')
  assert.equal(API_BASE_URL, 'https://thapi.azurewebsites.net')
  assert.equal(NOAUTH_TOKEN_URL, 'https://thapi.azurewebsites.net/api/token/noauth')
  assert.equal(
    FILTERED_JOBS_URL,
    'https://thapi.azurewebsites.net/api/careerpagev2/filteredjobs?orgId=9b510aa7-a9f2-46a7-aeb7-8853d81bcf10&pageType=0',
  )
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
  assert.equal(extractTurboHireHandoffUrl(careersHtml), ORIGIN)
})

test('extractPublicJobs normalizes India jobs from the JSW TurboHire feed', () => {
  assert.deepEqual(extractPublicJobs(sampleTurboHirePayload), [
    {
      title: 'Accessories Development Lead',
      company: 'JSW',
      department: 'Sales & Marketing',
      location: 'Mum - JSW Centre, Mumbai, Maharashtra, India, (Corporate)',
      city: 'Mumbai',
      country: 'India',
      jobId: '5586ffa0-79df-4465-af1b-0a7cee325095',
      requisitionId: 'REQ_15530',
      sourceUrl: 'https://jswgroup.turbohire.co/job/publicjobs/f4FnLzXjmnTjCAa7USd3SBvElOegOmwa6L3A3AQBQoEajIVxWAvtASpga_1QBGuu',
      applyUrl: 'https://jswgroup.turbohire.co/job/publicjobs/f4FnLzXjmnTjCAa7USd3SBvElOegOmwa6L3A3AQBQoEajIVxWAvtASpga_1QBGuu',
      employmentType: 'Full Time',
      experienceRequired: '12-15 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Accessories Development',
        'vendor development',
        'Supply Chain Planning',
      ],
      postingDate: '2026-06-05T11:31:33.925923Z',
      closingDate: '2026-09-30T00:00:00',
      jobDescription: 'Lead the end-to-end development of vehicle accessories for JSW Motors.',
    },
  ])
})

test('run validates the official JSW careers handoff, reads the TurboHire feed, and decorates shared fields', async () => {
  const requested = []

  const jobs = await createJswScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === OFFICIAL_CAREERS_URL) return careersHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, method: options.method || 'GET' })

      if (url === NOAUTH_TOKEN_URL) {
        return { access_token: 'public-token' }
      }

      if (url === FILTERED_JOBS_URL) {
        return sampleTurboHirePayload
      }

      throw new Error(`Unexpected json URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    { type: 'text', url: OFFICIAL_CAREERS_URL },
    { type: 'json', url: NOAUTH_TOKEN_URL, method: 'GET' },
    { type: 'json', url: FILTERED_JOBS_URL, method: 'POST' },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'jsw')
  assert.equal(jobs[0].company, 'JSW')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})
