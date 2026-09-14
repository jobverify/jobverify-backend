import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzePublishableJobs } from '../utils/publishableJobMetrics.js'

test('keeps an open India job posted more than sixty days ago', () => {
  const result = analyzePublishableJobs([{
    title: 'Open legacy role',
    location: 'Bengaluru, India',
    applyUrl: 'https://example.com/jobs/open-legacy-role',
    postingDate: '2026-05-01',
  }], { now: new Date('2026-09-12T12:00:00.000Z') })

  assert.equal(result.eligibleJobs.length, 1)
  assert.equal(result.filterCounts.old, 0)
})

test('rejects historic aggregate opening sentinels while preserving individual vacancies', () => {
  const result = analyzePublishableJobs([
    { title: 'Current remote openings at Example', jobId: 'example-current-openings', location: 'India', applyUrl: 'https://himalayas.app/companies/example' },
    { title: 'Current openings at Example', requisitionId: 'example-current-openings', location: 'India', applyUrl: 'https://wellfound.com/company/example/jobs' },
    { title: 'Software Engineer', jobId: 'real-1', location: 'India', applyUrl: 'https://example.test/jobs/real-1' },
  ])
  assert.deepEqual(result.eligibleJobs.map((job) => job.jobId), ['real-1'])
  assert.equal(result.filterCounts.nonJob, 2)
})

test('email application roles remain publishable when the verified public role page is available', () => {
  const result = analyzePublishableJobs([
    { title: 'Lead Engineer', location: 'Chennai, India', applyUrl: 'mailto:jobs@example.com?subject=Lead%20Engineer', sourceUrl: 'https://example.com/careers#lead-engineer' },
    { title: 'Unlinked role', location: 'Chennai, India', applyUrl: 'mailto:jobs@example.com' },
  ])
  assert.equal(result.eligibleJobs.length, 1)
  assert.equal(result.eligibleJobs[0].title, 'Lead Engineer')
  assert.equal(result.filterCounts.invalidUrl, 1)
})

test('an unsafe application scheme is rejected even if a source URL exists', () => {
  const result = analyzePublishableJobs([{ title: 'Engineer', location: 'India', applyUrl: 'javascript:alert(1)', sourceUrl: 'https://example.com/careers' }])
  assert.equal(result.eligibleJobs.length, 0)
  assert.equal(result.filterCounts.invalidUrl, 1)
})
