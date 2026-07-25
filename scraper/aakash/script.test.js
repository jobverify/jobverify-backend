import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  JOBS_API_URL,
  buildJobDetailUrl,
  extractJobs,
} from './script.js'

const samplePayload = {
  data: [
    {
      id: 73,
      rfr_id: '1_RFR_73',
      skills_List: [{ Name: 'Problem Solving' }],
      other_skills: ['Communication'],
      roleDetails: { ROLE_NAME: 'Student Support & Admission Officer' },
      functmast_details: { FUNCT_NAME: 'Sales & Marketing' },
      worklocmast_details: { WLOC_NAME: 'Pan India' },
      dsgmast_designation_details: { DSG_NAME: 'Senior Executive' },
      minimum_experience: '1-0',
      maximum_experience: '7-0',
      qualification: [{ Qual_Name: 'Any graduate' }],
      published_date: '2026-03-31T18:30:00.000Z',
      job_description: JSON.stringify({
        blocks: [
          { text: 'As an SSAO, you are expected to:' },
          { text: 'Contribute towards revenue generation.' },
        ],
      }),
    },
  ],
}

test('Aakash scraper constants point to the public Hono careers endpoints', () => {
  assert.equal(CAREER_PAGE_URL, 'https://hrconnect.hono.ai/react/career/jobs')
  assert.equal(JOBS_API_URL, 'https://hrconnect.hono.ai/nodejs/getRFRListOnCandidatePortal')
  assert.equal(
    buildJobDetailUrl('1_RFR_73'),
    'https://hrconnect.hono.ai/react/career/jobs/1_RFR_73',
  )
})

test('extractJobs normalizes the Hono listing payload into shared scraper fields', () => {
  const [job] = extractJobs(samplePayload)

  assert.deepEqual(job, {
    title: 'Student Support & Admission Officer',
    company: 'Aakash',
    department: 'Sales & Marketing',
    location: 'Pan India',
    city: 'Pan India',
    jobId: '1_RFR_73',
    requisitionId: '73',
    sourceUrl: 'https://hrconnect.hono.ai/react/career/jobs/1_RFR_73',
    applyUrl: 'https://hrconnect.hono.ai/react/career/jobs/1_RFR_73',
    employmentType: 'Senior Executive',
    experienceRequired: '1-7 years',
    minimumQualification: 'Any graduate',
    preferredQualification: null,
    requiredSkills: ['Problem Solving', 'Communication'],
    postingDate: '2026-03-31',
    closingDate: null,
    jobDescription: 'As an SSAO, you are expected to: Contribute towards revenue generation.',
  })
})
