import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ACTION_URL,
  JOB_RESULTS_PAGE_URL,
  buildFeedUrl,
  createSutherlandGlobalScraper,
  extractFeedConfig,
  extractIndiaJobs,
  hasOfficialSearchSurface,
} from './script.js'

const officialJobResultsHtml = `
  <html>
    <head>
      <title>Job Results | Sutherland</title>
    </head>
    <body>
      <h1>A Great Place to Work and Propel Your Career Growth</h1>
      <div>Your search resulted in: <span class="shmResultCount">0</span></div>
      <script>
        const ActionUrl = 'https://shazamme.io/Job-Listing/src/php/actions';
        const data = {
          page: {},
          siteId: '76755cce'
        };
      </script>
      <script>
        window.dm_tracker = {
          SiteAlias: '76755cce'
        };
        _dm_gaq.siteAlias = '76755cce';
      </script>
      <footer>Powered with by <a href="https://www.shazamme.com/">Shazamme</a></footer>
    </body>
  </html>
`

const publicFeedPayload = [
  {
    page_item_url: 'technical-architect-in-healthcare-jobs-1633520',
    data: {
      jobID: '867fa9be-c9a1-458d-a9ca-0b5a18abac00',
      referenceNumber: 'REF44509H',
      jobName: 'Technical Architect',
      fullDescription: '<div><h4>Qualifications:</h4><p>10+ years of software development experience</p></div>',
      city: 'Hyderabad',
      state: 'TS',
      country: 'India',
      applicationURL: 'https://jobs.smartrecruiters.com/oneclick-ui/company/Sutherland/publication/a52210a2-5015-42a8-acc7-eedf444770e7',
      postedDate: '07-09-2026',
      siteName: 'Sutherland Global',
      workType: 'Permanent WAH',
      category: 'Healthcare',
      jobURL: 'https://jobs.sutherlandglobal.com/job-details/technical-architect-in-healthcare-jobs-1633520',
      activeStatus: true,
    },
  },
  {
    page_item_url: 'associate-manager-research-in-financial-research-jobs-1633493',
    data: {
      jobID: 'b7704b23-c566-4d58-89a7-32332c2f12ef',
      referenceNumber: 'REF44119Q',
      jobName: 'Associate Manager - Research',
      fullDescription: '<div><h4>Qualifications:</h4><p>3-5 years of experience working in project finance.</p></div>',
      city: 'Mumbai',
      state: '//MH',
      country: 'India',
      applicationURL: 'https://jobs.smartrecruiters.com/oneclick-ui/company/Sutherland/publication/699c1436-dc2e-4b19-b071-dcd587d72ba6',
      postedDate: '07-09-2026',
      siteName: 'Sutherland Global',
      workType: 'Temporary WAH',
      category: 'Financial Research',
      jobURL: 'https://jobs.sutherlandglobal.com/job-details/associate-manager-research-in-financial-research-jobs-1633493',
      activeStatus: true,
    },
  },
  {
    page_item_url: 'assoc-mgr-wfm-management-in-travel-jobs-1633239',
    data: {
      jobID: '65faccad-f58a-4b29-b9ff-3b3b95bd5471',
      referenceNumber: 'REF43926H',
      jobName: 'Assoc Mgr-WFM Management',
      fullDescription: '<div><p>Work from Office (Mandatory)</p></div>',
      city: 'Taguig',
      state: 'NCR',
      country: 'Philippines',
      applicationURL: 'https://jobs.smartrecruiters.com/oneclick-ui/company/Sutherland/publication/f1963ca4-9ce7-48a9-a390-5f64fef53030',
      postedDate: '07-09-2026',
      siteName: 'Sutherland Global',
      workType: 'Brick and Mortar',
      category: 'Travel',
      jobURL: 'https://jobs.sutherlandglobal.com/job-details/assoc-mgr-wfm-management-in-travel-jobs-1633239',
      activeStatus: true,
    },
  },
]

test('extractFeedConfig recognizes Sutherland job-results page and public Shazamme feed config', () => {
  assert.equal(JOB_RESULTS_PAGE_URL, 'https://www.jobs.sutherlandglobal.com/job-results')
  assert.equal(ACTION_URL, 'https://shazamme.io/Job-Listing/src/php/actions')
  assert.equal(hasOfficialSearchSurface(officialJobResultsHtml), true)
  assert.deepEqual(extractFeedConfig(officialJobResultsHtml), {
    actionUrl: ACTION_URL,
    siteAlias: '76755cce',
  })
  assert.equal(
    buildFeedUrl({ actionUrl: ACTION_URL, siteAlias: '76755cce' }),
    'https://shazamme.io/Job-Listing/src/php/actions?dudaSiteID=76755cce&action=Get+Jobs',
  )
})

test('extractIndiaJobs keeps only India records and normalizes the public Shazamme payload', () => {
  const jobs = extractIndiaJobs(publicFeedPayload)

  assert.deepEqual(jobs, [
    {
      title: 'Technical Architect',
      company: 'Sutherland Global',
      location: 'Hyderabad, TS, India',
      city: 'Hyderabad',
      state: 'TS',
      country: 'India',
      department: 'Healthcare',
      jobCategory: 'Healthcare',
      jobId: '867fa9be-c9a1-458d-a9ca-0b5a18abac00',
      requisitionId: 'REF44509H',
      sourceUrl: 'https://jobs.sutherlandglobal.com/job-details/technical-architect-in-healthcare-jobs-1633520',
      applyUrl: 'https://jobs.smartrecruiters.com/oneclick-ui/company/Sutherland/publication/a52210a2-5015-42a8-acc7-eedf444770e7',
      employmentType: 'Full-time',
      experienceRequired: '10+ years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-09',
      closingDate: null,
      jobDescription: 'Qualifications: 10+ years of software development experience',
      remoteStatus: 'Remote',
    },
    {
      title: 'Associate Manager - Research',
      company: 'Sutherland Global',
      location: 'Mumbai, MH, India',
      city: 'Mumbai',
      state: 'MH',
      country: 'India',
      department: 'Financial Research',
      jobCategory: 'Financial Research',
      jobId: 'b7704b23-c566-4d58-89a7-32332c2f12ef',
      requisitionId: 'REF44119Q',
      sourceUrl: 'https://jobs.sutherlandglobal.com/job-details/associate-manager-research-in-financial-research-jobs-1633493',
      applyUrl: 'https://jobs.smartrecruiters.com/oneclick-ui/company/Sutherland/publication/699c1436-dc2e-4b19-b071-dcd587d72ba6',
      employmentType: 'Contract',
      experienceRequired: '3-5 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-09',
      closingDate: null,
      jobDescription: 'Qualifications: 3-5 years of experience working in project finance.',
      remoteStatus: 'Remote',
    },
  ])
})

test('run validates the official Sutherland search page, calls the public feed, and returns India jobs with scraper metadata', async () => {
  const requests = []
  const scraper = createSutherlandGlobalScraper({ now: () => '2026-07-10T00:00:00.000Z' })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push({ type: 'page', url })
      return officialJobResultsHtml
    },
    fetchJson: async (url) => {
      requests.push({ type: 'feed', url })
      return publicFeedPayload
    },
  })

  assert.deepEqual(requests, [
    { type: 'page', url: JOB_RESULTS_PAGE_URL },
    {
      type: 'feed',
      url: 'https://shazamme.io/Job-Listing/src/php/actions?dudaSiteID=76755cce&action=Get+Jobs',
    },
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'sutherlandglobal')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-10T00:00:00.000Z')
  assert.equal(jobs[1].employmentType, 'Contract')
})

test('run fails closed when the official Sutherland job-results page shape changes', async () => {
  await assert.rejects(
    createSutherlandGlobalScraper().run({
      fetchText: async () => '<html><body>Unexpected careers experience</body></html>',
      fetchJson: async () => publicFeedPayload,
    }),
    /official Sutherland public search surface/i,
  )
})
