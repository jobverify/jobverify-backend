import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildJobDetailUrl,
  buildSearchPayload,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
} from '../../scraper/coforge/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'coforge',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchPayload keeps Coforge searches on the public Zwayam careers contract', () => {
  assert.deepEqual(buildSearchPayload(), {
    filterCri: JSON.stringify({
      paginationStartNo: 0,
      selectedCall: 'sort',
      sortCriteria: {
        name: 'modifiedDate',
        isAscending: false,
      },
      anyOfTheseWords: '',
    }),
    domain: 'careers.coforge.com',
    companyId: 'MTUxNzM=',
  })

  assert.deepEqual(buildSearchPayload({ page: 2, keywords: 'sap' }), {
    filterCri: JSON.stringify({
      paginationStartNo: 10,
      selectedCall: 'sort',
      sortCriteria: {
        name: 'modifiedDate',
        isAscending: false,
      },
      anyOfTheseWords: 'sap',
    }),
    domain: 'careers.coforge.com',
    companyId: 'MTUxNzM=',
  })
})

test('buildJobDetailUrl keeps Coforge detail links on the public careers route', () => {
  assert.equal(
    buildJobDetailUrl('senior-technical-lead-hyderabad-2026021819113931'),
    'https://careers.coforge.com/coforge/jobview/senior-technical-lead-hyderabad-2026021819113931',
  )
})

test('extractSearchResults keeps only India jobs from Coforge Zwayam search responses', () => {
  const payload = readJsonFixture('search-results.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'TECHNICAL LEAD',
    company: 'Coforge',
    department: 'India FTE',
    location: 'Hyderabad',
    city: 'Hyderabad',
    jobId: '108839',
    requisitionId: '275866',
    sourceUrl: 'https://careers.coforge.com/coforge/jobview/senior-technical-lead-hyderabad-2026021819113931',
    applyUrl: 'https://careers.coforge.com/coforge/jobview/senior-technical-lead-hyderabad-2026021819113931',
    employmentType: null,
    experienceRequired: '5-7 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['SAP C4C', 'BI'],
    postingDate: '2026-02-18',
    closingDate: null,
    jobDescription: 'Skill set 1 Design, Development and Deployment Design, Development and Deployment of User Stories as per the Sprint Plan',
  })
})

test('extractPaginationSummary reads Coforge page sizes from the careers search response', () => {
  const payload = readJsonFixture('search-results.json')

  assert.deepEqual(extractPaginationSummary(payload), {
    hasNext: true,
    pageSize: 10,
    nextOffset: 10,
    totalCount: 77,
  })
})

test('extractJobDetail reads Coforge detail fields, skills, and plain-text descriptions', () => {
  const payload = readJsonFixture('job-detail-108839.json')
  const detail = extractJobDetail(payload, {
    title: 'TECHNICAL LEAD',
    department: 'India FTE',
    location: 'Hyderabad',
    city: 'Hyderabad',
    jobId: '108839',
    requisitionId: '275866',
    sourceUrl: 'https://careers.coforge.com/coforge/jobview/senior-technical-lead-hyderabad-2026021819113931',
  })

  assert.equal(detail.title, 'TECHNICAL LEAD')
  assert.equal(detail.department, 'India FTE')
  assert.equal(detail.location, 'Hyderabad')
  assert.equal(detail.city, 'Hyderabad')
  assert.equal(detail.jobId, '108839')
  assert.equal(detail.requisitionId, '275866')
  assert.equal(detail.employmentType, 'TECHNICAL LEAD')
  assert.equal(detail.experienceRequired, '5-7 years')
  assert.equal(detail.minimumQualification, null)
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, ['SAP C4C', 'BI'])
  assert.equal(detail.postingDate, '2026-02-18')
  assert.equal(detail.closingDate, null)
  assert.equal(
    detail.applyUrl,
    'https://careers.coforge.com/coforge/jobview/senior-technical-lead-hyderabad-2026021819113931',
  )
  assert.equal(
    detail.sourceUrl,
    'https://careers.coforge.com/coforge/jobview/senior-technical-lead-hyderabad-2026021819113931',
  )
  assert.match(detail.jobDescription, /Design, Development and Deployment/i)
  assert.match(detail.jobDescription, /SAP C4C/i)
  assert.match(detail.jobDescription, /project management/i)
})
