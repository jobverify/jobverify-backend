import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildSearchPageUrl,
  extractJobDetail,
  extractResultsSummary,
  extractSearchResults,
} from '../mahindra/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mahindra',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchPageUrl keeps Mahindra listing pages on the official sorted search route', () => {
  assert.equal(
    buildSearchPageUrl(),
    'https://jobs.mahindracareers.com/search/?q=&sortColumn=referencedate&sortDirection=desc',
  )
  assert.equal(
    buildSearchPageUrl(20),
    'https://jobs.mahindracareers.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=20',
  )
})

test('extractSearchResults parses Mahindra server-rendered search rows into shared scraper fields', () => {
  const html = readFixture('search-page-1.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Lead Engineer - NVH',
    location: 'Chennai, Chennai-MRV-AD, IN',
    city: 'Chennai',
    facility: null,
    business: 'Automotive Sector',
    soarJob: 'Yes',
    jobId: '1371714500',
    requisitionId: '1371714500',
    sourceUrl: 'https://jobs.mahindracareers.com/job/Chennai-Lead-Engineer-NVH-Chen/1371714500/',
  })

  assert.equal(jobs[1].title, 'Manager-Customer Care')
  assert.equal(jobs[1].facility, 'Customer Care')
  assert.equal(jobs[1].business, 'Farm Equipment Sector')
})

test('extractResultsSummary reads Mahindra total result and page counts from pagination chrome', () => {
  const html = readFixture('search-page-1.html')

  assert.deepEqual(extractResultsSummary(html), {
    totalResults: 686,
    currentPage: 1,
    totalPages: 69,
  })
})

test('extractJobDetail pulls Mahindra dates, apply URL, description, and experience cues from the detail page', () => {
  const html = readFixture('job-detail-1371714500.html')
  const detail = extractJobDetail(html, {
    title: 'Lead Engineer - NVH',
    location: 'Chennai, Chennai-MRV-AD, IN',
    city: 'Chennai',
    facility: null,
    business: 'Automotive Sector',
    jobId: '1371714500',
    sourceUrl: 'https://jobs.mahindracareers.com/job/Chennai-Lead-Engineer-NVH-Chen/1371714500/',
  })

  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.department, 'Automotive Sector')
  assert.equal(detail.postingDate, 'Fri Jun 26 07:00:00 UTC 2026')
  assert.equal(detail.closingDate, 'Tue Jun 30 18:30:00 UTC 2026')
  assert.equal(detail.applyUrl, 'https://jobs.mahindracareers.com/talentcommunity/apply/1371714500/?locale=en_GB')
  assert.equal(detail.sourceUrl, 'https://jobs.mahindracareers.com/job/Chennai-Lead-Engineer-NVH-Chen/1371714500/')
  assert.match(detail.jobDescription, /Lead Engineer in NVH/i)
  assert.match(detail.jobDescription, /3 to 5 years/i)
  assert.equal(detail.experienceRequired, '3 to 5 years in the relevant field')
  assert.equal(detail.minimumQualification, 'B.E. / B.Tech in Mechanical Engineering with proven NVH exposure.')
  assert.deepEqual(detail.requiredSkills, ['Engineering', 'Mechanical'])
})
