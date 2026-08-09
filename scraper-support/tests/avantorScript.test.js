import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadAvantorModule = async () => {
  try {
    return await import('../../scraper/avantor/script.js')
  } catch {
    return null
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'avantor',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchResultsPageUrl keeps Avantor listings on the official Phenom search route', async () => {
  const avantor = await loadAvantorModule()
  assert.ok(avantor)

  assert.equal(
    avantor.buildSearchResultsPageUrl(),
    'https://careers.avantorsciences.com/global/en/search-results',
  )
  assert.equal(
    avantor.buildSearchResultsPageUrl(20),
    'https://careers.avantorsciences.com/global/en/search-results?from=20',
  )
})

test('extractSearchPayload reads Avantor embedded Phenom search payloads and country aggregation counts', async () => {
  const avantor = await loadAvantorModule()
  assert.ok(avantor)

  const payload = avantor.extractSearchPayload(readFixture('search-results-page-0.html'))

  assert.equal(payload.totalHits, 217)
  assert.equal(payload.hits, 10)
  assert.equal(payload.jobs.length, 2)
  assert.equal(payload.aggregations.country.India, 31)
  assert.equal(payload.jobs[0].reqId, 'R-172344')
})

test('extractSearchResults normalizes Avantor public Phenom listings into shared scraper fields', async () => {
  const avantor = await loadAvantorModule()
  assert.ok(avantor)

  const jobs = avantor.extractSearchResults(
    avantor.extractSearchPayload(readFixture('search-results-page-0.html')),
  )

  assert.deepEqual(jobs[0], {
    title: 'Area Sales Manager',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: 'R-172344',
    requisitionId: 'R-172344',
    department: 'Sales',
    employmentType: 'Full-time',
    experienceRequired: null,
    jobDescription:
      'Embrace the opportunity to become an Area Sales Manager and drive growth by managing key accounts and channel partners.',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'chemical sales',
      'channel partner management',
      'territory planning',
    ],
    postingDate: '2026-06-22T00:00:00.000+0000',
    applyUrl: 'https://vwr.wd1.myworkdayjobs.com/avantorJobs/job/IND-Hyderabad-Remote/Area-Sales-Manager_R-172344/apply',
    sourceUrl: 'https://careers.avantorsciences.com/global/en/job/R-172344/Area-Sales-Manager',
  })

  assert.equal(jobs[1].country, 'United States of America')
})

test('extractJobDetail reads Avantor job detail metadata and public apply links from the Phenom detail page', async () => {
  const avantor = await loadAvantorModule()
  assert.ok(avantor)

  const detail = avantor.extractJobDetail(readFixture('job-detail-R-172344.html'), {
    title: 'Area Sales Manager',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: 'R-172344',
    requisitionId: 'R-172344',
    department: 'Sales',
    applyUrl: 'https://vwr.wd1.myworkdayjobs.com/avantorJobs/job/IND-Hyderabad-Remote/Area-Sales-Manager_R-172344/apply',
    sourceUrl: 'https://careers.avantorsciences.com/global/en/job/R-172344/Area-Sales-Manager',
  })

  assert.equal(detail.title, 'Area Sales Manager')
  assert.equal(detail.city, 'Hyderabad')
  assert.equal(detail.country, 'India')
  assert.equal(detail.jobId, 'R-172344')
  assert.equal(detail.requisitionId, 'R-172344')
  assert.equal(detail.department, 'Sales')
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.experienceRequired, '4+ years')
  assert.match(detail.location, /Hyderabad/i)
  assert.match(detail.jobDescription, /working independently under close supervision/i)
  assert.match(detail.minimumQualification, /B\.Tech/i)
  assert.deepEqual(detail.requiredSkills.slice(0, 3), [
    'chemical sales',
    'channel partner management',
    'territory planning',
  ])
  assert.equal(detail.postingDate, '2026-06-25')
  assert.equal(
    detail.applyUrl,
    'https://vwr.wd1.myworkdayjobs.com/avantorJobs/job/IND-Hyderabad-Remote/Area-Sales-Manager_R-172344/apply',
  )
  assert.equal(
    detail.sourceUrl,
    'https://careers.avantorsciences.com/global/en/job/R-172344/Area-Sales-Manager',
  )
})

test('run keeps only India jobs from Avantor public Phenom listings and decorates shared runner fields', async () => {
  const avantor = await loadAvantorModule()
  assert.ok(avantor)

  const requestedUrls = []
  const jobs = await avantor.run({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === avantor.buildSearchResultsPageUrl()) {
        return readFixture('search-results-page-0.html')
      }
      if (url === 'https://careers.avantorsciences.com/global/en/job/R-172344/Area-Sales-Manager') {
        return readFixture('job-detail-R-172344.html')
      }
      throw new Error(`Unexpected Avantor fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    avantor.buildSearchResultsPageUrl(),
    'https://careers.avantorsciences.com/global/en/job/R-172344/Area-Sales-Manager',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Avantor')
  assert.equal(jobs[0].source, 'avantor')
  assert.equal(jobs[0].jobId, 'R-172344')
  assert.match(jobs[0].location, /India/)
  assert.equal(
    jobs[0].applyUrl,
    'https://vwr.wd1.myworkdayjobs.com/avantorJobs/job/IND-Hyderabad-Remote/Area-Sales-Manager_R-172344/apply',
  )
})
