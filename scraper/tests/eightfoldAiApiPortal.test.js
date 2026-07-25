import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper maps Eightfold AI jobs from the public Eightfold career hub', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'eightfoldai')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async (url) => {
      if (url.includes('/api/pcsx/search')) {
        return {
          data: {
            positions: [
              {
                id: 8342001,
                displayJobId: 'EF-101',
                name: 'Senior Software Engineer',
                locations: ['Bengaluru, Karnataka, India'],
                department: 'Engineering',
                postedTs: 1783000000,
              },
            ],
            count: 1,
          },
        }
      }

      if (url.includes('position_id=8342001')) {
        return {
          data: {
            publicUrl: 'https://app.eightfold.ai/careers/job/8342001',
            jobDescription: '<p>Build AI-powered talent products.</p>',
          },
        }
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Software Engineer',
    company: 'Eightfold AI',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    country: 'India',
    link: 'https://app.eightfold.ai/careers/job/8342001',
    applyUrl: 'https://app.eightfold.ai/careers/job/8342001',
    sourceUrl: 'https://app.eightfold.ai/careers/job/8342001',
    source: 'eightfoldai',
    jobId: 8342001,
    requisitionId: 'EF-101',
    department: 'Engineering',
    employmentType: null,
    experienceRequired: null,
    postingDate: 1783000000,
    jobDescription: '<p>Build AI-powered talent products.</p>',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
