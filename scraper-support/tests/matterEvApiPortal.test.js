import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

const listingsPayload = {
  data: [
    {
      job_id: 'MTR-101',
      job_title: 'Software Engineer, Battery Intelligence',
      location: 'Ahmedabad, India',
      functional_name: 'Engineering',
      type: 'full-time',
      description: 'Build battery intelligence platform features for electric vehicles.',
      updated_at: '2026-07-08T10:00:00Z',
    },
  ],
}

test('runApiPortalScraper maps Matter EV jobs from the official listings API', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'matterev')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async (url, options = {}) => {
      assert.equal(
        url,
        'https://matter-backend-integration-service.azurewebsites.net/api/getJobs',
      )
      assert.equal(options.method, 'GET')
      assert.deepEqual(options.headers, {
        'Content-Type': 'application/json',
        'x-functions-key': 'h1MQWjCB_Nitd4ox2hdQgrQ_brKqzPDp4YsjJPis0vRlAzFu4LCjxg==',
      })
      assert.equal(options.body, undefined)
      return listingsPayload
    },
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Software Engineer, Battery Intelligence',
    company: 'Matter EV',
    location: 'Ahmedabad, India',
    city: 'Ahmedabad',
    country: 'India',
    link: 'https://www.matter.in/careers?job=MTR-101',
    applyUrl: 'https://www.matter.in/careers?apply=MTR-101',
    sourceUrl: 'https://www.matter.in/careers?job=MTR-101',
    source: 'matterev',
    jobId: 'MTR-101',
    requisitionId: 'MTR-101',
    department: 'Engineering',
    employmentType: 'Full-time',
    experienceRequired: null,
    postingDate: '2026-07-08T10:00:00Z',
    jobDescription: 'Build battery intelligence platform features for electric vehicles.',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
