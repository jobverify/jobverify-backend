import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildSearchUrl,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
} from '../../scraper/sap/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'sap',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchUrl keeps SAP listings on the public server-rendered search route', () => {
  assert.equal(
    buildSearchUrl(),
    'https://jobs.sap.com/search/?q=&locationsearch=India&locale=en_US',
  )
  assert.equal(
    buildSearchUrl({ startRow: 25 }),
    'https://jobs.sap.com/search/?q=&locationsearch=India&locale=en_US&startrow=25',
  )
})

test('extractSearchResults parses SAP search rows from the official jobs page', () => {
  const html = readFixture('search-results-page-0.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'SAP Business AI Architect',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '1290611401',
    requisitionId: '1290611401',
    sourceUrl: 'https://jobs.sap.com/job/Bangalore-SAP-Business-AI-Architect-560066/1290611401/',
  })
  assert.deepEqual(jobs[1], {
    title: 'Business Processes Consultant EC Time Tracking',
    location: 'Gurgaon, India',
    city: 'Gurgaon',
    jobId: '1272943801',
    requisitionId: '1272943801',
    sourceUrl: 'https://jobs.sap.com/job/Gurgaon-Business-Processes-Consultant-EC-Time-Tracking-122002/1272943801/',
  })
})

test('extractPaginationSummary reads SAP result counts from the public search page', () => {
  const html = readFixture('search-results-page-0.html')

  assert.deepEqual(extractPaginationSummary(html), {
    totalJobCount: 113,
    pageSize: 25,
  })
})

test('extractJobDetail pulls SAP requisition metadata, description, and apply route from a detail page', () => {
  const html = readFixture('job-detail-1290611401.html')
  const detail = extractJobDetail(html, {
    title: 'SAP Business AI Architect',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '1290611401',
    requisitionId: '1290611401',
    sourceUrl: 'https://jobs.sap.com/job/Bangalore-SAP-Business-AI-Architect-560066/1290611401/',
  })

  assert.deepEqual(detail, {
    title: 'SAP Business AI Architect',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '446772',
    requisitionId: '446772',
    employmentType: 'Regular Full Time',
    experienceRequired: null,
    jobDescription:
      'At SAP, we enable you to bring out your best. Our company culture is focused on collaboration and a shared passion to help the world run better. We offer a highly collaborative, caring team environment with a strong focus on learning and development, recognition for your individual contributions, and a variety of benefit options for you to choose from. Bring out your best SAP innovations help more than four hundred thousand customers worldwide work together more efficiently and use business insight more effectively. Please note that any violation of these guidelines may result in disqualification from the hiring process. Requisition ID: 446772 | Work Area: Consulting and Professional Services | Expected Travel: 0 - 10% | Career Status: Professional | Employment Type: Regular Full Time | Additional Locations: #LI-Hybrid',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-01',
    closingDate: null,
    applyUrl: 'https://jobs.sap.com/talentcommunity/apply/1290611401/?locale=en_US',
    sourceUrl: 'https://jobs.sap.com/job/Bangalore-SAP-Business-AI-Architect-560066/1290611401/',
    department: 'Consulting and Professional Services',
  })
})
