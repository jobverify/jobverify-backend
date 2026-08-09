import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMPANY,
  GREENHOUSE_API_URL,
  createTripadvisorScraper,
  extractJobsFromGreenhousePayload,
} from './script.js'

test('Tripadvisor maps only valid India jobs from the official Greenhouse feed', async () => {
  const payload = {
    jobs: [
      {
        id: 123,
        title: 'Senior Software Engineer',
        location: { name: 'Bengaluru, India' },
        departments: [{ name: 'Engineering & Technology' }],
        absolute_url: 'https://job-boards.greenhouse.io/tripadvisor/jobs/123',
        content: '<p>Build travel products &amp; services.</p>',
        first_published: '2026-07-25T00:00:00Z',
      },
      {
        id: 456,
        title: 'Product Manager',
        location: { name: 'London, United Kingdom' },
        absolute_url: 'https://job-boards.greenhouse.io/tripadvisor/jobs/456',
      },
      { title: 'Missing detail URL', location: { name: 'Pune, India' } },
    ],
  }

  assert.deepEqual(extractJobsFromGreenhousePayload(payload), [{
    title: 'Senior Software Engineer',
    company: COMPANY,
    department: 'Engineering & Technology',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '123',
    requisitionId: '',
    sourceUrl: 'https://job-boards.greenhouse.io/tripadvisor/jobs/123',
    applyUrl: 'https://job-boards.greenhouse.io/tripadvisor/jobs/123',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-25',
    closingDate: null,
    jobDescription: 'Build travel products & services.',
  }])
})

test('Tripadvisor scraper requests the official Greenhouse API and adds run metadata', async () => {
  const jobs = await createTripadvisorScraper().run({
    fetchJson: async (url) => {
      assert.equal(url, GREENHOUSE_API_URL)
      return { jobs: [{ id: 1, title: 'India role', location: { name: 'India' }, absolute_url: 'https://example.test/1' }] }
    },
    now: () => '2026-07-25T12:00:00.000Z',
  })

  assert.equal(jobs[0].source, 'tripadvisor')
  assert.equal(jobs[0].link, 'https://example.test/1')
  assert.equal(jobs[0].scrapedAt, '2026-07-25T12:00:00.000Z')
})
