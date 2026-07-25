import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'
import {
  buildApplyUrl,
  buildDetailUrl,
  buildSearchRequestPayload,
  extractJobDetail,
  extractSearchResults,
  extractSearchSummary,
  isIndiaListing,
} from '../tatasteel/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'tatasteel',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchRequestPayload keeps Tata Steel listings on the official RippleHire tokenized endpoint contract', () => {
  assert.deepEqual(buildSearchRequestPayload(), {
    page: 0,
    search: '*:*',
    campaignSeq: '',
    token: 'kYAz91uy1lFDi6FeSiRZ',
    source: 'CAREERSITE',
    pagesize: 10,
  })

  assert.deepEqual(buildSearchRequestPayload(2), {
    page: 2,
    search: '*:*',
    campaignSeq: '',
    token: 'kYAz91uy1lFDi6FeSiRZ',
    source: 'CAREERSITE',
    pagesize: 10,
  })
})

test('isIndiaListing recognizes Tata Steel India locations while excluding foreign locations', () => {
  assert.equal(isIndiaListing('Jamshedpur'), true)
  assert.equal(isIndiaListing('Joda, Jamshedpur, Meramandali, Jajpur'), true)
  assert.equal(isIndiaListing('West Bokaro'), true)
  assert.equal(isIndiaListing('Singapore'), false)
})

test('extractSearchResults parses Tata Steel RippleHire XML and filters listings to India roles', () => {
  const xml = readFixture('search-results-page-0.xml')
  const jobs = extractSearchResults(xml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Manager / Asst. Mgr. D&E Process-Steel Making',
    location: 'Joda, Jamshedpur, Meramandali, Jajpur, India',
    city: 'Joda',
    jobId: '640512',
    requisitionId: '640512',
    sourceUrl: 'https://tatasteel.ripplehire.com/candidate/?token=kYAz91uy1lFDi6FeSiRZ&source=CAREERSITE#detail/job/640512',
    applyUrl: 'https://tatasteel.ripplehire.com/candidate/?token=kYAz91uy1lFDi6FeSiRZ&source=CAREERSITE#apply/job/640512',
    experienceRequired: '5 - 10 Years',
    postingDate: null,
    department: null,
  })

  assert.deepEqual(jobs[1], {
    title: 'Manager Design & Engineering Coal Beneficiation',
    location: 'Jamshedpur, India',
    city: 'Jamshedpur',
    jobId: '640507',
    requisitionId: '640507',
    sourceUrl: 'https://tatasteel.ripplehire.com/candidate/?token=kYAz91uy1lFDi6FeSiRZ&source=CAREERSITE#detail/job/640507',
    applyUrl: 'https://tatasteel.ripplehire.com/candidate/?token=kYAz91uy1lFDi6FeSiRZ&source=CAREERSITE#apply/job/640507',
    experienceRequired: '5 - 10 Years',
    postingDate: null,
    department: null,
  })
})

test('extractSearchSummary reads total counts and page offsets from Tata Steel RippleHire XML', () => {
  const xml = readFixture('search-results-page-0.xml')

  assert.deepEqual(extractSearchSummary(xml), {
    startJobIndex: 0,
    pageSize: 10,
    totalJobCount: 50,
  })
})

test('extractJobDetail pulls Tata Steel description, qualifications, skills, and apply URLs from the job detail XML', () => {
  const xml = readFixture('job-detail-640512.xml')
  const detail = extractJobDetail(xml, {
    title: 'Manager / Asst. Mgr. D&E Process-Steel Making',
    location: 'Joda, Jamshedpur, Meramandali, Jajpur, India',
    city: 'Joda',
    jobId: '640512',
    requisitionId: '640512',
    sourceUrl: buildDetailUrl('640512'),
    applyUrl: buildApplyUrl('640512'),
    experienceRequired: '5 - 10 Years',
  })

  assert.deepEqual(detail, {
    title: 'Manager / Asst. Mgr. D&E Process-Steel Making',
    location: 'Joda, Jamshedpur, Meramandali, Jajpur, India',
    city: 'Joda',
    jobId: '640512',
    requisitionId: '640512',
    employmentType: 'Full-time',
    experienceRequired: '5 - 10 Years',
    department: null,
    jobDescription:
      'To support and render engineering expertise for the project engineering activities related to Steel Melting Shop of an integrated steel plant. Conceptualize the Steel Melting shop of a steel plant Knowledge of various Steel making equipment & systems and selection criteria',
    minimumQualification: 'BE/B.tech ( Metallurgy/ Mechanical) Equilvalent in any discipline or B.Arch AICTE or UGC approved.',
    preferredQualification: null,
    requiredSkills: [
      'Conceptualization of Steel Making shop for a steel plant.',
      'Value engineering / Approval of basic & detailed engineering',
    ],
    postingDate: '18-Jun-2026',
    closingDate: null,
    applyUrl: 'https://tatasteel.ripplehire.com/candidate/?token=kYAz91uy1lFDi6FeSiRZ&source=CAREERSITE#apply/job/640512',
    sourceUrl: 'https://tatasteel.ripplehire.com/candidate/?token=kYAz91uy1lFDi6FeSiRZ&source=CAREERSITE#detail/job/640512',
  })
})

test('normalizeScrapedJob composes Tata Steel experienced job types from RippleHire detail payloads', () => {
  const detail = extractJobDetail(readFixture('job-detail-640512.xml'), {
    title: 'Manager / Asst. Mgr. D&E Process-Steel Making',
    location: 'Joda, Jamshedpur, Meramandali, Jajpur, India',
    city: 'Joda',
    jobId: '640512',
    requisitionId: '640512',
    sourceUrl: buildDetailUrl('640512'),
    applyUrl: buildApplyUrl('640512'),
    experienceRequired: '5 - 10 Years',
  })

  const normalized = normalizeScrapedJob(detail, {
    source: 'tatasteel',
    companyName: 'Tata Steel',
    companyCareerPage: 'https://www.tatasteel.com/careers/',
    atsPlatform: 'ripplehire',
  })

  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Senior Level')
  assert.equal(normalized.jobType, 'Full-time Experienced')
})
