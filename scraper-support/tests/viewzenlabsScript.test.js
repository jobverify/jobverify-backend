import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const loadViewZenLabsModule = async () => {
  try {
    return await import('../../scraper/viewzenlabs/script.js')
  } catch {
    return null
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'viewzenlabs',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('extractCompanyLocation reads the Chennai base from the ViewZen Labs careers page', async () => {
  const viewzenlabs = await loadViewZenLabsModule()
  assert.ok(viewzenlabs)

  assert.equal(
    viewzenlabs.extractCompanyLocation(readFixture('careers.html')),
    'Chennai, India',
  )
})

test('extractJobListings maps ViewZen Labs career cards into the shared listing contract', async () => {
  const viewzenlabs = await loadViewZenLabsModule()
  assert.ok(viewzenlabs)

  const jobs = viewzenlabs.extractJobListings(readFixture('careers.html'))

  assert.equal(jobs.length, 5)
  assert.deepEqual(jobs[0], {
    title: 'Frontend - Angular',
    location: 'Chennai, India',
    city: 'Chennai',
    jobId: 'frontend-angular',
    requisitionId: 'frontend-angular',
    employmentType: 'Full-time',
    experienceRequired: '0 - 1 Years',
    postingDate: null,
    closingDate: null,
    sourceUrl: 'https://www.viewzenlabs.com/careers',
    applyUrl: null,
    department: 'Software Developer',
    minimumQualification: 'BE / B.Tech / BSc / MSc/MCA or equivalent.',
    requiredSkills: [
      'Linux (Ubuntu)',
      'Javascript / ES6 / Typescript',
      'HTML5 / CSS / Bootstrap',
      'Angular 16+ Components/Services',
      'Async REST Web Services',
    ],
  })

  assert.deepEqual(jobs[4], {
    title: 'Tech Sales',
    location: 'Chennai, India',
    city: 'Chennai',
    jobId: 'tech-sales',
    requisitionId: 'tech-sales',
    employmentType: 'Full-time',
    experienceRequired: '0 - 1 Years',
    postingDate: null,
    closingDate: null,
    sourceUrl: 'https://www.viewzenlabs.com/careers',
    applyUrl: null,
    department: 'Sales Executive',
    minimumQualification: 'Mass Comm / MBA / BBA / BE.',
    requiredSkills: [
      'Lead Gen (Email, Cold Calls)',
      'Client Meetings, Webinars',
      'Proposal Creation',
      'Target-oriented',
    ],
  })
})

test('normalizeScrapedJob composes ViewZen Labs early-career roles from the careers page cards', async () => {
  const viewzenlabs = await loadViewZenLabsModule()
  assert.ok(viewzenlabs)

  const listing = viewzenlabs.extractJobListings(readFixture('careers.html'))[0]
  const normalized = normalizeScrapedJob(listing, {
    source: 'viewzenlabs',
    companyName: 'ViewZen Labs',
    companyCareerPage: 'https://www.viewzenlabs.com/careers',
    atsPlatform: 'official-company-careers',
  })

  assert.equal(normalized.company, 'ViewZen Labs')
  assert.equal(normalized.country, 'India')
  assert.equal(normalized.remoteStatus, 'On-site')
  assert.equal(normalized.experienceLevel, 'Entry Level')
  assert.equal(normalized.jobType, 'Full-time Fresher')
})

test('run fetches the ViewZen Labs careers page and decorates shared runner fields', async () => {
  const viewzenlabs = await loadViewZenLabsModule()
  assert.ok(viewzenlabs)

  const requested = []
  const scraper = viewzenlabs.createViewZenLabsScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requested.push(url)
      if (url === 'https://www.viewzenlabs.com/careers') {
        return readFixture('careers.html')
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requested, ['https://www.viewzenlabs.com/careers'])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].company, 'ViewZen Labs')
  assert.equal(jobs[0].source, 'viewzenlabs')
  assert.equal(jobs[0].link, 'https://www.viewzenlabs.com/careers')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
