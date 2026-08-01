import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper filters Celigo Greenhouse jobs to India-facing locations', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'celigo')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async () => ({
      jobs: [
        {
          id: 7724420003,
          title: 'Senior Software Engineer',
          location: { name: 'Hyderabad, India' },
          absolute_url: 'https://job-boards.greenhouse.io/celigo/jobs/7724420003',
          departments: [{ name: 'Engineering' }],
          content: '<p>Build integration automation features.</p>',
          updated_at: '2026-07-06T09:00:00Z',
        },
        {
          id: 7724420004,
          title: 'Customer Success Manager',
          location: { name: 'Redwood City, California, United States' },
          absolute_url: 'https://job-boards.greenhouse.io/celigo/jobs/7724420004',
          departments: [{ name: 'Customer Success' }],
          content: '<p>Support North America customers.</p>',
          updated_at: '2026-07-05T09:00:00Z',
        },
      ],
    }),
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Software Engineer',
    company: 'Celigo',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    link: 'https://job-boards.greenhouse.io/celigo/jobs/7724420003',
    applyUrl: 'https://job-boards.greenhouse.io/celigo/jobs/7724420003',
    sourceUrl: 'https://job-boards.greenhouse.io/celigo/jobs/7724420003',
    source: 'celigo',
    jobId: 7724420003,
    requisitionId: null,
    department: 'Engineering',
    employmentType: null,
    experienceRequired: null,
    jobDescription: '<p>Build integration automation features.</p>',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-06T09:00:00Z',
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
