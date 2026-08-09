import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper filters Mitsogo Greenhouse jobs to India-facing locations', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'mitsogo')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async () => ({
      jobs: [
        {
          id: 5176870008,
          title: 'Lead Software Engineer - Data',
          requisition_id: 'MITSOGO-001',
          location: { name: 'Bengaluru, India' },
          absolute_url: 'https://job-boards.greenhouse.io/mitsogoinc/jobs/5176870008',
          departments: [{ name: 'Engineering' }],
          content: '<p>Build device-management and data-platform systems.</p>',
          updated_at: '2026-07-09T09:00:00Z',
        },
        {
          id: 5176870009,
          title: 'Sales Director - Strategic Accounts',
          location: { name: 'Dubai, United Arab Emirates' },
          absolute_url: 'https://job-boards.greenhouse.io/mitsogoinc/jobs/5176870009',
          departments: [{ name: 'Sales' }],
          content: '<p>Lead regional enterprise sales.</p>',
          updated_at: '2026-07-09T09:00:00Z',
        },
      ],
    }),
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Lead Software Engineer - Data',
    company: 'Mitsogo Inc',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    link: 'https://job-boards.greenhouse.io/mitsogoinc/jobs/5176870008',
    applyUrl: 'https://job-boards.greenhouse.io/mitsogoinc/jobs/5176870008',
    sourceUrl: 'https://job-boards.greenhouse.io/mitsogoinc/jobs/5176870008',
    source: 'mitsogo',
    jobId: 5176870008,
    requisitionId: 'MITSOGO-001',
    department: 'Engineering',
    employmentType: null,
    experienceRequired: null,
    jobDescription: '<p>Build device-management and data-platform systems.</p>',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09T09:00:00Z',
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
