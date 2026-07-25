import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const loadAxisBankModule = async () => {
  try {
    return await import('../axisbank/script.js')
  } catch {
    return null
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'axisbank',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchRequestPayload keeps Axis Bank listings on the official RippleHire tokenized endpoint contract', async () => {
  const axisBank = await loadAxisBankModule()
  assert.ok(axisBank)

  assert.deepEqual(axisBank.buildSearchRequestPayload(), {
    page: 0,
    search: '*:*',
    campaignSeq: '',
    token: 'WIXhCuz0XRZ7H0GZCwjJ',
    source: 'CAREERSITE',
    pagesize: 10,
  })

  assert.deepEqual(axisBank.buildSearchRequestPayload(5), {
    page: 5,
    search: '*:*',
    campaignSeq: '',
    token: 'WIXhCuz0XRZ7H0GZCwjJ',
    source: 'CAREERSITE',
    pagesize: 10,
  })
})

test('isIndiaListing keeps Axis Bank India roles when RippleHire omits country codes and excludes explicit foreign locations', async () => {
  const axisBank = await loadAxisBankModule()
  assert.ok(axisBank)

  assert.equal(axisBank.isIndiaListing({ countryCode: '', city: 'BANGALORE' }), true)
  assert.equal(axisBank.isIndiaListing({ countryCode: 'India', city: 'Chennai' }), true)
  assert.equal(axisBank.isIndiaListing({ countryCode: 'Singapore', city: 'Singapore' }), false)
})

test('extractSearchResults parses Axis Bank RippleHire XML and filters listings to India roles', async () => {
  const axisBank = await loadAxisBankModule()
  assert.ok(axisBank)

  const xml = readFixture('search-results-page-0.xml')
  const jobs = axisBank.extractSearchResults(xml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'RB-LS: Business Development Associate',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    jobId: '726141',
    requisitionId: '726141',
    sourceUrl: 'https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#detail/job/726141',
    applyUrl: 'https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#apply/job/726141',
    experienceRequired: '1 - 3 Years',
    postingDate: null,
    department: null,
  })

  assert.deepEqual(jobs[1], {
    title: 'Branch:Branch Relationship Officer',
    location: 'Chennai, India',
    city: 'Chennai',
    jobId: '726139',
    requisitionId: '726139',
    sourceUrl: 'https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#detail/job/726139',
    applyUrl: 'https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#apply/job/726139',
    experienceRequired: '2 - 4 Years',
    postingDate: null,
    department: null,
  })
})

test('extractSearchSummary reads total counts and page offsets from Axis Bank RippleHire XML', async () => {
  const axisBank = await loadAxisBankModule()
  assert.ok(axisBank)

  const xml = readFixture('search-results-page-0.xml')

  assert.deepEqual(axisBank.extractSearchSummary(xml), {
    startJobIndex: 0,
    pageSize: 10,
    totalJobCount: 7741,
  })
})

test('extractJobDetail pulls Axis Bank description, posting date, and apply URLs from the job detail XML', async () => {
  const axisBank = await loadAxisBankModule()
  assert.ok(axisBank)

  const detail = axisBank.extractJobDetail(readFixture('job-detail-726141.xml'), {
    title: 'RB-LS: Business Development Associate',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    jobId: '726141',
    requisitionId: '726141',
    sourceUrl: axisBank.buildDetailUrl('726141'),
    applyUrl: axisBank.buildApplyUrl('726141'),
    experienceRequired: '1 - 3 Years',
  })

  assert.equal(detail.title, 'RB-LS: Business Development Associate')
  assert.equal(detail.location, 'Hyderabad, India')
  assert.equal(detail.city, 'Hyderabad')
  assert.equal(detail.jobId, '726141')
  assert.equal(detail.requisitionId, '726141')
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.experienceRequired, '1 - 3 Years')
  assert.equal(detail.department, null)
  assert.match(detail.jobDescription, /About Liability Sales/i)
  assert.match(detail.jobDescription, /Good communication/i)
  assert.deepEqual(detail.requiredSkills.slice(0, 3), [
    'Good communication (both verbal and written) skill in both English and the local language.',
    'Excellent lead generation and conversion skill',
    'Ability to handle pressure and meet deadlines.',
  ])
  assert.equal(detail.postingDate, '2026-06-27T10:50:28Z')
  assert.equal(detail.closingDate, null)
  assert.equal(detail.applyUrl, axisBank.buildApplyUrl('726141'))
  assert.equal(detail.sourceUrl, axisBank.buildDetailUrl('726141'))
})

test('normalizeScrapedJob composes Axis Bank experienced sales roles from RippleHire detail payloads', async () => {
  const axisBank = await loadAxisBankModule()
  assert.ok(axisBank)

  const detail = axisBank.extractJobDetail(readFixture('job-detail-726141.xml'), {
    title: 'RB-LS: Business Development Associate',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    jobId: '726141',
    requisitionId: '726141',
    sourceUrl: axisBank.buildDetailUrl('726141'),
    applyUrl: axisBank.buildApplyUrl('726141'),
    experienceRequired: '1 - 3 Years',
  })

  const normalized = normalizeScrapedJob(detail, {
    source: 'axisbank',
    companyName: 'Axis Bank',
    companyCareerPage: 'https://www.axisbank.com/careers',
    atsPlatform: 'ripplehire',
  })

  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Entry Level')
  assert.equal(normalized.jobType, 'Full-time Fresher')
})

test('run fetches the Axis Bank RippleHire listing and detail payloads, then decorates shared runner fields', async () => {
  const axisBank = await loadAxisBankModule()
  assert.ok(axisBank)

  const requested = []
  const scraper = axisBank.createAxisBankScraper()

  const jobs = await scraper.run({
    maxPages: 1,
    fetchText: async (url, options = {}) => {
      requested.push({
        url,
        method: options.method || 'GET',
        body: options.body ? String(options.body) : null,
      })

      if (url === 'https://axisbank.ripplehire.com/candidate/candidatejobsearch') {
        return readFixture('search-results-page-0.xml')
      }

      if (url.includes('jobSeq=726141')) {
        return readFixture('job-detail-726141.xml')
      }

      if (url.includes('jobSeq=726139')) {
        return readFixture('job-detail-726141.xml')
          .replaceAll('726141', '726139')
          .replace('RB-LS: Business Development Associate', 'Branch:Branch Relationship Officer')
          .replace('Hyderabad', 'Chennai')
          .replace('1 - 3 Years', '2 - 4 Years')
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requested.map((entry) => entry.method), ['POST', 'GET', 'GET'])
  assert.match(requested[0].body, /WIXhCuz0XRZ7H0GZCwjJ/)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Axis Bank')
  assert.equal(jobs[0].source, 'axisbank')
  assert.equal(jobs[0].link, 'https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#apply/job/726141')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
