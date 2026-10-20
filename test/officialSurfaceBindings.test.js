import assert from 'node:assert/strict'
import test from 'node:test'
import { getScraperCatalog, createCatalogScraper } from '../scraper-support/providers/index.js'
import { readInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'

const provider = source => getScraperCatalog().find(row => row.source === source)

test('1X enumerates its verified Ashby board and keeps foreign inventory distinct from an empty board', async () => {
  const jobs = await createCatalogScraper(provider('1x')).run({ fetchJson: async url => {
    assert.equal(url, 'https://api.ashbyhq.com/posting-api/job-board/1x')
    return { jobs: [{ id: 'fixture-us', title: 'Software Engineer', location: 'Palo Alto, California, United States',
      jobUrl: 'https://jobs.ashbyhq.com/1x/fixture-us', applyUrl: 'https://jobs.ashbyhq.com/1x/fixture-us/application',
      descriptionPlain: 'Build reliable robotics software.', isListed: true }] }
  } })
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs)?.status, 'complete-inventory')
  assert.equal(readInventoryEvidence(jobs)?.reportedTotal, 1)
})

test('Abridge uses the case-sensitive verified board and returns actual role content', async () => {
  const jobs = await createCatalogScraper(provider('abridge')).run({ fetchJson: async url => {
    assert.equal(url, 'https://api.ashbyhq.com/posting-api/job-board/Abridge')
    return { jobs: [{ id: 'fixture-in', title: 'Software Engineer', location: 'Bengaluru, India',
      jobUrl: 'https://jobs.ashbyhq.com/Abridge/fixture-in', applyUrl: 'https://jobs.ashbyhq.com/Abridge/fixture-in/application',
      descriptionPlain: 'Build reliable healthcare software.', isListed: true }] }
  } })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'abridge')
  assert.match(jobs[0].jobDescription, /healthcare software/)
  assert.equal(readInventoryEvidence(jobs)?.listingComplete, true)
})

test('3M executes its official Workday Search board with an explicit India facet', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (options.method !== 'POST') return new Response('<html>Workday careers</html>')
    calls += 1
    assert.equal(String(url), 'https://3m.wd1.myworkdayjobs.com/wday/cxs/3m/Search/jobs')
    const body = JSON.parse(options.body)
    assert.deepEqual(body.appliedFacets.locationCountry, ['c4f78be1a8f14da0ab49ce1162348a5e'])
    return new Response(JSON.stringify({ total: 0, jobPostings: [] }), { headers: { 'content-type': 'application/json' } })
  })
  const jobs = await createCatalogScraper(provider('3m')).run()
  assert.equal(calls, 1)
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs)?.status, 'verified-empty')
})
