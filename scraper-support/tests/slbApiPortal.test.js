import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper maps SLB Eightfold jobs with source and apply URL overrides while keeping India roles', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'slb')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async (url) => {
      if (url.includes('/api/pcsx/search')) {
        return {
          data: {
            positions: [
              {
                id: 5001,
                displayJobId: 'R-5001',
                name: 'Senior Data Engineer',
                locations: ['Pune, Maharashtra, India'],
                department: 'Digital',
                postedTs: 1783600000,
              },
              {
                id: 5002,
                displayJobId: 'R-5002',
                name: 'Reservoir Simulation Engineer',
                locations: ['Houston, Texas, United States'],
                department: 'Reservoir',
                postedTs: 1783601000,
              },
            ],
            count: 2,
          },
        }
      }

      if (url.includes('position_id=5001')) {
        return {
          data: {
            publicUrl: 'https://apply.slb.com/careers/job/5001-senior-data-engineer?domain=slb.com',
            jobDescription: '<p>Build drilling and reservoir data platforms.</p>',
          },
        }
      }

      if (url.includes('position_id=5002')) {
        return {
          data: {
            publicUrl: 'https://apply.slb.com/careers/job/5002-reservoir-simulation-engineer?domain=slb.com',
            jobDescription: '<p>Support reservoir modeling teams in Houston.</p>',
          },
        }
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Data Engineer',
    company: 'SLB',
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    link: 'https://apply.slb.com/careers/job/5001',
    applyUrl: 'https://apply.slb.com/careers/apply?pid=5001&domain=slb.com',
    sourceUrl: 'https://apply.slb.com/careers/job/5001',
    source: 'slb',
    jobId: 5001,
    requisitionId: 'R-5001',
    department: 'Digital',
    employmentType: null,
    experienceRequired: null,
    postingDate: 1783600000,
    jobDescription: '<p>Build drilling and reservoir data platforms.</p>',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
})
