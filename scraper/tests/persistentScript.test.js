import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildJobDetailUrl,
  buildSearchPayload,
  createPersistentScraper,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
} from '../persistent/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'persistent',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchPayload keeps Persistent searches on the public Zwayam careers contract', () => {
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
    domain: 'careers.persistent.com',
    companyId: 'MTQ5Nzc=',
  })

  assert.deepEqual(buildSearchPayload({ page: 2, keywords: 'denodo' }), {
    filterCri: JSON.stringify({
      paginationStartNo: 9,
      selectedCall: 'sort',
      sortCriteria: {
        name: 'modifiedDate',
        isAscending: false,
      },
      anyOfTheseWords: 'denodo',
    }),
    domain: 'careers.persistent.com',
    companyId: 'MTQ5Nzc=',
  })
})

test('buildJobDetailUrl keeps Persistent detail links on the public careers route', () => {
  assert.equal(
    buildJobDetailUrl('business-analyst-india-bengaluru-2026052916163278'),
    'https://careers.persistent.com/jobview/business-analyst-india-bengaluru-2026052916163278',
  )
})

test('extractSearchResults keeps only India jobs from Persistent Zwayam search responses', () => {
  const payload = readJsonFixture('search-results.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Denodo Business Analyst',
    company: 'Persistent Systems',
    department: 'Data_Int_ CRO 1',
    location: 'Bengaluru / Pune',
    city: 'Bengaluru',
    jobId: '178137',
    requisitionId: 'PSL216732_1-172-1',
    sourceUrl: 'https://careers.persistent.com/jobview/business-analyst-india-bengaluru-2026052916163278',
    applyUrl: 'https://careers.persistent.com/jobview/business-analyst-india-bengaluru-2026052916163278',
    employmentType: null,
    experienceRequired: '4-12 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Business Analysis', 'Denodo', 'Data Analysis'],
    postingDate: '2026-05-29',
    closingDate: null,
    jobDescription:
      'Role - Business Analyst Key Responsibilities - Business analysis with Denodo and Data Analysis experience',
  })
})

test('extractPaginationSummary reads Persistent page sizes from the careers search response', () => {
  const payload = readJsonFixture('search-results.json')

  assert.deepEqual(extractPaginationSummary(payload), {
    hasNext: true,
    pageSize: 9,
    nextOffset: 9,
    totalCount: 690,
  })
})

test('extractJobDetail reads Persistent detail fields, skills, and HTML descriptions', () => {
  const payload = readJsonFixture('job-detail-178137.json')
  const detail = extractJobDetail(payload, {
    title: 'Denodo Business Analyst',
    department: 'Data_Int_ CRO 1',
    location: 'Bengaluru / Pune',
    city: 'Bengaluru',
    jobId: '178137',
    requisitionId: 'PSL216732_1-172-1',
    sourceUrl: 'https://careers.persistent.com/jobview/business-analyst-india-bengaluru-2026052916163278',
  })

  assert.equal(detail.title, 'Denodo Business Analyst')
  assert.equal(detail.department, 'Data_Int_ CRO 1')
  assert.equal(detail.location, 'Bengaluru / Pune')
  assert.equal(detail.city, 'Bengaluru')
  assert.equal(detail.jobId, '178137')
  assert.equal(detail.requisitionId, 'PSL216732_1-172-1')
  assert.equal(detail.employmentType, 'Full Time Employment')
  assert.equal(detail.experienceRequired, '4-12 years')
  assert.equal(detail.minimumQualification, null)
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, [
    'Business Analysis',
    'Denodo',
    'Data Analysis',
  ])
  assert.equal(detail.postingDate, '2026-05-29')
  assert.equal(detail.closingDate, null)
  assert.equal(
    detail.applyUrl,
    'https://careers.persistent.com/jobview/business-analyst-india-bengaluru-2026052916163278',
  )
  assert.equal(
    detail.sourceUrl,
    'https://careers.persistent.com/jobview/business-analyst-india-bengaluru-2026052916163278',
  )
  assert.match(detail.jobDescription, /Business Analyst responsible for leveraging Denodo/i)
  assert.match(detail.jobDescription, /Role: Denodo Business Analyst/i)
  assert.match(detail.jobDescription, /Benefits:/i)
})

test('run marks Persistent Zwayam 5xx responses as upstream soft failures', async () => {
  await assert.rejects(
    createPersistentScraper({
      fetchJsonImpl: async (url) => {
        throw new Error(`HTTP 503 for ${url}`)
      },
    }).run(),
    (error) => {
      assert.match(error.message, /HTTP 503/i)
      assert.equal(error.softFailure, true)
      assert.equal(error.upstreamOutage, true)
      return true
    },
  )
})
