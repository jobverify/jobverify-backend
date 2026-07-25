import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadHitachiEnergyModule = async () => {
  try {
    return await import('../hitachienergy/script.js')
  } catch {
    assert.fail('Expected Hitachi Energy scraper module at ../hitachienergy/script.js')
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'hitachienergy',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')
const readJsonFixture = (name) => JSON.parse(readFixture(name))

test('buildListingApiUrl keeps Hitachi Energy requests on the official public jobs feed', async () => {
  const {
    LISTING_API_URL,
    buildListingApiUrl,
  } = await loadHitachiEnergyModule()

  assert.equal(
    LISTING_API_URL,
    'https://www.hitachienergy.com/careers/open-jobs/_jcr_content/root/container/content_1/content/grid_0/joblist.listsearchresults.json',
  )
  assert.equal(buildListingApiUrl(), LISTING_API_URL)
  assert.equal(buildListingApiUrl(20), `${LISTING_API_URL}?offset=20`)
})

test('extractSearchSummary reads Hitachi Energy pagination from the official public jobs feed', async () => {
  const { extractSearchSummary } = await loadHitachiEnergyModule()

  assert.deepEqual(extractSearchSummary(readJsonFixture('search-results-page-0.json')), {
    totalJobCount: 2238,
    pageSize: 20,
    hasMore: true,
  })
})

test('extractSearchResults maps official Hitachi Energy India listings and keeps direct Workday apply URLs', async () => {
  const { extractSearchResults } = await loadHitachiEnergyModule()
  const jobs = extractSearchResults(readJsonFixture('search-results-page-0.json'))
  const electricalDesignEngineer = jobs.find((job) => job.jobId === 'JID3-204484')

  assert.ok(electricalDesignEngineer)
  assert.deepEqual(electricalDesignEngineer, {
    title: 'Electrical Design Engineer – Auxiliary.',
    location: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    jobId: 'JID3-204484',
    requisitionId: 'R0131013',
    sourceUrl: 'https://www.hitachienergy.com/careers/open-jobs/details/JID3-204484',
    applyUrl: 'https://hitachi.wd1.myworkdayjobs.com/hitachi/job/Chennai-Tamil-Nadu-India/Electrical-Design-Engineer---Auxiliary_R0131013/apply',
    department: 'Engineering & Science',
    employmentType: 'Full-time',
    experienceRequired: 'Experienced',
    postingDate: '2026-07-08',
    closingDate: null,
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
  })
})

test('run keeps Hitachi Energy on the official feed and returns India jobs without requiring detail fetches', async () => {
  const {
    LISTING_API_URL,
    createHitachiEnergyScraper,
  } = await loadHitachiEnergyModule()

  const requestedUrls = []
  const jobs = await createHitachiEnergyScraper().run({
    maxPages: 1,
    maxJobs: 1,
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === LISTING_API_URL) {
        return readJsonFixture('search-results-page-0.json')
      }
      throw new Error(`Unexpected Hitachi Energy URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [LISTING_API_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Hitachi Energy')
  assert.equal(jobs[0].source, 'hitachienergy')
  assert.equal(jobs[0].jobId, 'JID3-204484')
  assert.equal(jobs[0].city, 'Chennai')
  assert.equal(
    jobs[0].applyUrl,
    'https://hitachi.wd1.myworkdayjobs.com/hitachi/job/Chennai-Tamil-Nadu-India/Electrical-Design-Engineer---Auxiliary_R0131013/apply',
  )
})
