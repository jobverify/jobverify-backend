import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadAmazonModule = async () => {
  try {
    return await import('../amazon/script.js')
  } catch {
    assert.fail('Expected Amazon scraper module at ../scraper/amazon/script.js')
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'amazon',
)

const readJsonFixture = (name) => JSON.parse(
  readFileSync(path.join(fixturesDir, name), 'utf8'),
)

test('Amazon URL builders stay on the official public search and job domains', async () => {
  const {
    buildApplyUrl,
    buildJobUrl,
    buildSearchApiUrl,
  } = await loadAmazonModule()

  assert.equal(
    buildSearchApiUrl(),
    'https://www.amazon.jobs/en/search.json?offset=0&result_limit=10&sort=relevant&normalized_country_code%5B%5D=IND',
  )
  assert.equal(
    buildSearchApiUrl({ offset: 20, resultLimit: 5 }),
    'https://www.amazon.jobs/en/search.json?offset=20&result_limit=5&sort=relevant&normalized_country_code%5B%5D=IND',
  )
  assert.equal(
    buildJobUrl('/en/jobs/10390095/rpa-engineer-ar-automation'),
    'https://www.amazon.jobs/en/jobs/10390095/rpa-engineer-ar-automation',
  )
  assert.equal(
    buildApplyUrl('https://account.amazon.com/jobs/10390095/apply'),
    'https://account.amazon.com/jobs/10390095/apply',
  )
})

test('extractSearchResults keeps Amazon India jobs from the public search JSON response', async () => {
  const { extractPaginationSummary, extractSearchResults } = await loadAmazonModule()
  const payload = readJsonFixture('search-india-page-1.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'RPA Engineer, AR Automation',
    company: 'Amazon',
    department: 'Operations, IT, & Support Engineering',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    jobId: '10390095',
    requisitionId: '53e13a03-4621-4f55-a7e5-7daedd9315df',
    sourceUrl: 'https://www.amazon.jobs/en/jobs/10390095/rpa-engineer-ar-automation',
    applyUrl: 'https://account.amazon.com/jobs/10390095/apply',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-04-13',
    closingDate: null,
    jobDescription: jobs[0].jobDescription,
  })
  assert.match(jobs[0].jobDescription, /transform our financial operations/i)
  assert.doesNotMatch(jobs[0].jobDescription, /<br|<p|<li/i)

  assert.deepEqual(extractPaginationSummary(payload, { offset: 0, resultLimit: 2 }), {
    offset: 0,
    resultLimit: 2,
    totalRecords: 2632,
    totalPages: 1316,
    hasNext: true,
  })
})

test('run paginates Amazon India search results and decorates shared runner fields', async () => {
  const {
    buildSearchApiUrl,
    createAmazonScraper,
  } = await loadAmazonModule()
  const payload = readJsonFixture('search-india-page-1.json')
  const requests = []
  const page1 = {
    ...payload,
    jobs: [payload.jobs[0]],
  }
  const page2 = {
    ...payload,
    jobs: [payload.jobs[1]],
  }
  const scraper = createAmazonScraper({ pageSize: 1, maxPages: 2, maxJobs: 2 })

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requests.push(url)

      if (url === buildSearchApiUrl({ offset: 0, resultLimit: 1 })) return page1
      if (url === buildSearchApiUrl({ offset: 1, resultLimit: 1 })) return page2

      throw new Error(`Unexpected Amazon URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    buildSearchApiUrl({ offset: 0, resultLimit: 1 }),
    buildSearchApiUrl({ offset: 1, resultLimit: 1 }),
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'amazon')
  assert.equal(jobs[0].company, 'Amazon')
  assert.ok(jobs.every((job) => job.link === job.applyUrl))
  assert.ok(jobs.every((job) => typeof job.scrapedAt === 'string' && job.scrapedAt.length > 0))
})
