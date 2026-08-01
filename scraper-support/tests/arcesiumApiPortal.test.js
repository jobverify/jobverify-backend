import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper maps Arcesium Greenhouse jobs from the official board', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'arcesium')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async (url) => {
      if (url.includes('boards-api.greenhouse.io')) {
        return {
          jobs: [
            {
              id: 1234567,
              title: 'Software Engineer',
              location: { name: 'Hyderabad, India' },
              requisition_id: 'ARC-123',
              absolute_url: 'https://job-boards.greenhouse.io/arcesiumllc/jobs/1234567',
              departments: [{ name: 'Engineering' }],
              updated_at: '2026-07-13T00:00:00Z',
              content: '<p>Build core data systems for financial platforms.</p>',
            },
          ],
        }
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Software Engineer',
    company: 'Arcesium',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    link: 'https://job-boards.greenhouse.io/arcesiumllc/jobs/1234567',
    applyUrl: 'https://job-boards.greenhouse.io/arcesiumllc/jobs/1234567',
    sourceUrl: 'https://job-boards.greenhouse.io/arcesiumllc/jobs/1234567',
    source: 'arcesium',
    jobId: 1234567,
    requisitionId: 'ARC-123',
    department: 'Engineering',
    employmentType: null,
    experienceRequired: null,
    postingDate: '2026-07-13T00:00:00Z',
    jobDescription: '<p>Build core data systems for financial platforms.</p>',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
