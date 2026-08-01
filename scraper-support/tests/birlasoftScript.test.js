import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildApplyUrl,
  buildJobDetailUrl,
  buildSearchUrl,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
} from '../../scraper/birlasoft/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'birlasoft',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchUrl keeps Birlasoft listings on the public India search route', () => {
  assert.equal(
    buildSearchUrl(),
    'https://jobs.birlasoft.com/go/India/684744/?q=&sortColumn=referencedate&sortDirection=desc',
  )
  assert.equal(
    buildSearchUrl({ page: 2 }),
    'https://jobs.birlasoft.com/go/India/684744/25/?q=&sortColumn=referencedate&sortDirection=desc',
  )
})

test('buildJobDetailUrl and buildApplyUrl keep Birlasoft links on the public SuccessFactors routes', () => {
  assert.equal(
    buildJobDetailUrl('/job/Pune-Oracle-SCM-Odermanagement-INDI/54516844/'),
    'https://jobs.birlasoft.com/job/Pune-Oracle-SCM-Odermanagement-INDI/54516844/',
  )
  assert.equal(
    buildApplyUrl('54516844'),
    'https://jobs.birlasoft.com/talentcommunity/apply/54516844/?locale=en_US&jobID=54516844#tracked',
  )
})

test('extractSearchResults keeps Birlasoft India jobs from the public listing page and normalizes their cities', () => {
  const html = readFixture('search-india-page-1.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Oracle SCM Odermanagement',
    company: 'Birlasoft',
    department: null,
    location: 'Pune, India',
    city: 'Pune',
    jobId: '54516844',
    requisitionId: '54516844',
    sourceUrl: 'https://jobs.birlasoft.com/job/Pune-Oracle-SCM-Odermanagement-INDI/54516844/',
    applyUrl: 'https://jobs.birlasoft.com/talentcommunity/apply/54516844/?locale=en_US&jobID=54516844#tracked',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-27',
    closingDate: null,
    jobDescription: null,
  })
  assert.deepEqual(jobs[1], {
    title: 'SAP BASIS LEAD',
    company: 'Birlasoft',
    department: null,
    location: 'Noida, India',
    city: 'Noida',
    jobId: '54523644',
    requisitionId: '54523644',
    sourceUrl: 'https://jobs.birlasoft.com/job/Noida-SAP-BASIS-LEAD-INDI/54523644/',
    applyUrl: 'https://jobs.birlasoft.com/talentcommunity/apply/54523644/?locale=en_US&jobID=54523644#tracked',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-27',
    closingDate: null,
    jobDescription: null,
  })
})

test('extractPaginationSummary reads Birlasoft result counts from the public India listing page', () => {
  const html = readFixture('search-india-page-1.html')

  assert.deepEqual(extractPaginationSummary(html), {
    hasNext: true,
    currentPage: 1,
    totalPages: 25,
    totalJobCount: 617,
  })
})

test('extractJobDetail reads Birlasoft detail metadata, requisition id, and description text', () => {
  const html = readFixture('job-detail-54516844.html')
  const detail = extractJobDetail(html, {
    title: 'Oracle SCM Odermanagement',
    location: 'Pune, India',
    city: 'Pune',
    jobId: '54516844',
    requisitionId: '54516844',
    sourceUrl: 'https://jobs.birlasoft.com/job/Pune-Oracle-SCM-Odermanagement-INDI/54516844/',
  })

  assert.equal(detail.title, 'Oracle SCM Odermanagement')
  assert.equal(detail.department, null)
  assert.equal(detail.location, 'Pune, India')
  assert.equal(detail.city, 'Pune')
  assert.equal(detail.jobId, '54516844')
  assert.equal(detail.requisitionId, '34507')
  assert.equal(detail.employmentType, null)
  assert.equal(detail.experienceRequired, null)
  assert.equal(detail.minimumQualification, null)
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, [])
  assert.equal(detail.postingDate, '2026-06-27')
  assert.equal(detail.closingDate, '2026-06-30')
  assert.equal(
    detail.applyUrl,
    'https://jobs.birlasoft.com/talentcommunity/apply/54516844/?locale=en_US&jobID=54516844#tracked',
  )
  assert.equal(
    detail.sourceUrl,
    'https://jobs.birlasoft.com/job/Pune-Oracle-SCM-Odermanagement-INDI/54516844/',
  )
  assert.match(detail.jobDescription, /Oracle EBS SCM oder management/i)
})
