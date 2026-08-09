import assert from 'node:assert/strict'
import test from 'node:test'

const officialGlobalCareersHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Join Our Team | Omega Healthcare Careers</title>
      <link rel="canonical" href="https://www.omegahms.com/careers/" />
    </head>
    <body>
      <h1>Omega Healthcare Careers</h1>
      <a href="https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/">Global Jobs</a>
      <a href="https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001">India Jobs</a>
    </body>
  </html>
`

const officialIndiaCareersHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Careers | Omega Healthcare</title>
      <link rel="canonical" href="https://www.omegahms.com/careers-india/" />
    </head>
    <body>
      <h1>Omega Healthcare Management Services</h1>
      <a href="https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/">Global Jobs</a>
      <a href="https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001">India Jobs</a>
    </body>
  </html>
`

const zeroOpeningsPayload = {
  items: [{
    TotalJobsCount: 0,
    Limit: 1,
    requisitionList: [],
  }],
}

const listingPayload = {
  items: [{
    TotalJobsCount: 1,
    Limit: 25,
    requisitionList: [
      {
        Id: '10001',
        Title: 'Senior Analyst - Revenue Cycle',
        PostedDate: '2026-07-08',
        PostingEndDate: '2026-08-08',
        PrimaryLocationCountry: 'IN',
        PrimaryLocation: 'India',
        Category: 'Operations',
        Department: 'Revenue Cycle',
        JobSchedule: 'Full Time',
        StudyLevel: 'Bachelor Degree',
        ShortDescriptionStr: 'Support provider revenue-cycle programs for Omega Healthcare.',
        secondaryLocations: [
          {
            Name: 'Bengaluru, Karnataka, India',
          },
        ],
      },
      {
        Id: '10002',
        Title: 'US-only Role',
        PostedDate: '2026-07-08',
        PrimaryLocationCountry: 'US',
        PrimaryLocation: 'Dallas, Texas, United States',
        secondaryLocations: [],
      },
    ],
  }],
}

const detailPayload = {
  items: [{
    Id: '10001',
    Title: 'Senior Analyst - Revenue Cycle',
    Department: 'Revenue Cycle',
    PrimaryLocationCountry: 'IN',
    PrimaryLocation: 'India',
    secondaryLocations: [
      {
        Name: 'Bengaluru, Karnataka, India',
      },
    ],
    JobSchedule: 'Full Time',
    StudyLevel: 'Bachelor Degree',
    ExternalPostedStartDate: '2026-07-08',
    ExternalPostedEndDate: '2026-08-08',
    ExternalDescriptionStr: '<p>Lead AR follow-up and denial management for payer accounts.</p>',
    ExternalQualificationsStr: '<ul><li>Revenue cycle experience</li><li>Healthcare domain knowledge</li></ul>',
    skills: [
      { Skill: 'AR follow-up' },
      { Skill: 'Denial management' },
    ],
  }],
}

test('Omega Healthcare returns no jobs when both verified Oracle India boards report zero openings', async () => {
  const omega = await import('../../scraper/omegahealthcaremanagementservices/script.js')
  const requestedTextUrls = []
  const requestedJsonUrls = []

  assert.equal(omega.hasOfficialGlobalCareersSignal(officialGlobalCareersHtml), true)
  assert.equal(omega.hasOfficialIndiaCareersSignal(officialIndiaCareersHtml), true)

  const jobs = await omega.createOmegaHealthcareManagementServicesScraper({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === omega.GLOBAL_CAREERS_URL) return officialGlobalCareersHtml
      if (url === omega.INDIA_CAREERS_URL) return officialIndiaCareersHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (
        url === omega.buildSearchUrl({
          siteNumber: omega.GLOBAL_SITE_NUMBER,
          page: 0,
          limit: 1,
          expandSecondaryLocations: false,
        })
        || url === omega.buildSearchUrl({
          siteNumber: omega.INDIA_SITE_NUMBER,
          page: 0,
          limit: 1,
          expandSecondaryLocations: false,
        })
      ) {
        return zeroOpeningsPayload
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedTextUrls, [
    omega.GLOBAL_CAREERS_URL,
    omega.INDIA_CAREERS_URL,
  ])
  assert.deepEqual(requestedJsonUrls, [
    omega.buildSearchUrl({
      siteNumber: omega.GLOBAL_SITE_NUMBER,
      page: 0,
      limit: 1,
      expandSecondaryLocations: false,
    }),
    omega.buildSearchUrl({
      siteNumber: omega.INDIA_SITE_NUMBER,
      page: 0,
      limit: 1,
      expandSecondaryLocations: false,
    }),
  ])
  assert.deepEqual(jobs, [])
})

test('Omega Healthcare normalizes Oracle Cloud India listings when openings exist on the verified board', async () => {
  const omega = await import('../../scraper/omegahealthcaremanagementservices/script.js')
  const requestedJsonUrls = []

  const listings = omega.extractSearchResults(listingPayload, {
    siteNumber: omega.GLOBAL_SITE_NUMBER,
  })
  assert.deepEqual(listings, [{
    title: 'Senior Analyst - Revenue Cycle',
    company: 'Omega Healthcare Management Services',
    department: 'Revenue Cycle',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '10001',
    requisitionId: '10001',
    sourceUrl: 'https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/10001',
    applyUrl: 'https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/10001',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: 'Bachelor Degree',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-08',
    closingDate: '2026-08-08',
    jobDescription: 'Support provider revenue-cycle programs for Omega Healthcare.',
    siteNumber: 'CX_1001',
  }])

  assert.deepEqual(omega.extractJobDetail(detailPayload, listings[0]), {
    title: 'Senior Analyst - Revenue Cycle',
    company: 'Omega Healthcare Management Services',
    department: 'Revenue Cycle',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '10001',
    requisitionId: '10001',
    sourceUrl: 'https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/10001',
    applyUrl: 'https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/10001',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: 'Bachelor Degree',
    preferredQualification: null,
    requiredSkills: [
      'AR follow-up',
      'Denial management',
    ],
    postingDate: '2026-07-08',
    closingDate: '2026-08-08',
    jobDescription: 'Lead AR follow-up and denial management for payer accounts. Revenue cycle experience Healthcare domain knowledge',
    siteNumber: 'CX_1001',
  })

  const jobs = await omega.createOmegaHealthcareManagementServicesScraper({
    fetchText: async (url) => {
      if (url === omega.GLOBAL_CAREERS_URL) return officialGlobalCareersHtml
      if (url === omega.INDIA_CAREERS_URL) return officialIndiaCareersHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === omega.buildSearchUrl({
        siteNumber: omega.GLOBAL_SITE_NUMBER,
        page: 0,
        limit: 1,
        expandSecondaryLocations: false,
      })) {
        return {
          items: [{
            TotalJobsCount: 1,
            Limit: 1,
            requisitionList: [],
          }],
        }
      }
      if (url === omega.buildSearchUrl({ siteNumber: omega.GLOBAL_SITE_NUMBER, page: 0 })) {
        return listingPayload
      }
      if (url === omega.buildJobDetailApiUrl(omega.GLOBAL_SITE_NUMBER, '10001')) {
        return detailPayload
      }
      if (url === omega.buildSearchUrl({
        siteNumber: omega.INDIA_SITE_NUMBER,
        page: 0,
        limit: 1,
        expandSecondaryLocations: false,
      })) {
        return zeroOpeningsPayload
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedJsonUrls, [
    omega.buildSearchUrl({
      siteNumber: omega.GLOBAL_SITE_NUMBER,
      page: 0,
      limit: 1,
      expandSecondaryLocations: false,
    }),
    omega.buildSearchUrl({ siteNumber: omega.GLOBAL_SITE_NUMBER, page: 0 }),
    omega.buildJobDetailApiUrl(omega.GLOBAL_SITE_NUMBER, '10001'),
    omega.buildSearchUrl({
      siteNumber: omega.INDIA_SITE_NUMBER,
      page: 0,
      limit: 1,
      expandSecondaryLocations: false,
    }),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Omega Healthcare Management Services')
  assert.equal(jobs[0].source, 'omegahealthcaremanagementservices')
  assert.equal(jobs[0].city, 'Bengaluru')
  assert.equal(
    jobs[0].applyUrl,
    'https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/10001',
  )
})

test('Omega Healthcare fails closed when the verified India careers handoff changes', async () => {
  const omega = await import('../../scraper/omegahealthcaremanagementservices/script.js')

  await assert.rejects(
    omega.createOmegaHealthcareManagementServicesScraper({
      fetchText: async (url) => {
        if (url === omega.GLOBAL_CAREERS_URL) return officialGlobalCareersHtml
        return '<html><title>Unexpected</title></html>'
      },
      fetchJson: async () => zeroOpeningsPayload,
    }).run(),
    /Omega Healthcare India careers page changed/i,
  )
})
