import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_API_URL,
  CAREERS_PORTAL_URL,
  HOMEPAGE_URL,
  createEducohireScraper,
  extractIndiaJobs,
  hasOfficialHomepageSignal,
  hasOfficialPortalSignal,
} from './script.js'

const homepageHtml = `
  <html lang="en">
    <body>
      <h1>Find your dream job with EducoHire</h1>
      <a href="https://job.educohire.com/jobs/Careers">Search Jobs</a>
    </body>
  </html>
`

const portalHtml = `
  <html lang="en">
    <body>
      <script>var clientSessionData = {"isNewCareerSite":true}</script>
      <a href="https://educohire.zohorecruit.com/jobs/Careers/rss">rss</a>
      <button class="create-job-alert">Create Job Alert</button>
    </body>
  </html>
`

const apiPayload = {
  code: 'success',
  data: [
    {
      Posting_Title: 'Pre Primary teachers needed for a State Board School in Nashik, Maharashtra-422009 - ( Job ID - 23636)',
      Job_Opening_Name: 'Pre Primary teachers needed for a State Board School in Nashik, Maharashtra-422009 - ( Job ID - 23636)',
      Job_Type: 'Full time',
      Segment: 'School Teaching Jobs',
      Country: 'India',
      State: 'Maharashtra',
      City: 'Nashik',
      Work_Experience: '2-5 years',
      Date_Opened: '07/07/2026',
      Job_Description: 'Immediate Joining needed',
      id: '619554000080784008',
      $url: 'https://job.educohire.com/jobs/Careers/619554000080784008/Pre-Primary-teachers-needed-for-a-State-Board-School-in-Nashik-Maharashtra-422009---Job-ID---23636?source=CareerSite',
    },
    {
      Posting_Title: 'Director of Sales Required for Uttarakhand - ( Job ID - 23632)',
      Job_Opening_Name: 'Director of Sales Required for Uttarakhand - ( Job ID - 23632)',
      Job_Type: 'Full time',
      Segment: 'Marketing Jobs',
      Country: 'India',
      State: 'Uttarakhand',
      City: 'Pauri',
      Work_Experience: '8-10 years',
      Date_Opened: '07/07/2026',
      Job_Description: 'Luxury resort role',
      id: '619554000080700001',
      $url: 'https://job.educohire.com/jobs/Careers/619554000080700001/Director-of-Sales-Required-for-Uttarakhand---Job-ID---23632?source=CareerSite',
    },
    {
      Posting_Title: 'International Counselor',
      Job_Opening_Name: 'International Counselor',
      Job_Type: 'Full time',
      Segment: 'Counselling Jobs',
      Country: 'Nepal',
      State: 'Bagmati',
      City: 'Kathmandu',
      Work_Experience: '2-4 years',
      Date_Opened: '07/07/2026',
      Job_Description: 'Outside India',
      id: '619554000080799999',
      $url: 'https://job.educohire.com/jobs/Careers/619554000080799999/International-Counselor?source=CareerSite',
    },
  ],
}

test('EducoHire constants stay pinned to the verified official homepage, portal, and public jobs API', () => {
  assert.equal(HOMEPAGE_URL, 'https://www.educohire.com/')
  assert.equal(CAREERS_PORTAL_URL, 'https://job.educohire.com/jobs/Careers')
  assert.equal(
    CAREERS_API_URL,
    'https://educohire.zohorecruit.com/recruit/v2/public/Job_Openings?source=CareerSite&pagename=Careers',
  )
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialPortalSignal(portalHtml), true)
})

test('extractIndiaJobs keeps official India openings and normalizes shared scraper fields', () => {
  assert.deepEqual(extractIndiaJobs(apiPayload), [
    {
      title: 'Pre Primary teachers needed for a State Board School in Nashik, Maharashtra-422009 - ( Job ID - 23636)',
      company: 'EducoHire',
      department: 'School Teaching Jobs',
      location: 'Nashik, Maharashtra, India',
      city: 'Nashik',
      state: 'Maharashtra',
      country: 'India',
      jobId: '619554000080784008',
      requisitionId: '619554000080784008',
      sourceUrl: 'https://job.educohire.com/jobs/Careers/619554000080784008/Pre-Primary-teachers-needed-for-a-State-Board-School-in-Nashik-Maharashtra-422009---Job-ID---23636?source=CareerSite',
      applyUrl: 'https://job.educohire.com/jobs/Careers/619554000080784008/Pre-Primary-teachers-needed-for-a-State-Board-School-in-Nashik-Maharashtra-422009---Job-ID---23636?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: '2-5 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '07/07/2026',
      closingDate: null,
      jobDescription: 'Immediate Joining needed',
      remoteStatus: 'On-site',
    },
    {
      title: 'Director of Sales Required for Uttarakhand - ( Job ID - 23632)',
      company: 'EducoHire',
      department: 'Marketing Jobs',
      location: 'Pauri, Uttarakhand, India',
      city: 'Pauri',
      state: 'Uttarakhand',
      country: 'India',
      jobId: '619554000080700001',
      requisitionId: '619554000080700001',
      sourceUrl: 'https://job.educohire.com/jobs/Careers/619554000080700001/Director-of-Sales-Required-for-Uttarakhand---Job-ID---23632?source=CareerSite',
      applyUrl: 'https://job.educohire.com/jobs/Careers/619554000080700001/Director-of-Sales-Required-for-Uttarakhand---Job-ID---23632?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: '8-10 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '07/07/2026',
      closingDate: null,
      jobDescription: 'Luxury resort role',
      remoteStatus: 'On-site',
    },
  ])
})

test('run verifies the official EducoHire portal before loading the public jobs API', async () => {
  const requestedUrls = []
  const jobs = await createEducohireScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_PORTAL_URL) return portalHtml
      throw new Error(`Unexpected HTML URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_API_URL) return apiPayload
      throw new Error(`Unexpected API URL: ${url}`)
    },
    now: () => '2026-07-08T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    CAREERS_PORTAL_URL,
    CAREERS_API_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'educohire')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-08T00:00:00.000Z')
})

test('run fails closed when the verified official EducoHire portal signal disappears', async () => {
  await assert.rejects(
    createEducohireScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        return '<html><body>No Zoho Recruit signals</body></html>'
      },
      fetchJson: async () => apiPayload,
    }),
    /verified official Zoho Recruit surface/i,
  )
})
