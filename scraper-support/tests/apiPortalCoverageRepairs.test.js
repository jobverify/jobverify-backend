import assert from 'node:assert/strict'
import test from 'node:test'
import { getScraperCatalog, createCatalogScraper } from '../providers/index.js'
import { readInventoryEvidence, isFreshCompleteInventoryEvidence } from '../utils/inventoryEvidence.js'

// Representative native contracts, not captured live responses. See the public
// Lever Postings API and Greenhouse Job Board API schemas.
const catalog = getScraperCatalog()
const runRegistered = (t, source, payload) => {
  const provider = catalog.find(row => row.source === source)
  assert.ok(provider, `registered provider ${source}`)
  t.mock.method(globalThis, 'fetch', async url => {
    const endpoint = new URL(url)
    assert.equal(endpoint.origin + endpoint.pathname, provider.config.discovery.listingApiUrl)
    return Response.json(payload)
  })
  return createCatalogScraper(provider).run()
}

const leverJob = (board, id, location = 'Bengaluru, India') => ({
  id, text: 'Software Engineer', country: 'IN',
  categories: { location, department: 'Engineering', commitment: 'Full-time' },
  hostedUrl: `https://jobs.lever.co/${board}/${id}`,
  applyUrl: `https://jobs.lever.co/${board}/${id}/apply`,
  descriptionPlain: 'Develop reliable payment services.',
  description: '<p>Develop reliable payment services.</p>',
  lists: [{ text: 'Responsibilities', content: '<li>Maintain payment APIs.</li>' },
    { text: 'Qualifications', content: '<li>Experience with distributed systems.</li>' }],
  additionalPlain: 'Employer benefits include paid leave.',
  additional: '<p>Employer benefits include paid leave.</p>',
})

for (const [source, board] of [['asapp', 'asapp-2'], ['watchguard', 'watchguard']]) {
  test(`${source} registered scraper retains every native Lever description section`, async t => {
    const jobs = await runRegistered(t, source, [leverJob(board, 'india-role'),
      { ...leverJob(board, 'foreign-role', 'Boston, United States'), country: 'US' }])
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].source, source)
    assert.equal(jobs[0].jobId, 'india-role')
    assert.equal(jobs[0].jobDescription, 'Develop reliable payment services.\n\nResponsibilities\n<li>Maintain payment APIs.</li>\n\nQualifications\n<li>Experience with distributed systems.</li>\n\nEmployer benefits include paid leave.')
    assert.equal(jobs[0].postingDate, undefined)
    assert.equal(isFreshCompleteInventoryEvidence(readInventoryEvidence(jobs)), true)
  })

  test(`${source} native foreign countries cannot inflate the India facet or require foreign descriptions`, async t => {
    const record = { ...leverJob(board, 'foreign-only', 'Padova'), country: 'IT',
      descriptionPlain: '', description: '', lists: [], additionalPlain: '', additional: '' }
    const jobs = await runRegistered(t, source, [record])
    assert.equal(jobs.length, 0)
    assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 0)
    assert.equal(readInventoryEvidence(jobs).listingComplete, true)
  })

  test(`${source} contradictory native country and India location cannot certify a source check`, async t => {
    await assert.rejects(runRegistered(t, source, [{ ...leverJob(board, 'contradictory'), country: 'US' }]), /contradictory country\/location/i)
  })

  test(`${source} an unresolved alternate location keeps the India facet unknown`, async t => {
    const record = { ...leverJob(board, 'ambiguous', 'Boston, United States'), country: 'US' }
    record.categories.allLocations = ['Boston, United States', 'Remote']
    const jobs = await runRegistered(t, source, [record])
    assert.equal(jobs.length, 0)
    assert.equal(readInventoryEvidence(jobs).listingComplete, false)
    assert.equal(readInventoryEvidence(jobs).indiaFacetCount, null)
  })
}

test('Lever HTML sections survive empty plain-text variants', async t => {
  const row = { ...leverJob('asapp-2', 'html-role'), descriptionPlain: ' ', additionalPlain: '',
    description: '<p>Build employer infrastructure.</p>', additional: '<p>Paid annual leave.</p>' }
  const jobs = await runRegistered(t, 'asapp', [row])
  assert.match(jobs[0].jobDescription, /^<p>Build employer infrastructure\.<\/p>/)
  assert.match(jobs[0].jobDescription, /Maintain payment APIs/)
  assert.match(jobs[0].jobDescription, /<p>Paid annual leave\.<\/p>$/)
  assert.equal(readInventoryEvidence(jobs).listingComplete, true)
})

test('Lever section headings alone do not manufacture a description', async t => {
  const row = { ...leverJob('asapp-2', 'empty-role'), descriptionPlain: '', description: '<p> </p>',
    additionalPlain: '', additional: '', lists: [{ text: 'Responsibilities', content: '<ul></ul>' }] }
  const jobs = await runRegistered(t, 'asapp', [row])
  assert.equal(jobs[0].jobDescription, null)
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.equal(jobs[0].sourceListingComplete, false)
})

const greenhouseJob = (id, location = 'Bengaluru, India') => ({
  id, internal_job_id: id + 100, title: 'Software Engineer', location: { name: location },
  absolute_url: `https://job-boards.greenhouse.io/cloudflare/jobs/${id}`,
  content: '<p>Develop and operate edge network services.</p>',
})

test('Cloudflare reconciles the native total without requiring a non-native hasMore flag', async t => {
  const jobs = await runRegistered(t, 'cloudflare', { jobs: [greenhouseJob(1), greenhouseJob(2, 'Austin, United States')], meta: { total: 2 } })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, 1)
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 2)
  assert.equal(isFreshCompleteInventoryEvidence(readInventoryEvidence(jobs)), true)
  assert.notEqual(jobs[0].sourceListingComplete, false)
})

test('Cloudflare missing native total cannot authorize empty inventory', async t => {
  const jobs = await runRegistered(t, 'cloudflare', { jobs: [] })
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.equal(readInventoryEvidence(jobs).reportedTotal, null)
})

test('Cloudflare truncated listing cannot authorize cleanup', async t => {
  const jobs = await runRegistered(t, 'cloudflare', { jobs: [greenhouseJob(1)], meta: { total: 2 } })
  assert.equal(jobs.length, 1)
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.equal(jobs[0].sourceListingComplete, false)
})

test('Cloudflare does not select Indiana or Indianapolis through an India substring match', async t => {
  const jobs = await runRegistered(t, 'cloudflare', { jobs: [greenhouseJob(1),
    greenhouseJob(2, 'Indiana, United States'), greenhouseJob(3, 'Indianapolis, United States')], meta: { total: 3 } })
  assert.deepEqual(jobs.map(job => job.jobId), [1])
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 3)
})
