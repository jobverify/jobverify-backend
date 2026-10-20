import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublishingGapAtsScraper } from '../utils/publishingGapAts.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const provider = { source: 'example', companyName: 'Example', companyCareerPage: 'https://example.com/careers', atsPlatform: 'greenhouse', boardToken: 'example' }
const job = { id: 1, title: 'Engineer', location: { name: 'Bangalore, India' }, absolute_url: 'https://job-boards.greenhouse.io/example/jobs/1', content: '&lt;p&gt;Build software&lt;/p&gt;' }
const run = (payload, overrides = {}) => createPublishingGapAtsScraper({ ...provider, ...overrides }).run({ fetchJson: async () => payload })

test('Greenhouse maps complete inventory and excludes foreign and generic remote locations', async () => {
  const jobs = await run({ jobs: [job, { ...job, id: 2, location: { name: 'Remote' } }, { ...job, id: 3, location: { name: 'Boston, US' } }], meta: { total: 3 } })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Example')
  assert.equal(jobs[0].link, job.absolute_url)
  assert.match(jobs[0].jobDescription, /Build software/)
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 3)
  assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 1)
})

test('malformed, truncated, or failed inventory never becomes authoritative empty', async () => {
  await assert.rejects(run({ error: 'unavailable' }), /inventory/i)
  await assert.rejects(run({ jobs: [job], meta: { total: 2 } }), /incomplete/i)
  await assert.rejects(run({ jobs: [], hasMore: true }), /incomplete/i)
  await assert.rejects(run({ jobs: [{ ...job, absolute_url: null }] }), /application URL/i)
  await assert.rejects(createPublishingGapAtsScraper(provider).run({ fetchJson: async () => { throw new Error('HTTP 503') } }), /503/)
})

test('live empty and complete zero India inventory carry distinct evidence', async () => {
  assert.equal(readInventoryEvidence(await run({ jobs: [] })).status, 'verified-empty')
  const jobs = await run({ jobs: [{ ...job, location: { name: 'Boston, US' } }] })
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs).status, 'complete-inventory')
  assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 0)
})

test('Ashby includes India secondary locations and preserves missing descriptions for downstream validation', async () => {
  const jobs = await run({ jobs: [{ id: 'a', title: 'Engineer', location: 'London', secondaryLocations: [{ location: 'Bengaluru, India' }], jobUrl: 'https://jobs.ashbyhq.com/example/a', applyUrl: 'https://jobs.ashbyhq.com/example/a/application', isListed: true }] }, { atsPlatform: 'ashby' })
  assert.equal(jobs.length, 1)
  assert.match(jobs[0].location, /Bengaluru/)
  assert.equal(jobs[0].jobDescription, null)
})

test('Lever includes all description sections, filters talent pools, and does not invent posting dates', async () => {
  const record = { id: 'x', text: 'Engineer', categories: { location: 'Hyderabad India' }, hostedUrl: 'https://jobs.lever.co/example/x', applyUrl: 'https://jobs.lever.co/example/x/apply', descriptionPlain: 'Overview', lists: [{ text: 'Requirements', content: '<li>JavaScript</li>' }], additionalPlain: 'Benefits' }
  const jobs = await run([record, { ...record, id: 'y', text: 'Talent Community' }], { atsPlatform: 'lever' })
  assert.equal(jobs.length, 1)
  assert.match(jobs[0].jobDescription, /Overview[\s\S]*JavaScript[\s\S]*Benefits/)
  assert.equal(jobs[0].postingDate, null)
})
