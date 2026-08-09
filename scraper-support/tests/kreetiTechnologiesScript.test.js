import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKreetiTechnologiesModule = async () => {
  try {
    return await import('../../scraper/kreetitechnologies/script.js')
  } catch {
    assert.fail('Expected Kreeti Technologies scraper module at ../../scraper/kreetitechnologies/script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'kreetitechnologies')

const homepageHtml = readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHomeHtml = readFileSync(path.join(fixturesDir, 'careers-home.html'), 'utf8')
const candidatesHtml = readFileSync(path.join(fixturesDir, 'candidates.html'), 'utf8')
const jobDetailHtml = readFileSync(path.join(fixturesDir, 'job-48.html'), 'utf8')

test('Kreeti Technologies scraper keeps the verified first-party homepage and careers app pinned', async () => {
  const kreeti = await loadKreetiTechnologiesModule()

  assert.equal(kreeti.SOURCE, 'kreetitechnologies')
  assert.equal(kreeti.COMPANY, 'Kreeti Technologies')
  assert.equal(kreeti.HOMEPAGE_URL, 'https://www.kreeti.com/')
  assert.equal(kreeti.CAREERS_HOME_URL, 'https://careers.kreeti.com/')
  assert.equal(kreeti.CANDIDATES_URL, 'https://careers.kreeti.com/candidates')
  assert.equal(kreeti.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(kreeti.hasOfficialCareersHomeSignal(careersHomeHtml), true)
  assert.equal(kreeti.hasOfficialCandidatesSignal(candidatesHtml), true)

  const listings = kreeti.extractListings(candidatesHtml)
  assert.equal(listings.length, 1)
  assert.deepEqual(listings[0], {
    title: 'Agile Project Manager',
    company: 'Kreeti Technologies',
    department: null,
    location: null,
    city: null,
    country: 'India',
    jobId: '48',
    requisitionId: '48',
    sourceUrl: 'https://careers.kreeti.com/jobs/48',
    applyUrl: 'https://careers.kreeti.com/candidates/new?job_id=48',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
})

test('Kreeti Technologies scraper enriches the verified first-party detail page into a normalized job record', async () => {
  const kreeti = await loadKreetiTechnologiesModule()

  const listing = kreeti.extractListings(candidatesHtml)[0]
  const job = kreeti.extractJobDetail(jobDetailHtml, listing)

  assert.equal(job.title, 'Agile Project Manager')
  assert.equal(job.jobId, '48')
  assert.equal(job.requisitionId, '48')
  assert.equal(job.sourceUrl, 'https://careers.kreeti.com/jobs/48')
  assert.equal(job.applyUrl, 'https://careers.kreeti.com/candidates/new?job_id=48')
  assert.equal(job.experienceRequired, '3 - 8 yrs')
  assert.equal(job.minimumQualification, 'Master of Business Administration (M.B.A.)')
  assert.ok(job.requiredSkills.includes('Agile Project Management'))
  assert.match(job.jobDescription, /Develop and execute activities related to end-to-end project management/i)
  assert.match(job.jobDescription, /Manages technical components of moderately complex IT projects/i)
})

test('Kreeti Technologies scraper returns normalized first-party jobs from the verified public candidates flow', async () => {
  const kreeti = await loadKreetiTechnologiesModule()
  const requestedUrls = []

  const jobs = await kreeti.createKreetiTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === kreeti.HOMEPAGE_URL) return homepageHtml
      if (url === kreeti.CAREERS_HOME_URL) return careersHomeHtml
      if (url === kreeti.CANDIDATES_URL) return candidatesHtml
      if (url === 'https://careers.kreeti.com/jobs/48') return jobDetailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    kreeti.HOMEPAGE_URL,
    kreeti.CAREERS_HOME_URL,
    kreeti.CANDIDATES_URL,
    'https://careers.kreeti.com/jobs/48',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'kreetitechnologies')
  assert.equal(jobs[0].company, 'Kreeti Technologies')
  assert.equal(jobs[0].title, 'Agile Project Manager')
  assert.equal(jobs[0].jobId, '48')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].companyCareerPage, 'https://careers.kreeti.com/candidates')
  assert.equal(jobs[0].companyDomain, 'kreeti.com')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].jobType, 'Full-time Experienced')
  assert.equal(jobs[0].scrapedTimestamp?.toISOString(), '2026-07-11T00:00:00.000Z')
})

test('Kreeti Technologies scraper returns no jobs when the verified candidates page has no public job options', async () => {
  const kreeti = await loadKreetiTechnologiesModule()

  const jobs = await kreeti.createKreetiTechnologiesScraper().run({
    fetchText: async (url) => {
      if (url === kreeti.HOMEPAGE_URL) return homepageHtml
      if (url === kreeti.CAREERS_HOME_URL) return careersHomeHtml
      if (url === kreeti.CANDIDATES_URL) {
        return candidatesHtml.replace('<option value="48">Agile Project Manager</option>', '')
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Kreeti Technologies scraper fails closed when the verified first-party surface drifts', async () => {
  const kreeti = await loadKreetiTechnologiesModule()

  await assert.rejects(
    kreeti.createKreetiTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === kreeti.HOMEPAGE_URL) return '<html><body><h1>Unexpected homepage</h1></body></html>'
        if (url === kreeti.CAREERS_HOME_URL) return careersHomeHtml
        if (url === kreeti.CANDIDATES_URL) return candidatesHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    kreeti.createKreetiTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === kreeti.HOMEPAGE_URL) return homepageHtml
        if (url === kreeti.CAREERS_HOME_URL) return careersHomeHtml
        if (url === kreeti.CANDIDATES_URL) {
          return candidatesHtml
            .replace('<option value="48">Agile Project Manager</option>', '')
            .replace('No Open Positions', 'Open Positions')
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /candidate jobs page/i,
  )

  await assert.rejects(
    kreeti.createKreetiTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === kreeti.HOMEPAGE_URL) return homepageHtml
        if (url === kreeti.CAREERS_HOME_URL) return careersHomeHtml
        if (url === kreeti.CANDIDATES_URL) return candidatesHtml
        if (url === 'https://careers.kreeti.com/jobs/48') {
          return '<html><body><h1>Broken detail page</h1></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified first-party detail page/i,
  )
})
