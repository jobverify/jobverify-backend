import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildJobDetailUrl,
  buildSearchUrl,
  extractSearchResults,
} from '../../scraper/oracle/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'oracle',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchUrl keeps Oracle searches on the public Oracle Cloud careers finder with India scoping', () => {
  assert.equal(
    buildSearchUrl(),
    'https://eeho.fa.us2.oraclecloud.com:443/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_45001,limit=24,offset=0,location=India',
  )
  assert.equal(
    buildSearchUrl({ page: 2, limit: 10, location: 'Bengaluru, India' }),
    'https://eeho.fa.us2.oraclecloud.com:443/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_45001,limit=10,offset=20,location=Bengaluru, India',
  )
})

test('buildJobDetailUrl keeps Oracle detail links on the public careers route', () => {
  assert.equal(
    buildJobDetailUrl('337745'),
    'https://careers.oracle.com/en/sites/jobsearch/job/337745/',
  )
})

test('extractSearchResults normalizes Oracle Cloud requisitions and keeps only India jobs', () => {
  const payload = readJsonFixture('search-results.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Principal NetSuite Functional Consultant',
    company: 'Oracle',
    department: 'Consulting',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    jobId: '337745',
    requisitionId: '337745',
    sourceUrl: 'https://careers.oracle.com/en/sites/jobsearch/job/337745/',
    applyUrl: 'https://careers.oracle.com/en/sites/jobsearch/job/337745/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: 'Bachelor degree in Engineering or related field',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-24',
    closingDate: null,
    jobDescription:
      'Senior Principal Consultant - NetSuite ERP Implementation (Industrial Equipments) Lead global ERP transformation programs across finance, supply chain, inventory, procurement, and order management.',
  })
})
