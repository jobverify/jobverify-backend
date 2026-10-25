import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import test from 'node:test'
import assert from 'node:assert/strict'
import { run } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const fixture = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/current-native-20261024.json.gz', import.meta.url))))
test('Affirm reads its complete current225-role native feed and resolves every explicit non-India country scope', async () => {
  let calls = 0
  const jobs = await run({ fetchJson: async url => {
    calls++; assert.equal(url, 'https://boards-api.greenhouse.io/v1/boards/affirm/jobs?content=true')
    return structuredClone(fixture.inventory)
  } })
  assert.equal(calls, 1)
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 225)
  assert.equal(readInventoryEvidence(jobs).listingComplete, true)
  assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 0)
})

test('the Affirm extractor supports explicit India postings with actual native descriptions and role-specific HTTP links', async () => {
  const record = { ...structuredClone(fixture.inventory.jobs[0]), location: { name: 'Bengaluru, India' } }
  const jobs = await run({ fetchJson: async () => ({ jobs: [record], meta: { total: 1 } }) })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Affirm')
  assert.ok(jobs[0].jobDescription.length > 100)
  assert.equal(jobs[0].applyUrl, record.absolute_url)
})

for (const [name, change] of [
  ['generic remote', j => { j.location.name = 'Remote' }],
  ['unresolved country', j => { j.location.name = 'Global Remote' }],
  ['foreign and global scope', j => { j.location.name = 'Remote US or Worldwide' }],
  ['foreign scope with an unrecognized second location', j => { j.location.name = 'Remote US or Bangalore' }],
  ['India scope with an unrecognized second country', j => { j.location.name = 'India or Germany' }],
  ['conflicting India and foreign scope', j => { j.location.name = 'Remote US and India' }],
  ['different employer', j => { j.company_name = 'Other Employer' }],
  ['different board', j => { j.absolute_url = j.absolute_url.replace('/affirm/', '/other/') }],
]) test('Affirm cannot claim zero India when a native record has ' + name, async () => {
  const payload = structuredClone(fixture.inventory); change(payload.jobs[0])
  await assert.rejects(run({ fetchJson: async () => payload }))
})

for (const [name, change] of [
  ['missing native total', p => { delete p.meta }],
  ['repeated native identity', p => { p.jobs[1] = structuredClone(p.jobs[0]) }],
]) test('Affirm rejects ' + name + ' rather than certify complete scope', async () => {
  const payload = structuredClone(fixture.inventory); change(payload)
  await assert.rejects(run({ fetchJson: async () => payload }))
})

test('Affirm never returns complete zero evidence after cancellation at the native response boundary', async () => {
  const controller = new AbortController(), reason = new Error('cancel Affirm after inventory response')
  await assert.rejects(run({ signal: controller.signal, fetchJson: async () => { controller.abort(reason); return structuredClone(fixture.inventory) } }), error => error === reason)
})
