import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'
import { selectScrapersForRun, shouldClearExistingJobsBeforeRun } from '../scraper-support/runner.js'

const selection = { onlySources: '', startAt: '', startAfter: '', firstN: '1000', dryRun: true }

test('first 1000 selection follows the executable catalog order through its boundary', () => {
  const catalog = getScraperCatalog()
  const result = selectScrapersForRun(buildScrapers(), selection)
  assert.equal(result.scrapers.length, 1000)
  assert.deepEqual(result.scrapers.map(scraper => scraper.name), catalog.slice(0, 1000).map(provider => provider.source))
  assert.equal(result.scrapers[0].name, 'abb')
  assert.equal(result.scrapers[999].name, 'hex')
  assert.equal(catalog[1000].source, 'hfcl')
  assert.equal(result.scrapers.some(scraper => scraper.name === 'hfcl'), false)
})

test('first N rejects ambiguous counts instead of silently parsing a prefix', () => {
  for (const firstN of ['0', '-1', '1.5', '1000junk', '1e3', 'Infinity', '9007199254740992']) {
    assert.throws(() => selectScrapersForRun([{ name: 'abb' }], { ...selection, firstN }), /SCRAPER_FIRST_N.*positive integer/)
  }
})

test('first N rejects competing catalog selectors and live execution', () => {
  for (const competing of [{ onlySources: 'abb' }, { startAt: 'abb' }, { startAfter: 'abb' }]) {
    assert.throws(() => selectScrapersForRun([{ name: 'abb' }], { ...selection, ...competing }), /SCRAPER_FIRST_N.*by itself/)
  }
  assert.throws(() => selectScrapersForRun([{ name: 'abb' }], { ...selection, dryRun: false }), /SCRAPER_FIRST_N.*--dry-run/)
  assert.equal(shouldClearExistingJobsBeforeRun(selection), false)
})

test('live first N CLI fails before model preparation or Mongo access', () => {
  const runner = fileURLToPath(new URL('../scraper-support/runner.js', import.meta.url))
  const result = spawnSync(process.execPath, [runner], {
    encoding: 'utf8', timeout: 10_000,
    env: { ...process.env, SCRAPER_FIRST_N: '1000', SCRAPER_ONLY: '', SCRAPER_START_AT: '', SCRAPER_START_AFTER: '', MONGO_URI: '' },
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /SCRAPER_FIRST_N.*--dry-run/)
  assert.doesNotMatch(result.stdout, /Downloading|Installing/)
})
