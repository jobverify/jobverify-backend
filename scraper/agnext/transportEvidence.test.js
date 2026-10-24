import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { run, OFFICIAL_CAREERS_URL } from './script.js'

const load = name => JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/phase3-20261024/' + name + '.json.gz', import.meta.url))))
const home = load('probe-0')
const board = load('probe-1')
test('current AgNext Forbidden redirect retains final transport evidence and never reports inventory', async () => {
  const fetchImpl = async url => {
    const capture = url === OFFICIAL_CAREERS_URL ? home : board
    const response = new Response(capture.body, { status: capture.status, headers: { 'content-type': 'text/html' } })
    Object.defineProperty(response, 'url', { value: capture.finalUrl })
    return response
  }
  await assert.rejects(run({ fetchImpl }), error => {
    assert.equal(error.status, 200)
    assert.equal(error.finalUrl, 'https://agnext.keka.com/careers/Content/403.html')
    assert.equal(error.softFailure, true)
    assert.equal(error.failureKind, 'blocked_or_access_denied')
    assert.equal(error.abortRetries, true)
    return true
  })
})

test('AgNext retains the blocked HTTP source stage before a response body is accepted', async () => {
  const fetchImpl = async url => {
    const response = new Response('Forbidden', { status: 403 })
    Object.defineProperty(response, 'url', { value: url })
    return response
  }
  await assert.rejects(run({ fetchImpl }), error => {
    assert.equal(error.status, 403)
    assert.equal(error.requestUrl, OFFICIAL_CAREERS_URL)
    assert.equal(error.finalUrl, OFFICIAL_CAREERS_URL)
    assert.equal(error.stage, 'home')
    assert.equal(error.softFailure, true)
    assert.equal(error.failureKind, 'blocked_or_access_denied')
    assert.equal(error.abortRetries, true)
    return true
  })
})
