import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  JOBS_API_URL,
  buildJobDetailUrl,
  extractJobs,
} from '../aakash/script.js'

const listingPayload = {
  status: 200,
  message: 'RFR List',
  data: [
    {
      id: 73,
      rfr_id: '1_RFR_73',
      skills_List: [
        { Id: 3, Name: 'Problem Solving' },
      ],
      other_skills: [],
      roleDetails: {
        ROLE_NAME: 'Student Support & Admission Officer',
      },
      locmast_details: {
        LOC_NAME: 'Pan India',
      },
      job_description: JSON.stringify({
        blocks: [
          {
            text: 'As an SSAO, you are expected to:',
          },
          {
            text: 'Contribute towards revenue generation by working on the sales targets.',
          },
          {
            text: 'Ensure a smooth student journey from start to end at Aakash Institute.',
          },
        ],
        entityMap: {},
      }),
      maximum_experience: '7-0',
      minimum_experience: '1-0',
      openings: 50,
      qualification: [
        { Qual_Name: 'Any graduate' },
      ],
      published_date: '2026-03-31T18:30:00.000Z',
      functmast_details: {
        FUNCT_NAME: 'Sales & Marketing',
      },
      subfunctmast_details: {
        SubFunct_NAME: 'Counselling',
      },
      bussmast_details: {
        BussName: 'Class Room',
      },
      worklocmast_details: {
        WLOC_NAME: 'Pan India',
      },
      dsgmast_designation_details: {
        DSG_NAME: 'Senior Executive',
      },
      subBussmast_details: {
        subBussName: 'Non Academics',
      },
    },
    {
      id: 170,
      rfr_id: '3_RFR_170',
      skills_List: [
        { Id: 2, Name: 'Strong Communication' },
      ],
      other_skills: ['Teaching'],
      roleDetails: {
        ROLE_NAME: 'Faculty',
      },
      locmast_details: {
        LOC_NAME: 'Pan India',
      },
      job_description: JSON.stringify({
        blocks: [
          {
            text: 'Essential Duties and Responsibilities:',
          },
          {
            text: 'Taking classes at Aakash Centres, where the company gives posting.',
          },
        ],
        entityMap: {},
      }),
      maximum_experience: '20-6',
      minimum_experience: '2-0',
      openings: 1,
      qualification: [
        { Qual_Name: 'Any Post graduate' },
      ],
      published_date: '2025-11-07T06:19:37.996Z',
      functmast_details: {
        FUNCT_NAME: 'Foundations',
      },
      subfunctmast_details: {
        SubFunct_NAME: 'Chemistry',
      },
      bussmast_details: {
        BussName: 'Class Room',
      },
      worklocmast_details: {
        WLOC_NAME: 'Pan India',
      },
      dsgmast_designation_details: {
        DSG_NAME: 'NA',
      },
      subBussmast_details: {
        subBussName: 'Academics',
      },
    },
  ],
}

test('Aakash constants keep the scraper pointed at the official Hono careers portal', () => {
  assert.equal(CAREER_PAGE_URL, 'https://hrconnect.hono.ai/react/career/jobs')
  assert.equal(JOBS_API_URL, 'https://hrconnect.hono.ai/nodejs/getRFRListOnCandidatePortal')
})

test('buildJobDetailUrl keeps Aakash job links on the official candidate portal route', () => {
  assert.equal(
    buildJobDetailUrl('1_RFR_73'),
    'https://hrconnect.hono.ai/react/career/jobs/1_RFR_73',
  )
})

test('extractJobs normalizes Aakash Hono careers payloads into scraper jobs', () => {
  const jobs = extractJobs(listingPayload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
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
    requiredSkills: ['Problem Solving'],
    postingDate: '2026-03-31',
    closingDate: null,
    jobDescription: 'As an SSAO, you are expected to: Contribute towards revenue generation by working on the sales targets. Ensure a smooth student journey from start to end at Aakash Institute.',
  })

  assert.equal(jobs[1].title, 'Faculty')
  assert.equal(jobs[1].department, 'Foundations')
  assert.equal(jobs[1].location, 'Pan India')
  assert.equal(jobs[1].jobId, '3_RFR_170')
  assert.equal(jobs[1].requisitionId, '170')
  assert.equal(jobs[1].employmentType, null)
  assert.equal(jobs[1].experienceRequired, '2-20.5 years')
  assert.equal(jobs[1].minimumQualification, 'Any Post graduate')
  assert.deepEqual(jobs[1].requiredSkills, ['Strong Communication', 'Teaching'])
  assert.equal(jobs[1].postingDate, '2025-11-07')
  assert.match(jobs[1].jobDescription, /Taking classes at Aakash Centres/i)
})
