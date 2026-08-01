import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const loadDryRunRunner = async () => {
  const originalArgv = [...process.argv]
  process.argv = [...process.argv.filter((arg) => arg !== '--dry-run'), '--dry-run']

  try {
    return await import(`../runner.js?dry-run-artifact-test=${Date.now()}`)
  } finally {
    process.argv = originalArgv
  }
}

test('a failed dry run clears stale jobs.json output instead of leaving old data behind', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobify-dry-run-'))
  const dryRunFile = path.join(tempDir, 'jobs.json')
  fs.writeFileSync(dryRunFile, '[{"title":"stale job"}]\n', 'utf8')

  const runner = await loadDryRunRunner()
  assert.equal(typeof runner.runScraper, 'function')

  const result = await runner.runScraper({
    name: 'broken-source',
    provider: { adapter: 'workday' },
    dryRunFile,
    run: async () => {
      throw new Error('source drift')
    },
  })

  assert.equal(result.success, false)
  assert.equal(fs.existsSync(dryRunFile), false)

  fs.rmSync(tempDir, { recursive: true, force: true })
})
