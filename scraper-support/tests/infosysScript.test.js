import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildApplyUrl,
  buildDetailApiUrl,
  buildDetailUrl,
  buildSearchApiUrl,
  extractJobDetail,
  extractSearchResults,
  formatExperienceRange,
} from '../../scraper/infosys/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'infosys',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchApiUrl keeps Infosys listings on the official public careers search endpoint', () => {
  assert.equal(
    buildSearchApiUrl(),
    'https://intapgateway.infosysapps.com/careersci/search/intapjbsrch/getCareerSearchJobs?sourceId=1%2C21&searchText=ALL',
  )
  assert.equal(
    buildSearchApiUrl('1', 'Cyber Security'),
    'https://intapgateway.infosysapps.com/careersci/search/intapjbsrch/getCareerSearchJobs?sourceId=1&searchText=Cyber+Security',
  )
})

test('formatExperienceRange converts Infosys numeric experience bounds into the shared scraper text format', () => {
  assert.equal(formatExperienceRange(2, 20), '2 - 20 years')
  assert.equal(formatExperienceRange(0, 1), '0 - 1 years')
  assert.equal(formatExperienceRange(null, null), null)
})

test('extractSearchResults parses Infosys public search payloads and keeps only India jobs', () => {
  const payload = readJsonFixture('search-results.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'IT Consulting',
    company: 'Infosys Limited',
    department: 'Cyber Security',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '245892',
    requisitionId: '247719',
    referenceCode: 'INFSYS-EXTERNAL-247719',
    sourceId: 1,
    sourceUrl: 'https://career.infosys.com/jobdesc?jobReferenceCode=INFSYS-EXTERNAL-247719',
    applyUrl: 'https://career.infosys.com/jobapply?jobReferenceCode=INFSYS-EXTERNAL-247719&sourceId=1',
    employmentType: 'Full-time',
    experienceRequired: '2 - 20 years',
    publicExperienceChecked: true,
    minimumQualification: 'Master Of Engineering, MCA, MSc, MTech, Bachelor of Engineering, BCA, BSc, BTech',
    preferredQualification: null,
    requiredSkills: ['Sailpoint IIQ', 'Entra ID', 'RSA DLP'],
    postingDate: '2026-06-26T09:43:38.945',
    closingDate: '2026-09-30T00:00:00',
    jobDescription:
      'A day in the life of an Infoscion Ability to work with clients to identify business challenges and contribute to client deliverables. Primary Skills: 1. Azure AD Entra ID 2. Sailpoint 3. DLP/ PKI',
  })

  assert.equal(jobs[1].title, 'Graduate Java Developer')
  assert.equal(jobs[1].experienceRequired, '0 - 1 years')
  assert.equal(jobs[1].publicExperienceChecked, true)
  assert.equal(jobs[1].location, 'Pune, India')
})

test('extractJobDetail builds a richer Infosys detail record from the public job description endpoint', () => {
  const detailPayload = readJsonFixture('job-detail-247719.json')
  const detail = extractJobDetail(detailPayload)

  assert.deepEqual(detail, {
    title: 'IT Consulting',
    company: 'Infosys Limited',
    department: 'Cyber Security',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '245892',
    requisitionId: '247719',
    referenceCode: 'INFSYS-EXTERNAL-247719',
    sourceId: 1,
    sourceUrl: 'https://career.infosys.com/jobdesc?jobReferenceCode=INFSYS-EXTERNAL-247719',
    applyUrl: 'https://career.infosys.com/jobapply?jobReferenceCode=INFSYS-EXTERNAL-247719&sourceId=1',
    employmentType: 'Full-time',
    experienceRequired: '2 - 20 years',
    publicExperienceChecked: true,
    minimumQualification: 'Bachelor of Engineering, BTech, BSc, BCA, Master Of Engineering, MTech, MSc, MCA',
    preferredQualification: null,
    requiredSkills: ['RSA DLP', 'Entra ID', 'Sailpoint IIQ'],
    postingDate: '2026-06-26T09:43:38.945218',
    closingDate: null,
    jobDescription:
      'A day in the life of an Infoscion Ability to work with clients to identify business challenges and contribute to client deliverables. Primary Skills: 1. Azure AD Entra ID 2. Sailpoint 3. DLP/ PKI',
  })
})

test('buildDetailApiUrl and public route builders keep Infosys links stable for detail and apply actions', () => {
  assert.equal(
    buildDetailApiUrl('INFSYS-EXTERNAL-247719'),
    'https://intapgateway.infosysapps.com/careersci/search/intapjbsrch/getJobDesc?referenceCode=INFSYS-EXTERNAL-247719',
  )
  assert.equal(
    buildDetailUrl('INFSYS-EXTERNAL-247719'),
    'https://career.infosys.com/jobdesc?jobReferenceCode=INFSYS-EXTERNAL-247719',
  )
  assert.equal(
    buildApplyUrl('INFSYS-EXTERNAL-247719', 21),
    'https://career.infosys.com/jobapply?jobReferenceCode=INFSYS-EXTERNAL-247719&sourceId=21',
  )
})
