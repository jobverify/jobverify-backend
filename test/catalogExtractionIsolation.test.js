import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { runIsolatedExtraction } from '../scripts/auditCatalogExtractions.js'

const backend = fileURLToPath(new URL('../', import.meta.url))
const parent = path.join(backend, '.tmp')
fs.mkdirSync(parent, { recursive: true })

async function withFixture(code, callback) {
  const directory = fs.mkdtempSync(path.join(parent, 'extraction-isolation-'))
  try {
    const modulePath = path.join(directory, 'fixture.mjs')
    fs.writeFileSync(modulePath, code)
    await callback({ directory, provider: { adapter: 'script', source: 'fixture', companyName: 'Fixture', modulePath } })
  } finally {
    const resolved = path.resolve(directory)
    assert.ok(resolved.startsWith(path.resolve(parent) + path.sep))
    fs.rmSync(resolved, { recursive: true, force: true })
  }
}

test('isolated extraction cannot write outside its source artifact directory', async () => {
  await withFixture(`import fs from 'node:fs'; export const run = async () => { fs.writeFileSync(new URL('./forbidden.txt', import.meta.url), 'changed'); return [] }`, async ({ directory, provider }) => {
    const row = await runIsolatedExtraction(provider, { outputDirectory: path.join(directory, 'output') })
    assert.equal(row.outcome, 'audit-permission-blocked')
    assert.equal(fs.existsSync(path.join(directory, 'forbidden.txt')), false)
  })
})

test('isolated extraction rejects database access before a source can connect', async () => {
  await withFixture(`import mongoose from 'mongoose'; export const run = async () => { await mongoose.connect('mongodb://127.0.0.1:27017/should-never-connect'); return [] }`, async ({ directory, provider }) => {
    const row = await runIsolatedExtraction(provider, { outputDirectory: path.join(directory, 'output') })
    assert.equal(row.outcome, 'extraction-failed')
    assert.equal(row.failureCode, 'AUDIT_DATABASE_BLOCKED')
  })
})

test('an empty successful return without evidence stays unverified', async () => {
  await withFixture('export const run = async () => []', async ({ directory, provider }) => {
    const row = await runIsolatedExtraction(provider, { outputDirectory: path.join(directory, 'output') })
    assert.equal(row.outcome, 'unverified-zero')
    assert.equal(row.inventoryEvidence?.listingComplete, undefined)
  })
})
