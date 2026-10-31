import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CAREERS_URL, LEVER_BOARD_URL, extractIndiaLeverJobs, run } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const native = JSON.parse(readFileSync(new URL('./test-data/2026-10-31-bay-area.json', import.meta.url), 'utf8'))
const primary = () => structuredClone(native[0])
const secondary = () => structuredClone(native[1])
const careers = '<title>Careers | VGS</title><h1>It Takes Exceptional People to Build VGS</h1><h2>What We Look For In Every Teammate</h2><h2>Discover Opportunities</h2><a href="#lever-jobs-container">Open Roles</a><div id="lever-jobs-container"></div>'
const board = records => '<title>VGS</title><meta property="og:url" content="https://jobs.lever.co/verygoodsecurity">Location type Location Team Work type Powered by Lever' + records.map(job => `<a href="${job.hostedUrl}">${job.text}</a>`).join('')
const runWith = (records, pages = [records]) => run({
  fetchText: async url => url === CAREERS_URL ? careers : url === LEVER_BOARD_URL ? board(records) : assert.fail('Unexpected public URL'),
  fetchJson: async url => pages[Number(new URL(url).searchParams.get('skip')) / 100],
})

test('VGS resolves an exact secondary label from explicit native primary location-country evidence', async () => {
  assert.deepEqual(await runWith(native), [])
})

test('VGS retains fresh complete native inventory evidence when every corroborated posting is foreign', async () => {
  const jobs = await runWith(native)
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence?.status, 'complete-inventory')
  assert.equal(evidence.firstParty, true)
  assert.equal(evidence.listingComplete, true)
  assert.equal(evidence.reportedTotal, 2)
  assert.equal(evidence.indiaFacetCount, 0)
  assert.equal(evidence.pagesFetched, 2)
  assert.equal(evidence.surface, LEVER_BOARD_URL)
  assert.match(evidence.verifiedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('VGS rejects country conflicts on explicit primary country names', () => {
  const foreign = { ...secondary(), country: 'IN', categories: { location: 'United States', allLocations: ['United States'] } }
  assert.throws(() => extractIndiaLeverJobs([foreign]), /conflict/i)
})

test('VGS does not infer a secondary city from the primary posting country alone', () => {
  assert.throws(() => extractIndiaLeverJobs([secondary()]), /incomplete location scope/)
})

test('VGS rejects conflicting native countries for the same primary location label', () => {
  const conflicting = { ...primary(), id: 'conflict', country: 'GB', hostedUrl: 'https://jobs.lever.co/verygoodsecurity/conflict', applyUrl: 'https://jobs.lever.co/verygoodsecurity/conflict/apply' }
  assert.throws(() => extractIndiaLeverJobs([...native, conflicting]), /conflict|ambiguous/i)
})

test('VGS cannot use placeholder country codes or generic Remote labels to certify secondary scope', () => {
  assert.throws(() => extractIndiaLeverJobs([{ ...primary(), country: 'ZZ' }, secondary()]), /incomplete|country|location/i)
  const remotePrimary = { ...primary(), categories: { location: 'Remote', allLocations: ['Remote'] } }
  const remoteSecondary = { ...secondary(), categories: { location: 'United States', allLocations: ['United States', 'Remote'] } }
  assert.throws(() => extractIndiaLeverJobs([remotePrimary, remoteSecondary]), /incomplete|country|location/i)
})

test('VGS preserves genuine secondary India locations alongside corroborated foreign labels', () => {
  const mixed = secondary()
  mixed.categories.allLocations.push('Bengaluru, India')
  const jobs = extractIndiaLeverJobs([primary(), mixed])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, '4f565c0a-7a1c-4f43-ba97-0559658661dc')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].location, 'Bengaluru, India')
})

test('VGS resolves secondary geography across native pagination before completing inventory', async () => {
  const first = Array.from({ length: 100 }, (_, i) => ({ ...secondary(), id: `secondary-${i}`, hostedUrl: `https://jobs.lever.co/verygoodsecurity/secondary-${i}`, applyUrl: `https://jobs.lever.co/verygoodsecurity/secondary-${i}/apply` }))
  assert.deepEqual(await runWith([...first, primary()], [first, [primary()]]), [])
})



test('VGS does not reuse global remote placeholders as secondary worksite-country evidence', () => {
  for (const label of ['Global Remote', 'Worldwide (Remote)', 'Remote - Anywhere']) {
    const genericPrimary = { ...primary(), categories: { location: label, allLocations: [label] } }
    const genericSecondary = { ...secondary(), categories: { location: 'United States', allLocations: ['United States', label] } }
    assert.throws(() => extractIndiaLeverJobs([genericPrimary, genericSecondary]), /incomplete location scope/)
  }
})
