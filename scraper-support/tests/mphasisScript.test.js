import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildApplyUrl,
  buildDetailUrl,
  buildSearchRequestPayload,
  extractJobDetail,
  extractSearchResults,
  extractSearchSummary,
  normalizeEmploymentType,
} from '../../scraper/mphasis/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mphasis',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchRequestPayload keeps Mphasis listings on the official RippleHire tokenized endpoint contract', () => {
  assert.deepEqual(buildSearchRequestPayload(), {
    page: 0,
    search: '*:*',
    campaignSeq: '',
    token: 'ty4DfyWddnOrtpclQeia',
    source: 'CAREERSITE',
    pagesize: 10,
  })

  assert.deepEqual(buildSearchRequestPayload(3), {
    page: 3,
    search: '*:*',
    campaignSeq: '',
    token: 'ty4DfyWddnOrtpclQeia',
    source: 'CAREERSITE',
    pagesize: 10,
  })
})

test('extractSearchResults parses Mphasis RippleHire XML and filters listings to India roles', () => {
  const xml = readFixture('search-results-page-0.xml')
  const jobs = extractSearchResults(xml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Delivery Project Manager',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    jobId: '887211',
    requisitionId: '116927-90-1',
    sourceUrl: 'https://mphasis.ripplehire.com/candidate/?token=ty4DfyWddnOrtpclQeia&source=CAREERSITE#detail/job/887211',
    applyUrl: 'https://mphasis.ripplehire.com/candidate/?token=ty4DfyWddnOrtpclQeia&source=CAREERSITE#apply/job/887211',
    experienceRequired: '10 - 13 Years',
    postingDate: null,
    department: null,
  })

  assert.deepEqual(jobs[1], {
    title: 'Java Springboot - Delivery Module Lead',
    location: 'Mumbai, India',
    city: 'Mumbai',
    jobId: '886282',
    requisitionId: '109984-1-1',
    sourceUrl: 'https://mphasis.ripplehire.com/candidate/?token=ty4DfyWddnOrtpclQeia&source=CAREERSITE#detail/job/886282',
    applyUrl: 'https://mphasis.ripplehire.com/candidate/?token=ty4DfyWddnOrtpclQeia&source=CAREERSITE#apply/job/886282',
    experienceRequired: '5 - 8 Years',
    postingDate: null,
    department: null,
  })
})

test('extractSearchSummary reads total counts and page offsets from Mphasis RippleHire XML', () => {
  const xml = readFixture('search-results-page-0.xml')

  assert.deepEqual(extractSearchSummary(xml), {
    startJobIndex: 0,
    pageSize: 10,
    totalJobCount: 229,
  })
})

test('normalizeEmploymentType maps RippleHire job type labels into Jobify job type inputs', () => {
  assert.equal(normalizeEmploymentType('Full Time', 'Senior Software Engineer'), 'Full-time')
  assert.equal(normalizeEmploymentType('Fixed Term Employee', 'Trainee Software Engg -Systems'), 'Contract')
  assert.equal(normalizeEmploymentType('', 'Software Engineering Intern'), 'Internship')
})

test('extractJobDetail pulls Mphasis description, posting date, department, and apply URLs from the job detail XML', () => {
  const xml = readFixture('job-detail-886282.xml')
  const detail = extractJobDetail(xml, {
    title: 'Java Springboot - Delivery Module Lead',
    location: 'Mumbai, India',
    city: 'Mumbai',
    jobId: '886282',
    requisitionId: '109984-1-1',
    sourceUrl: buildDetailUrl('886282'),
    applyUrl: buildApplyUrl('886282'),
    experienceRequired: '5 - 8 Years',
  })

  assert.deepEqual(detail, {
    title: 'Java Springboot - Delivery Module Lead',
    location: 'Mumbai, India',
    city: 'Mumbai',
    jobId: '886282',
    requisitionId: '109984-1-1',
    employmentType: 'Full-time',
    experienceRequired: '5 - 8 Years',
    department: 'DirectCore',
    jobDescription:
      'Job Description Role: Software Engineer Location : Hyderabad/Mumbai/Bangalore(Mphasis office) Java Spring Boot Microservices About Mphasis',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Java', 'Spring Boot', 'Microservices'],
    postingDate: '2026-06-22T07:03:38Z',
    closingDate: null,
    applyUrl: 'https://mphasis.ripplehire.com/candidate/?token=ty4DfyWddnOrtpclQeia&source=CAREERSITE#apply/job/886282',
    sourceUrl: 'https://mphasis.ripplehire.com/candidate/?token=ty4DfyWddnOrtpclQeia&source=CAREERSITE#detail/job/886282',
  })
})

test('extractJobDetail treats fixed-term Mphasis roles as contract jobs so downstream job type normalization stays accurate', () => {
  const xml = readFixture('job-detail-886977.xml')
  const detail = extractJobDetail(xml, {
    title: 'Trainee Software Engg -Systems',
    location: 'Singapore',
    city: 'Singapore',
    jobId: '886977',
    requisitionId: '118377-1-1',
    sourceUrl: buildDetailUrl('886977'),
    applyUrl: buildApplyUrl('886977'),
    experienceRequired: '0 - 2 Years',
  })

  assert.equal(detail.employmentType, 'Contract')
  assert.equal(detail.postingDate, '2026-06-25T11:21:52Z')
})
