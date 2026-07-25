import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'darwinbox',
)

const readJsonFixture = (name) =>
  JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

const clone = (value) => JSON.parse(JSON.stringify(value))

const scraper = createDarwinboxScraper()
const happiestMindsHostedScraper = createDarwinboxScraper({
  companyName: 'Happiest Minds',
  source: 'happiestminds',
  origin: 'https://smileshrms.darwinbox.com',
})

test('buildListingApiUrl and buildJobDetailUrl keep Darwinbox links on the public candidate routes', () => {
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://dbx.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    scraper.buildJobDetailUrl('a6a3a53d1e7f39'),
    'https://dbx.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3a53d1e7f39',
  )
})

test('createDarwinboxScraper supports customer-hosted Darwinbox origins without changing the job payload contract', () => {
  assert.equal(
    happiestMindsHostedScraper.buildCareersPageUrl(),
    'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    happiestMindsHostedScraper.buildListingApiUrl(),
    'https://smileshrms.darwinbox.com/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    happiestMindsHostedScraper.buildJobDetailUrl('a68875230db751'),
    'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a68875230db751',
  )

  const jobs = happiestMindsHostedScraper.extractSearchResults({
    data: [
      {
        id: 'a68875230db751',
        title: 'Module Lead',
        department_name: 'MICROSOFT',
        locations: 'Pune, Maharashtra\r, India',
        country: 'India',
        emp_type_name: 'PERMANENT',
        experience: '5 - 7 Years',
        posted_on: '28-Jul-2025',
        jd: '<p>Back end developer with some experience in front end development</p>',
      },
    ],
  })

  assert.deepEqual(jobs, [
    {
      title: 'Module Lead',
      company: 'Happiest Minds',
      department: 'MICROSOFT',
      location: 'Pune, Maharashtra , India',
      city: 'Pune',
      jobId: 'a68875230db751',
      requisitionId: null,
      sourceUrl: 'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a68875230db751',
      applyUrl: 'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a68875230db751',
      employmentType: 'PERMANENT',
      experienceRequired: '5 - 7 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '28-Jul-2025',
      closingDate: null,
      jobDescription: '<p>Back end developer with some experience in front end development</p>',
    },
  ])
})

test('extractSearchResults keeps India jobs from the Darwinbox listings payload and builds stable detail links', () => {
  const payload = readJsonFixture('darwinbox-alljobs-response-body.json')
  const jobs = scraper.extractSearchResults(payload)

  assert.equal(jobs.length, 9)
  assert.deepEqual(jobs[0], {
    title: 'Sr. Specialist/Manager - Revenue Operations - Customer Success Operations',
    company: 'Darwinbox',
    department: 'Finance and Legal',
    location: 'Hyderabad, Telangana , India',
    city: 'Hyderabad',
    jobId: 'a6a3a53d1e7f39',
    requisitionId: null,
    sourceUrl: 'https://dbx.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3a53d1e7f39',
    applyUrl: 'https://dbx.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3a53d1e7f39',
    employmentType: 'Full-time',
    experienceRequired: '2 - 6 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '23-Jun-2026',
    closingDate: null,
    jobDescription: jobs[0].jobDescription,
  })
  assert.match(jobs[0].jobDescription, /<p/i)
})

test('run paginates Darwinbox listing pages through an injected page fetcher and filters non-India jobs', async () => {
  const livePayload = readJsonFixture('darwinbox-alljobs-response-body.json')
  const indiaJob = clone(livePayload.data[0])
  const secondIndiaJob = clone(livePayload.data[1])
  const usJob = {
    ...clone(livePayload.data[0]),
    id: 'darwinbox-us-1',
    title: 'Senior Specialist - Revenue Operations - United States',
    locations: 'Dallas, Texas, United States',
    country: 'United States',
    posted_on: '21-Jun-2026',
  }

  const firstPage = {
    status: 'success',
    data: [indiaJob, usJob],
    job_counts: 11,
  }
  const secondPage = {
    status: 'success',
    data: [secondIndiaJob],
    job_counts: 11,
  }

  const requestedPages = []
  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      if (page === 1) return firstPage
      if (page === 2) return secondPage
      throw new Error(`Unexpected Darwinbox page request: ${page}`)
    },
  })

  assert.deepEqual(requestedPages, [1, 2])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].jobId, indiaJob.id)
  assert.equal(jobs[1].jobId, secondIndiaJob.id)
  assert.equal(
    jobs[1].sourceUrl,
    `https://dbx.darwinbox.in/ms/candidatev2/main/careers/jobDetails/${secondIndiaJob.id}`,
  )
})
