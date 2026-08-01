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
} from '../../scraper/tatamotors/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'tatamotors',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchPageUrl keeps Tata Motors listing pages on the official sorted search route', () => {
  assert.equal(
    buildSearchPageUrl(),
    'https://careers.tatamotors.com/search/?q=&sortColumn=referencedate&sortDirection=desc',
  )
  assert.equal(
    buildSearchPageUrl(25),
    'https://careers.tatamotors.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=25',
  )
})

test('extractSearchResults parses Tata Motors server-rendered search rows into shared scraper fields', () => {
  const html = readFixture('search-page-1.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 25)
  assert.deepEqual(jobs[4], {
    title: 'CRASH SAFETY TESTING ENGINEER',
    location: 'Pune, IN',
    city: 'Pune',
    facility: null,
    jobId: '914503601',
    requisitionId: '914503601',
    sourceUrl: 'https://careers.tatamotors.com/job/Pune-CRASH-SAFETY-TESTING-ENGINEER/914503601/',
    postingDate: 'Jun 22, 2026',
  })
})

test('extractResultsSummary reads Tata Motors total result and page counts from pagination chrome', () => {
  const html = readFixture('search-page-1.html')

  assert.deepEqual(extractResultsSummary(html), {
    totalResults: 146,
    currentPage: 1,
    totalPages: 6,
  })
})

test('extractJobDetail pulls Tata Motors apply URL, description, and location metadata from the detail page', () => {
  const html = readFixture('job-detail-914503601.html')
  const detail = extractJobDetail(html, {
    title: 'CRASH SAFETY TESTING ENGINEER',
    location: 'Pune, IN',
    city: 'Pune',
    facility: null,
    jobId: '914503601',
    sourceUrl: 'https://careers.tatamotors.com/job/Pune-CRASH-SAFETY-TESTING-ENGINEER/914503601/',
  })

  assert.deepEqual(detail, {
    title: 'CRASH SAFETY TESTING ENGINEER',
    location: 'Pune, IN',
    city: 'Pune',
    jobId: '914503601',
    requisitionId: '914503601',
    employmentType: 'Full-time',
    experienceRequired: null,
    jobDescription:
      'Position Summary with Job Responsibilities . Education Work Experience Tata Motors Leadership Competencies Developing Self and Others - Recognizing continuous development is essential for success and taking steps to develop self and helping others to excel Leading Change - Recognizing the need for change, initiating and adapting to change Driving Execution - Translating strategy into action and execution Leading by Example - Encouraging and following ethical standards Motivating Self and Others - Inspiring teams and individuals Customer Centricity - Anticipating, understanding and focusing efforts on meeting the customer (stakeholders) needs or expectations Functional Competencies Tags',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: 'Jun 22, 2026',
    closingDate: null,
    applyUrl: 'https://careers.tatamotors.com/talentcommunity/apply/914503601/?locale=en_US',
    sourceUrl: 'https://careers.tatamotors.com/job/Pune-CRASH-SAFETY-TESTING-ENGINEER/914503601/',
  })
})
