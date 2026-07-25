import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_ORIGIN,
  JOBS_API_URL,
  extractSearchResults,
  run,
} from './script.js'

const payload = {
  totalRecords: 2,
  response: [
    {
      organizationUnitComplete: 'Amara Raja Group>Amara Raja Energy & Mobility Limited>Automotive Batteries',
      organizationUnit: 'Amara Raja Energy & Mobility Limited',
      jobTitle: 'Manager - Battery Technology',
      jobCode: 'P-9001',
      requisitionId: 19001,
      jobPostedDate: '2026-07-01',
      jobClosureDate: '2026-08-01',
      locationHierarchy: 'Tirupati',
      expRange: '8-12 years',
      skills: { mustTohave: ['Battery Testing'], goodtohave: ['Lithium-ion'] },
      jobDetailUrl: `${CAREERS_ORIGIN}/job/detail/P-9001`,
    },
    {
      organizationUnitComplete: 'Amara Raja Group>Mangal Industries Limited>Operations',
      organizationUnit: 'Mangal Industries Limited',
      jobTitle: 'Engineer - Buyer',
      jobCode: 'P-9002',
      requisitionId: 19002,
      locationHierarchy: 'Chittoor',
      jobDetailUrl: `${CAREERS_ORIGIN}/job/detail/P-9002`,
    },
  ],
}

test('extractSearchResults keeps only Amara Raja Energy & Mobility jobs and maps fields', () => {
  assert.deepEqual(extractSearchResults(payload), [{
    title: 'Manager - Battery Technology',
    company: 'Amara Raja Energy & Mobility Ltd',
    department: 'Amara Raja Energy & Mobility Limited',
    location: 'Tirupati',
    city: 'Tirupati',
    jobId: 'P-9001',
    requisitionId: '19001',
    sourceUrl: `${CAREERS_ORIGIN}/job/detail/P-9001`,
    applyUrl: `${CAREERS_ORIGIN}/job/detail/P-9001`,
    employmentType: null,
    experienceRequired: '8-12 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Battery Testing', 'Lithium-ion'],
    postingDate: '2026-07-01',
    closingDate: '2026-08-01',
    jobDescription: null,
  }])
})

test('run posts to the official public jobs endpoint and adds scraper metadata', async () => {
  const requests = []
  const jobs = await run({
    fetchJson: async (url, options) => {
      requests.push({ url, options })
      return payload
    },
    maxPages: 1,
  })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, JOBS_API_URL)
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(JSON.parse(requests[0].options.body).offset, 0)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'amararajaenergymobility')
  assert.equal(jobs[0].link, `${CAREERS_ORIGIN}/job/detail/P-9001`)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
