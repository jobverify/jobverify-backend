import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadModule = async () => {
  try {
    return await import('../metconnectinfotech/script.js')
  } catch {
    assert.fail('Expected MetConnect Infotech scraper module at ../metconnectinfotech/script.js')
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'metconnectinfotech',
  'fixtures',
)

const readJsonFixture = (name) =>
  JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

const expectedActiveJobs = readJsonFixture('jobs.json')
  .filter((record) => record?.isActive !== false)

test('MetConnect Infotech scraper pins the first-party careers API endpoint', async () => {
  const metconnect = await loadModule()

  assert.equal(metconnect.API_URL, 'https://metconnectbackend-production.up.railway.app/api/jobs')
  assert.equal(metconnect.SOURCE, 'metconnectinfotech')
})

test('MetConnect Infotech scraper normalizes the live first-party jobs feed into shared fields', async () => {
  const metconnect = await loadModule()
  const jobs = metconnect.extractSearchResults(readJsonFixture('jobs.json'))

  assert.equal(jobs.length, expectedActiveJobs.length)
  assert.deepEqual(jobs[0], {
    title: 'App Developer',
    company: 'MetConnect Infotech Pvt. Ltd.',
    location: 'Patna',
    city: 'Patna',
    state: null,
    country: 'India',
    department: null,
    jobDescription: 'What We Are Looking For: Android: Strong Java/Kotlin skills, Android Studio, and Firebase. iOS: Experience with Swift/Objective-C and Xcode. Data: Proficiency in SQLite, Room, or Core Data. Tools: Solid understanding of Git/GitHub and push notifications. Mindset: Clean coding practices and a problem-solving attitude.',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    experienceRequired: '1-5 Yrs',
    salary: '3-8 LPA',
    jobId: '6a06fb17b9b0d2ca378c5ea7',
    requisitionId: null,
    postingDate: '2026-05-15T10:53:11.124Z',
    closingDate: null,
    applyUrl: 'https://metconnectinfotech.com/company-career',
    sourceUrl: metconnect.API_URL,
  })
})

test('MetConnect Infotech scraper fetches the live API and returns only active jobs', async () => {
  const metconnect = await loadModule()
  const requestedUrls = []

  const jobs = await metconnect.createMetConnectInfotechScraper().run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, metconnect.API_URL)
      return readJsonFixture('jobs.json')
    },
  })

  assert.deepEqual(requestedUrls, [metconnect.API_URL])
  assert.equal(jobs.length, expectedActiveJobs.length)
  assert.equal(jobs[0].source, 'metconnectinfotech')
  assert.equal(jobs[0].company, 'MetConnect Infotech Pvt. Ltd.')
  assert.equal(jobs[0].link, 'https://metconnectinfotech.com/company-career')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
