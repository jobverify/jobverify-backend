import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { run, OFFICIAL_CAREERS_URL, JOB_OPENINGS_URL } from './script.js'

const input = JSON.parse(gunzipSync(readFileSync(new URL('./test-inputs/current-denial-20261031.json.gz', import.meta.url))))
const replay = (change = packet => packet) => {
  const calls = []
  return { calls, fetchImpl: async url => {
    calls.push(url)
    const packet = change(structuredClone(url === OFFICIAL_CAREERS_URL ? input.home : input.denial))
    const response = new Response(packet.body, { status: packet.status, headers: { 'content-type': packet.contentType } })
    Object.defineProperty(response, 'url', { value: packet.finalUrl })
    return response
  } }
}

test('the current AgNext forbidden redirect retains unknown coverage and the actual observed HTTP status', async () => {
  const options = replay()
  await assert.rejects(run(options), error => {
    assert.equal(error.status, 200)
    assert.equal(error.requestUrl, JOB_OPENINGS_URL)
    assert.equal(error.finalUrl, input.denial.url)
    assert.equal(error.failureKind, 'blocked_or_access_denied')
    assert.equal(error.softFailure, true)
    assert.equal(error.sourceHandoffVerified, false)
    assert.equal(error.inventoryEvidence.firstParty, false)
    assert.equal(error.inventoryEvidence.listingComplete, false)
    assert.equal(error.inventoryEvidence.reportedTotal, null)
    assert.equal(error.inventoryEvidence.indiaFacetCount, null)
    assert.equal(error.lifecycleCleanupAllowed, false)
    return true
  })
  assert.deepEqual(options.calls, [OFFICIAL_CAREERS_URL, JOB_OPENINGS_URL])
})

for (const [name, change] of [
  ['commented', body => body.replace(/(<a\b[^>]*href="https:\/\/agnext\.keka\.com\/careers"[^>]*>[\s\S]*?<\/a>)/g, '<!-- $1 -->')],
  ['hidden', body => body.replace(/<a\b([^>]*href="https:\/\/agnext\.keka\.com\/careers"[^>]*)>/g, '<a hidden$1>')],
]) test('a ' + name + ' link in the actual homepage cannot bind the Keka employer', async () => {
  const options = replay(packet => packet.url === OFFICIAL_CAREERS_URL ? { ...packet, body: change(packet.body) } : packet)
  await assert.rejects(run(options), error => /handoff/i.test(error.message) && error.softFailure !== true)
  assert.deepEqual(options.calls, [OFFICIAL_CAREERS_URL])
})

test('a successful foreign redirect cannot become an employer-bound generic Keka shell', async () => {
  const options = replay(packet => packet.url === input.denial.url ? { ...packet, body: '<title>AgNext</title><app-root></app-root>', finalUrl: 'https://other.example/careers' } : packet)
  await assert.rejects(run(options), /redirect|URL|identity/i)
})
