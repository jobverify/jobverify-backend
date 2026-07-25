import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper filters AppViewX Greenhouse jobs to India-facing locations', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'appviewx')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async () => ({
      jobs: [
        {
          id: 6022033004,
          title: 'Engineering Manager, AI',
          location: { name: 'Bangalore' },
          absolute_url: 'https://job-boards.greenhouse.io/appviewx/jobs/6022033004',
          departments: [{ name: 'Engineering' }],
          content: '<p>Lead AI platform engineering teams.</p>',
          updated_at: '2026-06-22T09:00:00Z',
        },
        {
          id: 6022033005,
          title: 'Account Executive',
          location: { name: 'Austin, Texas, United States' },
          absolute_url: 'https://job-boards.greenhouse.io/appviewx/jobs/6022033005',
          departments: [{ name: 'Sales' }],
          content: '<p>Grow enterprise accounts.</p>',
          updated_at: '2026-06-20T09:00:00Z',
        },
      ],
    }),
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Engineering Manager, AI',
    company: 'AppViewX',
    location: 'Bangalore',
    city: 'Bangalore',
    country: 'India',
    link: 'https://job-boards.greenhouse.io/appviewx/jobs/6022033004',
    applyUrl: 'https://job-boards.greenhouse.io/appviewx/jobs/6022033004',
    sourceUrl: 'https://job-boards.greenhouse.io/appviewx/jobs/6022033004',
    source: 'appviewx',
    jobId: 6022033004,
    requisitionId: null,
    department: 'Engineering',
    employmentType: null,
    experienceRequired: null,
    jobDescription: '<p>Lead AI platform engineering teams.</p>',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-22T09:00:00Z',
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
