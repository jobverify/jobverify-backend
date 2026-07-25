import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const loadAurionproModule = async () => {
  try {
    return await import('../aurionpro/script.js')
  } catch {
    return null
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'aurionpro',
)

const readFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildListingUrl keeps AurionPro listings on the public ZingHR mservices contract', async () => {
  const aurionpro = await loadAurionproModule()
  assert.ok(aurionpro)

  assert.equal(
    aurionpro.buildListingUrl(),
    'https://mservices.zinghr.com/recruitment/api/v1/CareerConfig/GetCareerJobPostings?careerClientKey=AHJX1-HGSAB-BSHB1&pageIndex=1&pageSize=10&searchText=',
  )
})

test('extractListingSummary reads total counts from the AurionPro ZingHR payload', async () => {
  const aurionpro = await loadAurionproModule()
  assert.ok(aurionpro)

  const summary = aurionpro.extractListingSummary(readFixture('listing-page-1.json'))
  assert.deepEqual(summary, {
    totalCount: 4,
    pageSize: 10,
  })
})

test('extractListings maps AurionPro ZingHR postings into the shared listing contract', async () => {
  const aurionpro = await loadAurionproModule()
  assert.ok(aurionpro)

  const jobs = aurionpro.extractListings(readFixture('listing-page-1.json'))

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior Support Engineer',
    location: null,
    city: null,
    jobId: '1096',
    requisitionId: '1096',
    employmentType: 'Full-time',
    experienceRequired: '4 - 10 Years',
    postingDate: '2026-05-07T00:00:00',
    closingDate: '2026-07-31T00:00:00',
    sourceUrl: null,
    applyUrl: null,
    department: null,
  })
})

test('extractJobDetail pulls AurionPro location, apply link, and skill lists from the ZingHR detail payload', async () => {
  const aurionpro = await loadAurionproModule()
  assert.ok(aurionpro)

  const detail = aurionpro.extractJobDetail(
    readFixture('job-detail-1096.json'),
    aurionpro.extractListings(readFixture('listing-page-1.json'))[0],
  )

  assert.equal(detail.title, 'Senior Support Engineer')
  assert.equal(detail.location, 'Chennai, India')
  assert.equal(detail.city, 'Chennai')
  assert.equal(detail.jobId, '1096')
  assert.equal(detail.requisitionId, '1096')
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.experienceRequired, '4 - 10 Years')
  assert.match(detail.jobDescription, /Role Overview/i)
  assert.deepEqual(detail.requiredSkills.slice(0, 3), [
    'Administer and support ITSM tools Zoho ManageEngine ServiceDesk Plus, Zoho ITAM',
    'Manage end-to-end IT service processes incident, problem, change, asset management',
    'Configure workflows, automation, and reporting in ITSM platforms',
  ])
  assert.equal(detail.postingDate, '2026-05-07T00:00:00')
  assert.equal(detail.closingDate, '2026-07-31T00:00:00')
  assert.equal(detail.sourceUrl, 'https://portal.zinghr.com/CandidateAddition/CreateNewCandidate/TopCandidateDetailsMenu?VCode=listing')
  assert.equal(detail.applyUrl, 'https://portal.zinghr.com/CandidateAddition/CreateNewCandidate/TopCandidateDetailsMenu?VCode=apply1096')
})

test('normalizeScrapedJob composes AurionPro senior support roles from ZingHR detail payloads', async () => {
  const aurionpro = await loadAurionproModule()
  assert.ok(aurionpro)

  const detail = aurionpro.extractJobDetail(
    readFixture('job-detail-1096.json'),
    aurionpro.extractListings(readFixture('listing-page-1.json'))[0],
  )

  const normalized = normalizeScrapedJob(detail, {
    source: 'aurionpro',
    companyName: 'AurionPro',
    companyCareerPage: 'https://zingnext.zinghr.com/portal/embed/career-website?CareerClientKey=AHJX1-HGSAB-BSHB1',
    atsPlatform: 'zinghr',
  })

  assert.equal(normalized.company, 'AurionPro')
  assert.equal(normalized.country, 'India')
  assert.equal(normalized.remoteStatus, 'On-site')
  assert.equal(normalized.experienceLevel, 'Senior Level')
  assert.equal(normalized.jobType, 'Full-time Experienced')
})

test('run fetches AurionPro ZingHR listings and detail payloads, then decorates shared runner fields', async () => {
  const aurionpro = await loadAurionproModule()
  assert.ok(aurionpro)

  const requested = []
  const scraper = aurionpro.createAurionproScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requested.push(url)

      if (url.includes('GetCareerJobPostings')) {
        return readFixture('listing-page-1.json')
      }

      if (url.includes('requisitionId=1096')) {
        return readFixture('job-detail-1096.json')
      }

      if (url.includes('requisitionId=1095')) {
        return {
          ...readFixture('job-detail-1096.json'),
          data: {
            ...readFixture('job-detail-1096.json').data,
            requisitionID: 1095,
            jobTitle: 'Support Engineer',
            designation: 'Support Engineer',
            location: 'Mumbai',
            candidateApplyLink: 'https://portal.zinghr.com/CandidateAddition/CreateNewCandidate/TopCandidateDetailsMenu?VCode=apply1095'
          }
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(requested.length, 3)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'AurionPro')
  assert.equal(jobs[0].source, 'aurionpro')
  assert.equal(jobs[0].link, 'https://portal.zinghr.com/CandidateAddition/CreateNewCandidate/TopCandidateDetailsMenu?VCode=apply1096')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
