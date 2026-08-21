import assert from 'node:assert/strict'
import test from 'node:test'

const searchPayload = {
  items: [{
    Limit: 24,
    TotalJobsCount: 479,
    requisitionList: [
      {
        Id: '1000093',
        Title: 'Software Engineer',
        Department: 'Engineering',
        PrimaryLocation: 'India',
        PrimaryLocationCountry: 'IN',
        PostedDate: '2026-07-08',
        StudyLevel: "Bachelor's Degree",
        ShortDescriptionStr: 'Build smart electrical products and platform features.',
        secondaryLocations: [
          {
            Name: 'Bengaluru, Karnataka, India',
            CountryCode: 'IN',
          },
        ],
      },
      {
        Id: '1000999',
        Title: 'Outside India Role',
        Department: 'Engineering',
        PrimaryLocation: 'Dubai, United Arab Emirates',
        PrimaryLocationCountry: 'AE',
        PostedDate: '2026-07-08',
        ShortDescriptionStr: 'This role should be filtered out.',
        secondaryLocations: [],
      },
    ],
  }],
}

const detailPayload = {
  items: [{
    Id: '1000093',
    Title: 'Software Engineer',
    Department: 'Engineering',
    RequisitionType: 'Regular',
    JobSchedule: 'Full time',
    PrimaryLocation: 'India',
    PrimaryLocationCountry: 'IN',
    ExternalPostedStartDate: '2026-07-08T00:00:00+00:00',
    ExternalPostedEndDate: '2026-08-08T00:00:00+00:00',
    StudyLevel: "Bachelor's Degree",
    ExternalDescriptionStr: '<p>Build smart electrical products and platform features.</p>',
    ExternalResponsibilitiesStr: '<ul><li>Ship APIs</li><li>Maintain services</li></ul>',
    ExternalQualificationsStr: '<p>JavaScript and distributed systems.</p>',
    secondaryLocations: [
      {
        Name: 'Bengaluru, Karnataka, India',
        CountryCode: 'IN',
      },
    ],
    skills: [
      { Skill: 'JavaScript' },
      { Skill: 'Distributed Systems' },
    ],
  }],
}

test('Havells scraper normalizes India Oracle CE requisitions and enriches them end to end', async () => {
  const havells = await import('../../scraper/havells/script.js')
  const requestedUrls = []

  assert.equal(
    havells.LISTING_API_BASE_URL,
    'https://iabgcp.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    havells.DETAIL_API_BASE_URL,
    'https://iabgcp.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    havells.PUBLIC_JOBS_BASE_URL,
    'https://iabgcp.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  )
  assert.equal(havells.SITE_NUMBER, 'CX_1')
  assert.equal(typeof havells.extractSearchResults, 'function')
  assert.equal(typeof havells.extractJobDetail, 'function')
  assert.equal(typeof havells.createHavellsScraper, 'function')
  assert.equal(typeof havells.run, 'function')

  assert.equal(
    havells.buildSearchUrl(),
    'https://iabgcp.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    havells.buildJobDetailUrl('1000093'),
    'https://iabgcp.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/1000093',
  )

  const listings = havells.extractSearchResults(searchPayload)
  assert.deepEqual(listings, [{
    title: 'Software Engineer',
    company: 'Havells',
    department: 'Engineering',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '1000093',
    requisitionId: '1000093',
    sourceUrl: 'https://iabgcp.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/1000093',
    applyUrl: 'https://iabgcp.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/1000093',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: "Bachelor's Degree",
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-08',
    closingDate: null,
    jobDescription: 'Build smart electrical products and platform features.',
  }])

  const detail = havells.extractJobDetail(detailPayload, listings[0])
  assert.equal(detail.title, 'Software Engineer')
  assert.equal(detail.location, 'Bengaluru, Karnataka, India')
  assert.equal(detail.city, 'Bengaluru')
  assert.equal(detail.employmentType, 'Full time')
  assert.equal(detail.minimumQualification, "Bachelor's Degree")
  assert.deepEqual(detail.requiredSkills, ['JavaScript', 'Distributed Systems'])
  assert.equal(detail.postingDate, '2026-07-08')
  assert.equal(detail.closingDate, '2026-08-08')
  assert.match(detail.jobDescription, /Build smart electrical products/i)
  assert.match(detail.jobDescription, /Ship APIs/i)
  assert.match(detail.jobDescription, /Maintain services/i)

  const jobs = await havells.createHavellsScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === havells.buildSearchUrl({ page: 0 })) return searchPayload
      if (url === `${havells.DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${listings[0].jobId}%22,siteNumber=CX_1`) {
        return detailPayload
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedUrls, [
    havells.buildSearchUrl({ page: 0 }),
    `${havells.DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${listings[0].jobId}%22,siteNumber=CX_1`,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'havells')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(jobs[0].title, 'Software Engineer')
})

test('Havells returns no jobs when the verified listing endpoint is temporarily unavailable with a 503 outage', async () => {
  const havells = await import('../../scraper/havells/script.js')
  const requestedUrls = []

  const jobs = await havells.createHavellsScraper({
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (url === havells.buildSearchUrl({ page: 0 })) {
        throw new Error(`HTTP 503 for ${url}`)
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedUrls, [havells.buildSearchUrl({ page: 0 })])
  assert.deepEqual(jobs, [])
})
