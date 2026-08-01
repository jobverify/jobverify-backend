import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildJobDetailUrl,
  buildSearchUrl,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
} from '../../scraper/hexaware/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'hexaware',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchUrl keeps Hexaware searches on the public Oracle Cloud careers finder with India scoping', () => {
  assert.equal(
    buildSearchUrl(),
    'https://fa-etqo-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    buildSearchUrl({ page: 2, limit: 10, location: 'Mumbai, Maharashtra, India' }),
    'https://fa-etqo-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=Mumbai, Maharashtra, India',
  )
})

test('buildJobDetailUrl keeps Hexaware detail links on the public careers route', () => {
  assert.equal(
    buildJobDetailUrl('654953'),
    'https://jobs.hexaware.com/#en/sites/CX_1/job/654953',
  )
})

test('extractSearchResults normalizes Hexaware Oracle Cloud requisitions and keeps only India jobs', () => {
  const payload = readJsonFixture('search-results.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Big Data Lead',
    company: 'Hexaware',
    department: null,
    location: 'India',
    city: null,
    jobId: '654953',
    requisitionId: '654953',
    sourceUrl: 'https://jobs.hexaware.com/#en/sites/CX_1/job/654953',
    applyUrl: 'https://jobs.hexaware.com/#en/sites/CX_1/job/654953',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-25',
    closingDate: null,
    jobDescription: null,
  })
})

test('extractPaginationSummary reads Hexaware next-page availability from the Oracle Cloud payload', () => {
  const payload = readJsonFixture('search-results.json')

  assert.deepEqual(extractPaginationSummary(payload, { page: 0 }), {
    hasNext: true,
    pageSize: 24,
    nextOffset: 24,
    totalCount: 127,
  })
})

test('extractJobDetail reads Hexaware detail metadata, skills, and description text', () => {
  const payload = readJsonFixture('job-detail-654953.json')
  const detail = extractJobDetail(payload, {
    title: 'Big Data Lead',
    location: 'India',
    jobId: '654953',
    requisitionId: '654953',
    sourceUrl: 'https://jobs.hexaware.com/#en/sites/CX_1/job/654953',
  })

  assert.equal(detail.title, 'Big Data Lead')
  assert.equal(detail.department, null)
  assert.equal(detail.location, 'India')
  assert.equal(detail.city, null)
  assert.equal(detail.jobId, '654953')
  assert.equal(detail.requisitionId, '654953')
  assert.equal(detail.employmentType, null)
  assert.equal(detail.experienceRequired, null)
  assert.equal(detail.minimumQualification, null)
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, [
    'Amazon Redshift',
    'Apache Spark',
    'Azure Data Factory',
    'BigData -Hadoop',
    'BigData -Hive',
    'Databricks',
    'Google Cloud Platform',
    'Scala',
    'Snowflake',
  ])
  assert.equal(detail.postingDate, '2026-06-25')
  assert.equal(detail.closingDate, '2026-07-25')
  assert.equal(
    detail.applyUrl,
    'https://jobs.hexaware.com/#en/sites/CX_1/job/654953',
  )
  assert.equal(
    detail.sourceUrl,
    'https://jobs.hexaware.com/#en/sites/CX_1/job/654953',
  )
  assert.match(detail.jobDescription, /Microsoft Fabric Data Engineer Job Description/i)
  assert.match(detail.jobDescription, /market data/i)
  assert.match(detail.jobDescription, /Power BI exposure/i)
})
