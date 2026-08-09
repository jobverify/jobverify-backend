import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJobDetailApiUrl,
  buildJobDetailUrl,
  buildSearchUrl,
  createOnsemiIndiaScraper,
  extractJobDetail,
  extractSearchResults,
} from './script.js'

test('onsemi India targets the verified first-party Oracle board', () => {
  assert.match(buildSearchUrl(), /hctz\.fa\.us2\.oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitions/)
  assert.match(buildSearchUrl(), /siteNumber=CX_1001/)
  assert.equal(buildJobDetailUrl('2505563'), 'https://hctz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/2505563')
  assert.equal(buildJobDetailApiUrl('2505563'), 'https://hctz.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%222505563%22,siteNumber=CX_1001')
})

test('onsemi India extracts only India requisitions and preserves public URLs', () => {
  const jobs = extractSearchResults({
    items: [{
      requisitionList: [
        { Id: '1', Title: 'India Engineer', PrimaryLocation: 'Bengaluru, Karnataka, India', PrimaryLocationCountry: 'IN' },
        { Id: '2', Title: 'US Engineer', PrimaryLocation: 'Phoenix, Arizona, United States', PrimaryLocationCountry: 'US' },
      ],
    }],
  })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'onsemi India')
  assert.equal(jobs[0].sourceUrl, buildJobDetailUrl('1'))
})

test('onsemi India extracts detail descriptions and qualification-based experience from Oracle detail payloads', () => {
  const detail = extractJobDetail({
    items: [{
      Id: '2505953',
      Title: 'Senior Design Verification Engineer',
      PrimaryLocation: 'Bengaluru, Karnataka, India',
      PrimaryLocationCountry: 'IN',
      JobSchedule: 'Full-time',
      StudyLevel: 'Bachelors',
      ExternalDescriptionStr: '<p>We are looking to expand our team with a Senior Digital IC Verification Engineer.</p>',
      ExternalResponsibilitiesStr: '<ul><li>Define the verification strategy for blocks and systems.</li></ul>',
      ExternalQualificationsStr: [
        '<p><strong>Qualifications</strong></p>',
        '<ul>',
        '<li>Minimum BS/MS in Electrical Engineering or related technical field</li>',
        '<li>Minimum 3 years of digital verification experience</li>',
        '</ul>',
      ].join(''),
    }],
  }, {
    title: 'Senior Design Verification Engineer',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '2505953',
    requisitionId: '2505953',
    sourceUrl: buildJobDetailUrl('2505953'),
    applyUrl: buildJobDetailUrl('2505953'),
    employmentType: 'Full-time',
    jobDescription: 'Short summary from listing',
  })

  assert.equal(detail.minimumQualification, 'Minimum BS/MS in Electrical Engineering or related technical field')
  assert.equal(detail.experienceRequired, 'Minimum 3 years of digital verification experience')
  assert.match(detail.jobDescription, /Senior Digital IC Verification Engineer/)
  assert.match(detail.jobDescription, /Minimum 3 years of digital verification experience/)
})

test('onsemi India paginates the official finder until its reported total', async () => {
  const calls = []
  const jobs = await createOnsemiIndiaScraper({
    fetchJson: async (url) => {
      calls.push(url)
      if (url.includes('recruitingCEJobRequisitionDetails')) {
        return {
          items: [{
            Id: String(calls.length - 1),
            Title: `India Engineer ${calls.length - 1}`,
            PrimaryLocation: 'Bengaluru, Karnataka, India',
            PrimaryLocationCountry: 'IN',
            ExternalDescriptionStr: '<p>Detailed role summary</p>',
            ExternalQualificationsStr: '<ul><li>Minimum 3 years of verification experience</li></ul>',
          }],
        }
      }

      return {
        items: [{
          Limit: 1,
          TotalJobsCount: 2,
          requisitionList: [{
            Id: String(calls.length),
            Title: `India Engineer ${calls.length}`,
            PrimaryLocation: 'Bengaluru, Karnataka, India',
            PrimaryLocationCountry: 'IN',
          }],
        }],
      }
    },
  }).run()

  assert.equal(calls.length, 4)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].experienceRequired, 'Minimum 3 years of verification experience')
  assert.match(jobs[0].jobDescription, /Detailed role summary/)
})
