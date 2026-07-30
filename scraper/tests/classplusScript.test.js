import assert from 'node:assert/strict'
import test from 'node:test'

import {
  API_URL,
  CAREERS_URL,
  createClassplusScraper,
  extractJobs,
} from '../classplus/script.js'

test('uses the first-party Classplus careers page and public jobs API', () => {
  assert.equal(CAREERS_URL, 'https://classplusapp.com/careers/open-role')
  assert.equal(API_URL, 'https://crm.classplus.co/ts/jobs/get-job-list?')
})

test('normalizes public Classplus jobs and preserves the public detail URL', async () => {
  const requests = []
  const scraper = createClassplusScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requests.push(url)
      return {
        data: {
          Jobs: [
            {
              jobId: 'cp-123',
              title: 'Senior Backend Engineer',
              department: 'Engineering',
              parentDepartment: 'Engineering Team',
              locationCity: 'Noida',
              employeeType: 'Full-time',
              jobDescription: '<p>Build reliable services.</p>',
            },
          ],
        },
      }
    },
  })

  assert.deepEqual(requests, [API_URL])
  assert.deepEqual(extractJobs({ data: { Jobs: [] } }), [])
  assert.equal(jobs.length, 1)
  const { scrapedAt, ...job } = jobs[0]
  assert.deepEqual(job, {
    title: 'Senior Backend Engineer',
    company: 'Classplus',
    department: 'Engineering',
    location: 'Noida',
    city: 'Noida',
    country: 'India',
    jobId: 'cp-123',
    requisitionId: 'cp-123',
    sourceUrl: 'https://classplusapp.com/careers/job-description?jobId=cp-123',
    applyUrl: 'https://classplusapp.com/careers/job-description?jobId=cp-123',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build reliable services.',
    remoteStatus: 'On-site',
    source: 'classplus',
    link: 'https://classplusapp.com/careers/job-description?jobId=cp-123',
  })
  assert.match(scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
