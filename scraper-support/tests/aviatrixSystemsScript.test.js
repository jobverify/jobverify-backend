import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createAviatrixSystemsScraper } from '../../scraper/aviatrixsystems/script.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const capture = JSON.parse(readFileSync(new URL('../../scraper/aviatrixsystems/fixtures/jobs-response.json', import.meta.url), 'utf8'))
const payload = () => JSON.parse(capture.body)
const offices = JSON.parse(JSON.parse(readFileSync(new URL('../../scraper/aviatrixsystems/fixtures/offices-response.json', import.meta.url), 'utf8')).body)
const fetchNative = native => async url => url.includes('/offices?') ? offices : native

test('Aviatrix Systems extracts the five native India vacancies and preserves their identity and content', async () => {
  const native = payload()
  const calls = []
  const jobs = await createAviatrixSystemsScraper().run({ fetchJson: async (url, options) => {
    calls.push(url)
    assert.ok(options.signal)
    return fetchNative(native)(url)
  } })
  assert.deepEqual(calls, ['https://boards-api.greenhouse.io/v1/boards/aviatrix/jobs?content=true',
    'https://boards-api.greenhouse.io/v1/boards/aviatrix/offices?render_as=tree'])
  assert.deepEqual(jobs.map(job => String(job.jobId)).sort(), ['4642996005', '4644128005', '4679475005', '4732064005', '4741459005'])
  for (const job of jobs) {
    const original = native.jobs.find(row => String(row.id) === String(job.jobId))
    assert.equal(job.source, 'aviatrixsystems')
    assert.equal(job.company, 'Aviatrix Systems')
    assert.equal(job.applyUrl, original.absolute_url)
    assert.equal(job.postingDate, original.first_published)
    assert.equal(job.jobDescription, original.content)
  }
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.listingComplete, true)
  assert.equal(evidence.reportedTotal, 17)
  assert.equal(evidence.indiaFacetCount, 5)
})

test('Aviatrix Systems records verified empty evidence only for a validated empty response', async () => {
  const jobs = await createAviatrixSystemsScraper().run({ fetchJson: fetchNative({ jobs: [], meta: { total: 0 } }) })
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs).status, 'verified-empty')
})

for (const [name, change] of [
  ['truncated totals', p => { p.meta.total++ }],
  ['duplicate job IDs', p => { p.jobs[1].id = p.jobs[0].id }],
  ['foreign employer', p => { p.jobs[0].company_name = 'Unrelated employer' }],
  ['foreign application URL', p => { p.jobs[0].absolute_url = 'https://example.test/apply' }],
  ['mismatched application identity', p => { p.jobs[0].absolute_url = 'https://aviatrix.com/careers/?gh_jid=123' }],
  ['HTTP-success error envelopes', p => { p.error = 'unavailable' }],
]) test(`Aviatrix Systems rejects ${name}`, async () => {
  const native = payload()
  change(native)
  await assert.rejects(createAviatrixSystemsScraper().run({ fetchJson: fetchNative(native) }))
})

test('Aviatrix Systems retains descriptionless India vacancies and incomplete detail evidence', async () => {
  const native = payload()
  native.jobs.find(job => job.id === 4741459005).content = ''
  const jobs = await createAviatrixSystemsScraper().run({ fetchJson: fetchNative(native) })
  assert.equal(jobs.length, 5)
  assert.equal(jobs.find(job => job.jobId === 4741459005).jobDescription, '')
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
})

test('Aviatrix Systems cannot treat ambiguous location scope as complete inventory', async () => {
  const native = payload()
  native.jobs[0].location.name = 'Remote'
  native.jobs[0].offices = []
  const jobs = await createAviatrixSystemsScraper().run({ fetchJson: fetchNative(native) })
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
})

test('Aviatrix Systems rejects failed or malformed office-country evidence', async () => {
  for (const officePayload of [{ ...offices, success: false }, { offices: [offices.offices[0], offices.offices[0]] }, { offices: 'unavailable' }]) {
    await assert.rejects(createAviatrixSystemsScraper().run({ fetchJson: async url => url.includes('/offices?') ? officePayload : payload() }))
  }
})

test('Aviatrix Systems retains incomplete evidence when India labels conflict with foreign offices', async () => {
  const native = payload()
  const india = native.jobs.find(job => job.id === 4741459005)
  india.offices = native.jobs[0].offices
  const jobs = await createAviatrixSystemsScraper().run({ fetchJson: fetchNative(native) })
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
})

test('Aviatrix Systems honours cancellation and bounds a stalled request', async () => {
  const controller = new AbortController()
  controller.abort(new Error('stop source'))
  await assert.rejects(createAviatrixSystemsScraper().run({ signal: controller.signal,
    fetchJson: async () => assert.fail('cancelled source must not fetch') }), /stop source/)
  await assert.rejects(createAviatrixSystemsScraper().run({ timeoutMs: 20,
    fetchJson: () => new Promise(() => {}) }), /timed out/i)
})
