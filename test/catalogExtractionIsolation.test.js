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
    assert.equal(row.mode, 'isolated-direct-live-extraction-no-database')
    assert.equal(row.productionWrites, false)
  })
})

test('complete listing evidence cannot conceal missing native descriptions or explicit detail failures', async () => {
  const helper = new URL('../scraper-support/utils/inventoryEvidence.js', import.meta.url).href
  for (const variant of [
    { jobDescription: '' },
    { jobDescription: 'Build production software services.', sourceDetailComplete: false, sourceDetailFailureKind: 'upstream' },
    { jobDescription: 'Build production software services.', sourceListingComplete: false },
  ]) {
    const fixture = `import {attachInventoryEvidence} from ${JSON.stringify(helper)};
      export const run = async () => attachInventoryEvidence([{title:'Software Engineer',company:'Fixture',source:'fixture',location:'Bengaluru, India',country:'India',link:'https://careers.fixture.test/jobs/123',...${JSON.stringify(variant)}}],
      {status:'complete-inventory',firstParty:true,listingComplete:true,pagesFetched:1,reportedTotal:1,indiaFacetCount:1,surface:'https://careers.fixture.test/jobs',verifiedAt:new Date().toISOString()})`
    await withFixture(fixture, async ({ directory, provider }) => {
      const row = await runIsolatedExtraction(provider, { outputDirectory: path.join(directory, 'output') })
      assert.equal(row.outcome, 'positive-extraction-incomplete-evidence')
      assert.equal(row.inventoryEvidence.listingComplete, true)
      assert.equal(row.detailHealth.complete, false)
      assert.equal(row.detailHealth.incompleteJobs, 1)
    })
  }
})

test('a complete native listing with complete descriptions has healthy detail diagnostics', async () => {
  const helper = new URL('../scraper-support/utils/inventoryEvidence.js', import.meta.url).href
  const fixture = `import {attachInventoryEvidence} from ${JSON.stringify(helper)};
    export const run = async () => attachInventoryEvidence([{title:'Software Engineer',company:'Fixture',source:'fixture',location:'Bengaluru, India',country:'India',link:'https://careers.fixture.test/jobs/123',jobDescription:'Build production software services.'}],
    {status:'complete-inventory',firstParty:true,listingComplete:true,pagesFetched:1,reportedTotal:1,indiaFacetCount:1,surface:'https://careers.fixture.test/jobs',verifiedAt:new Date().toISOString()})`
  await withFixture(fixture, async ({ directory, provider }) => {
    const row = await runIsolatedExtraction(provider, { outputDirectory: path.join(directory, 'output') })
    assert.equal(row.outcome, 'complete-positive-extraction')
    assert.deepEqual(row.detailHealth, { complete: true, inspectedJobs: 1, incompleteJobs: 0, missingDescriptions: 0, failureKinds: {} })
  })
})

test('timed out audits record the actual attempt and unknown counts', async () => {
  await withFixture('export const run = async () => new Promise(resolve => setTimeout(() => resolve([]), 5000))', async ({directory, provider}) => {
    const row = await runIsolatedExtraction(provider, {outputDirectory: path.join(directory, 'output'), timeoutMs: 1000})
    assert.equal(row.outcome, 'extraction-timeout')
    assert.ok(Number.isFinite(new Date(row.attemptedAt).getTime()))
    assert.ok(new Date(row.completedAt) >= new Date(row.attemptedAt))
    assert.equal(row.productionWrites, false)
    assert.equal(row.rawJobs, null)
    assert.equal(row.inventoryEvidence, null)
  })
})
