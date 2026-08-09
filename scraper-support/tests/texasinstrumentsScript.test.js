import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildJobDetailUrl,
  buildSearchUrl,
  extractSearchResults,
} from '../../scraper/texasinstruments/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'texasinstruments',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchUrl keeps TI searches on its public Oracle Cloud finder with India scoping', () => {
  assert.equal(
    buildSearchUrl(),
    'https://edbz.fa.us2.oraclecloud.com:443/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX,limit=24,offset=0,location=India',
  )
  assert.equal(
    buildSearchUrl({ page: 2, limit: 10, location: 'Bengaluru, India' }),
    'https://edbz.fa.us2.oraclecloud.com:443/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX,limit=10,offset=20,location=Bengaluru, India',
  )
})

test('buildJobDetailUrl keeps TI detail links on its public Oracle Cloud careers route', () => {
  assert.equal(
    buildJobDetailUrl('25003421'),
    'https://edbz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/25003421/',
  )
})

test('extractSearchResults normalizes TI Oracle Cloud requisitions and keeps only India jobs', () => {
  const jobs = extractSearchResults(readJsonFixture('search-results.json'))

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Applications Engineer',
    company: 'Texas Instruments',
    department: 'Engineering',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '25003421',
    requisitionId: '25003421',
    sourceUrl: 'https://edbz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/25003421/',
    applyUrl: 'https://edbz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/25003421/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: "Bachelor's degree in Electrical Engineering",
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-01',
    closingDate: null,
    jobDescription: 'Develop customer-focused analog and embedded solutions. Collaborate with customers and field teams to solve technical problems.',
  })
})
