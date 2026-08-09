import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper filters Arcadia Greenhouse jobs to India-facing locations', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'arcadia')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async () => ({
      jobs: [
        {
          id: 8482105002,
          title: 'Senior Analyst, Data Operations',
          requisition_id: 'ARC-502',
          location: { name: 'Chennai, Tamil Nadu, India' },
          absolute_url: 'https://job-boards.greenhouse.io/arcadiacareers/jobs/8482105002',
          departments: [{ name: 'Operations' }],
          content: '<p>Support Arcadia data operations workflows from Chennai.</p>',
          updated_at: '2026-07-09T09:00:00Z',
        },
        {
          id: 8482105003,
          title: 'Senior Product Manager',
          requisition_id: 'ARC-503',
          location: { name: 'Washington, District of Columbia, United States' },
          absolute_url: 'https://job-boards.greenhouse.io/arcadiacareers/jobs/8482105003',
          departments: [{ name: 'Product' }],
          content: '<p>Lead platform strategy for US teams.</p>',
          updated_at: '2026-07-09T09:00:00Z',
        },
      ],
    }),
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Analyst, Data Operations',
    company: 'Arcadia',
    location: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    country: 'India',
    link: 'https://job-boards.greenhouse.io/arcadiacareers/jobs/8482105002',
    applyUrl: 'https://job-boards.greenhouse.io/arcadiacareers/jobs/8482105002',
    sourceUrl: 'https://job-boards.greenhouse.io/arcadiacareers/jobs/8482105002',
    source: 'arcadia',
    jobId: 8482105002,
    requisitionId: 'ARC-502',
    department: 'Operations',
    employmentType: null,
    experienceRequired: null,
    jobDescription: '<p>Support Arcadia data operations workflows from Chennai.</p>',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09T09:00:00Z',
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
