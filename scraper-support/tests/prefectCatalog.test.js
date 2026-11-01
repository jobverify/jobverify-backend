import { checkCurrentReplay, assertCurrentProvider } from '../native-sources/declaredJobFeeds/legacyReplayControls.js'
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('prefect: registered native reader clears historical source-coverage claims', () => assertCurrentProvider('prefect'))

test('buildScrapers exposes a runnable Prefect scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'prefect')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /prefect[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'prefect')
  assert.equal(scraper.provider.atsPlatform, 'ashby')
})
