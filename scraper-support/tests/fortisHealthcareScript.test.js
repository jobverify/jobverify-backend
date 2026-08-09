import assert from 'node:assert/strict'
import test from 'node:test'

import { extractJobDetail } from '../../scraper/fortishealthcare/script.js'

test('extractJobDetail marks verified Fortis Oracle detail records as public experience checked', () => {
  const detail = extractJobDetail({
    items: [{
      Id: '12071',
      Title: 'Pharmacist',
      PrimaryLocation: 'Mohali, Punjab, India',
      JobSchedule: 'Full time',
      Department: 'Pharmacy',
      ExternalDescriptionStr: '<p>Dispense prescribed medicines and counsel patients.</p>',
      ExternalResponsibilitiesStr: '<p>Maintain compliance with pharmacy protocols.</p>',
      PostedDate: '2026-07-30',
    }],
  }, {
    title: 'Pharmacist',
    location: 'Mohali, Punjab, India',
    city: 'Mohali',
    jobId: '12071',
    requisitionId: '12071',
    sourceUrl: 'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12071',
    applyUrl: 'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12071',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-30',
    closingDate: null,
    jobDescription: null,
    remoteStatus: null,
  })

  assert.equal(detail.title, 'Pharmacist')
  assert.equal(detail.experienceRequired, null)
  assert.equal(detail.publicExperienceChecked, true)
  assert.match(detail.jobDescription || '', /Dispense prescribed medicines/i)
})
