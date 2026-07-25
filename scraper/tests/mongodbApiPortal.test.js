import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { runApiPortalScraper } from '../apiPortal/engine.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mongodb',
)

const readFixture = (name) =>
  JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

const provider = {
  source: 'mongodb',
  companyName: 'MongoDB',
  companyCareerPage: 'https://www.mongodb.com/company/careers/see-jobs',
  countryFilter: 'India',
  atsPlatform: 'greenhouse',
  config: {
    discovery: {
      careerPageUrl: 'https://www.mongodb.com/company/careers/see-jobs',
      listingApiUrl: 'https://boards-api.greenhouse.io/v1/boards/mongodb/jobs',
    },
    request: {
      method: 'GET',
      query: {
        content: 'true',
      },
    },
    pagination: {
      strategy: 'single-page',
      resultsPath: 'jobs',
      hasMorePath: 'hasMore',
    },
    mapping: {
      title: 'title',
      location: 'location.name',
      jobId: 'id',
      requisitionId: 'requisition_id',
      applyUrl: 'absolute_url',
      department: 'departments.0.name',
      employmentType: {
        path: 'metadata',
        find: { key: 'name', value: 'Employment Type' },
        valuePath: 'value',
      },
      jobDescription: 'content',
      postingDate: 'updated_at',
    },
    resultFilter: {
      include: [
        {
          field: 'location',
          pattern: 'india|bengaluru|bangalore|gurugram|gurgaon|mumbai|pune|hyderabad|chennai|noida',
        },
      ],
    },
  },
}

test('runApiPortalScraper maps MongoDB Greenhouse jobs and keeps only India roles', async () => {
  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async () => readFixture('greenhouse-jobs.json'),
  })

  assert.equal(jobs.length, 51)
  assert.deepEqual(jobs[0], {
    title: 'Account Executive, Acquisition/Growth',
    company: 'MongoDB',
    location: 'Bengaluru; Gurugram; Mumbai',
    city: 'Bengaluru; Gurugram; Mumbai',
    country: 'India',
    link: 'https://www.mongodb.com/careers/job/?gh_jid=7870623',
    applyUrl: 'https://www.mongodb.com/careers/job/?gh_jid=7870623',
    sourceUrl: 'https://www.mongodb.com/careers/job/?gh_jid=7870623',
    source: 'mongodb',
    jobId: 7870623,
    requisitionId: '426253',
    department: 'Sales APAC (India)',
    employmentType: 'Full-time',
    experienceRequired: null,
    jobDescription: jobs[0].jobDescription,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
    postingDate: '2026-06-18T15:34:16-04:00',
  })

  assert.match(jobs[0].jobDescription, /Come to MongoDB and get your Masters in Sales/i)
  assert.match(jobs[0].jobDescription, /&lt;h3&gt;The Opportunity&lt;\/h3&gt;/i)
  assert.ok(jobs.every((job) => /india|bengaluru|bangalore|gurugram|gurgaon|mumbai|pune|hyderabad|chennai|noida/i.test(job.location)))
})
