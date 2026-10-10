import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { atomicJson, scopeIsComplete, publishFinalAnalysis } from '../scripts/first1000LayaDryRun.js'

test('only a complete checkpoint with the exact ordered catalog defines the broad review sample', () => {
  const valid = { status: 'complete', completedCount: 2, totalSources: 2, catalogSources: ['abb', 'airbus'] }
  assert.equal(scopeIsComplete(valid, ['abb', 'airbus']), true)
  for (const checkpoint of [null, { ...valid, status: 'interrupted' }, { ...valid, completedCount: 1 },
    { ...valid, totalSources: 1000 }, { ...valid, catalogSources: ['airbus', 'abb'] }]) {
    assert.equal(scopeIsComplete(checkpoint, ['abb', 'airbus']), false)
  }
})

test('status replacement retries a Windows sharing lock and keeps valid JSON', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'laya-json-retry-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const file = path.join(directory, 'status.json')
  await fs.writeFile(file, '{"previous":true}\n')
  let attempts = 0
  await atomicJson(file, { recovered: true }, { rename: async (from, to) => {
    if (++attempts < 3) throw Object.assign(new Error('sharing violation'), { code: 'EPERM' })
    return fs.rename(from, to)
  }, sleep: async () => {} })
  assert.equal(attempts, 3)
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { recovered: true })
  assert.deepEqual(await fs.readdir(directory), ['status.json'])
})

test('non-transient replacement errors fail without destroying the existing checkpoint', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'laya-json-failure-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const file = path.join(directory, 'status.json')
  await fs.writeFile(file, '{"previous":true}\n')
  let attempts = 0
  await assert.rejects(atomicJson(file, { recovered: true }, { rename: async () => {
    attempts++; throw Object.assign(new Error('disk error'), { code: 'EIO' })
  } }), /disk error/)
  assert.equal(attempts, 1)
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { previous: true })
  assert.deepEqual(await fs.readdir(directory), ['status.json'])
})

test('a report failure and an unwritable diagnostic preserve successful run evidence', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'laya-report-failure-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const evidence = { complete: true, companiesAttempted: 1000 }
  await fs.writeFile(path.join(directory, 'run-exit.json'), JSON.stringify(evidence))
  // Missing manifest makes the report fail; a directory prevents diagnostic publication too.
  await fs.mkdir(path.join(directory, 'analysis-error.json'))
  const messages = []
  assert.equal(await publishFinalAnalysis(directory, { runComplete: true, log: message => messages.push(message) }), null)
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'run-exit.json'), 'utf8')), evidence)
  assert.equal(messages.length, 2)
})
