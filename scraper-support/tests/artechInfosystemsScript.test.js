import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildJobDetailUrl,
  buildSearchUrl,
  createArtechInfosystemsScraper,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
} from '../../scraper/artechinfosystems/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'artechinfosystems',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchUrl keeps Artech searches on the public Oracle Cloud careers finder with India scoping', () => {
  assert.equal(
    buildSearchUrl(),
    'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    buildSearchUrl({ page: 2, limit: 10, location: 'Noida, Uttar Pradesh, India' }),
    'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=Noida, Uttar Pradesh, India',
  )
})

test('buildJobDetailUrl keeps Artech detail links on the public Oracle careers route', () => {
  assert.equal(
    buildJobDetailUrl('4'),
    'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/4',
  )
})

test('extractSearchResults normalizes Artech Oracle Cloud requisitions and prefers India secondary locations', () => {
  const payload = readJsonFixture('search-results.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Executive - Accounts',
    company: 'Artech Infosystems Private Limited',
    department: 'General ledger',
    location: 'Noida, Uttar Pradesh, India',
    city: 'Noida',
    jobId: '4',
    requisitionId: '4',
    sourceUrl: 'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/4',
    applyUrl: 'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/4',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2021-08-21',
    closingDate: null,
    jobDescription: 'Job Profile: Preparation of Financial Statements Bank Reconciliation',
  })
})

test('extractPaginationSummary reads Artech next-page availability from the Oracle Cloud payload', () => {
  const payload = readJsonFixture('search-results.json')

  assert.deepEqual(extractPaginationSummary(payload, { page: 0 }), {
    hasNext: true,
    pageSize: 24,
    nextOffset: 24,
    totalCount: 441,
  })
})

test('extractJobDetail reads Artech detail metadata and HTML descriptions', () => {
  const payload = readJsonFixture('job-detail-4.json')
  const detail = extractJobDetail(payload, {
    title: 'Executive - Accounts',
    location: 'Noida, Uttar Pradesh, India',
    city: 'Noida',
    jobId: '4',
    requisitionId: '4',
    sourceUrl: 'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/4',
  })

  assert.equal(detail.title, 'Executive - Accounts')
  assert.equal(detail.department, 'General ledger')
  assert.equal(detail.location, 'Noida, Uttar Pradesh, India')
  assert.equal(detail.city, 'Noida')
  assert.equal(detail.jobId, '4')
  assert.equal(detail.requisitionId, '4')
  assert.equal(detail.employmentType, 'Full time')
  assert.equal(detail.experienceRequired, null)
  assert.equal(detail.minimumQualification, "Bachelor's Degree")
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, [])
  assert.equal(detail.postingDate, '2021-08-21')
  assert.equal(detail.closingDate, null)
  assert.equal(
    detail.applyUrl,
    'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/4',
  )
  assert.equal(
    detail.sourceUrl,
    'https://fa-erqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/4',
  )
  assert.match(detail.jobDescription, /Preparation of Financial Statements/i)
  assert.match(detail.jobDescription, /US taxation and accounting laws/i)
})

test('run enriches Artech listings with detail data and preserves runner contract', async () => {
  const searchPayload = readJsonFixture('search-results.json')
  const detailPayload = readJsonFixture('job-detail-4.json')
  const requestedUrls = []

  const jobs = await createArtechInfosystemsScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === buildSearchUrl({ page: 0 })) return searchPayload
      if (url.includes('recruitingCEJobRequisitionDetails')) return detailPayload
      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run()

  assert.equal(requestedUrls.length, 2)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'artechinfosystems')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(jobs[0].location, 'Noida, Uttar Pradesh, India')
})
