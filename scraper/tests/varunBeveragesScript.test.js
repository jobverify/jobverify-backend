import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJobDetailUrl,
  buildSearchUrl,
  createVarunBeveragesScraper,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
} from '../varunbeverages/script.js'

const searchPayload = {
  items: [
    {
      Limit: 24,
      TotalJobsCount: 31,
      requisitionList: [
        {
          Id: '2590',
          Title: 'Deputy Manager- Vendor Accounting- Material',
          PostedDate: '2026-07-09',
          PostingEndDate: null,
          PrimaryLocationCountry: 'IN',
          PrimaryLocation: 'Gurugram, Haryana, India',
          JobSchedule: 'Full time',
          StudyLevel: 'B.Com',
          ShortDescriptionStr: 'Purpose Statement Vendor Accounting Operations Team Leader.',
          ExternalResponsibilitiesStr: null,
          secondaryLocations: [],
        },
      ],
    },
  ],
}

const detailPayload = {
  items: [
    {
      Id: '2590',
      Title: 'Deputy Manager- Vendor Accounting- Material',
      PrimaryLocationCountry: 'IN',
      PrimaryLocation: 'Gurugram, Haryana, India',
      JobSchedule: 'Full time',
      StudyLevel: 'B.Com',
      Department: null,
      BusinessUnit: null,
      Organization: null,
      ExternalPostedStartDate: '2026-07-09T03:27:15+00:00',
      ExternalPostedEndDate: null,
      ShortDescriptionStr: 'Purpose Statement Vendor Accounting Operations Team Leader.',
      ExternalDescriptionStr: '<p><strong>Key Roles &amp; Responsibilities</strong></p><ul><li>Lead vendor accounting operations.</li></ul>',
      ExternalResponsibilitiesStr: null,
      ExternalQualificationsStr: null,
      skills: [],
      secondaryLocations: [],
    },
  ],
}

test('buildSearchUrl keeps Varun Beverages searches on the public Oracle Cloud careers finder with India scoping', () => {
  assert.equal(
    buildSearchUrl(),
    'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    buildSearchUrl({ page: 2, limit: 10, location: 'Gurugram, Haryana, India' }),
    'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=Gurugram, Haryana, India',
  )
})

test('buildJobDetailUrl keeps Varun Beverages detail links on the public Oracle careers route', () => {
  assert.equal(
    buildJobDetailUrl('2590'),
    'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/2590',
  )
})

test('extractSearchResults normalizes Varun Beverages Oracle Cloud requisitions', () => {
  const jobs = extractSearchResults(searchPayload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Deputy Manager- Vendor Accounting- Material',
    company: 'Varun Beverages ( Pepsi)',
    department: null,
    location: 'Gurugram, Haryana, India',
    city: 'Gurugram',
    jobId: '2590',
    requisitionId: '2590',
    sourceUrl: 'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/2590',
    applyUrl: 'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/2590',
    employmentType: 'Full time',
    experienceRequired: null,
    minimumQualification: 'B.Com',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09',
    closingDate: null,
    jobDescription: 'Purpose Statement Vendor Accounting Operations Team Leader.',
  })
})

test('extractPaginationSummary reads Varun Beverages next-page availability from the Oracle Cloud payload', () => {
  assert.deepEqual(extractPaginationSummary(searchPayload, { page: 0 }), {
    hasNext: true,
    pageSize: 24,
    nextOffset: 24,
    totalCount: 31,
  })
})

test('extractJobDetail reads Varun Beverages detail metadata and HTML descriptions', () => {
  const detail = extractJobDetail(detailPayload, {
    title: 'Deputy Manager- Vendor Accounting- Material',
    location: 'Gurugram, Haryana, India',
    city: 'Gurugram',
    jobId: '2590',
    requisitionId: '2590',
    sourceUrl: 'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/2590',
  })

  assert.equal(detail.title, 'Deputy Manager- Vendor Accounting- Material')
  assert.equal(detail.department, null)
  assert.equal(detail.location, 'Gurugram, Haryana, India')
  assert.equal(detail.city, 'Gurugram')
  assert.equal(detail.jobId, '2590')
  assert.equal(detail.requisitionId, '2590')
  assert.equal(detail.employmentType, 'Full time')
  assert.equal(detail.experienceRequired, null)
  assert.equal(detail.minimumQualification, 'B.Com')
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, [])
  assert.equal(detail.postingDate, '2026-07-09')
  assert.equal(detail.closingDate, null)
  assert.equal(
    detail.applyUrl,
    'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/2590',
  )
  assert.equal(
    detail.sourceUrl,
    'https://rjcorphcm-iacbiz.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/2590',
  )
  assert.match(detail.jobDescription, /Key Roles & Responsibilities/i)
  assert.match(detail.jobDescription, /Lead vendor accounting operations/i)
})

test('run enriches Varun Beverages listings with detail data and preserves runner contract', async () => {
  const requestedUrls = []

  const jobs = await createVarunBeveragesScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === buildSearchUrl({ page: 0 })) return searchPayload
      if (url.includes('recruitingCEJobRequisitionDetails')) return detailPayload
      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run()

  assert.equal(requestedUrls.length, 2)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'varunbeverages')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(jobs[0].location, 'Gurugram, Haryana, India')
})
