import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKbrModule = async () => {
  try {
    return await import('../../scraper/kbr/script.js')
  } catch {
    assert.fail('Expected KBR scraper module at ../../scraper/scraper/kbr/script.js')
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'kbr',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchResultsPageUrl keeps KBR listings on the official Phenom search route', async () => {
  const {
    CAREERS_LANDING_URL,
    HOMEPAGE_URL,
    buildJobDetailUrl,
    buildSearchResultsPageUrl,
  } = await loadKbrModule()

  assert.equal(HOMEPAGE_URL, 'https://www.kbr.com/en')
  assert.equal(CAREERS_LANDING_URL, 'https://careers.kbr.com/us/en')
  assert.equal(
    buildSearchResultsPageUrl(),
    'https://careers.kbr.com/us/en/search-results',
  )
  assert.equal(
    buildSearchResultsPageUrl(10),
    'https://careers.kbr.com/us/en/search-results?from=10',
  )
  assert.equal(
    buildJobDetailUrl({ reqId: 'R2109999', title: 'Senior Associate Designer' }),
    'https://careers.kbr.com/us/en/job/R2109999/Senior-Associate-Designer',
  )
})

test('extractSearchPayload reads KBR embedded Phenom search payloads and India aggregation counts', async () => {
  const { extractSearchPayload } = await loadKbrModule()
  const payload = extractSearchPayload(readFixture('search-results-page-0.html'))

  assert.equal(payload.totalHits, 2)
  assert.equal(payload.hits, 10)
  assert.equal(payload.jobs.length, 2)
  assert.equal(payload.aggregations.country.India, 1)
  assert.equal(payload.jobs[0].reqId, 'R2109999')
})

test('run validates the official KBR homepage handoff and returns India jobs from the Phenom detail page', async () => {
  const {
    CAREERS_LANDING_URL,
    HOMEPAGE_URL,
    buildSearchResultsPageUrl,
    run,
  } = await loadKbrModule()
  const requestedUrls = []

  const jobs = await run({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) return readFixture('homepage.html')
      if (url === CAREERS_LANDING_URL) return readFixture('careers-landing.html')
      if (url === buildSearchResultsPageUrl()) return readFixture('search-results-page-0.html')
      if (url === 'https://careers.kbr.com/us/en/job/R2109999/Senior-Associate-Designer') {
        return readFixture('job-detail-R2109999.html')
      }

      throw new Error(`Unexpected KBR fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    CAREERS_LANDING_URL,
    buildSearchResultsPageUrl(),
    'https://careers.kbr.com/us/en/job/R2109999/Senior-Associate-Designer',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'KBR')
  assert.equal(jobs[0].source, 'kbr')
  assert.equal(jobs[0].jobId, 'R2109999')
  assert.equal(jobs[0].location, 'Chennai, Tamil Nadu, India')
  assert.equal(jobs[0].city, 'Chennai')
  assert.equal(jobs[0].country, 'India')
  assert.equal(
    jobs[0].applyUrl,
    'https://careers.kbr.com/us/en/job/R2109999/Senior-Associate-Designer',
  )
  assert.match(jobs[0].jobDescription, /detail design deliverables/i)
  assert.ok(jobs[0].requiredSkills.some((skill) => /smartplant 3d/i.test(skill)))
  assert.ok(jobs[0].requiredSkills.some((skill) => /asme standards/i.test(skill)))
})

test('run fails closed when the official KBR homepage no longer links to the first-party careers site', async () => {
  const { HOMEPAGE_URL, run } = await loadKbrModule()

  await assert.rejects(
    run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return '<html><body><a href="/contact">Contact</a></body></html>'
        throw new Error(`Unexpected KBR fixture URL: ${url}`)
      },
    }),
    /KBR homepage no longer links to the official careers site/i,
  )
})
