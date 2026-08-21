import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Dagster provider metadata captures the current homepage plus Prefect redirect empty sentinel', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dagster')

  assert.ok(provider)
  assert.equal(provider.companyCareerPage, 'https://dagster.io/company/careers')
  assert.equal(provider.companyDomain, 'dagster.io')
  assert.equal(provider.verifiedOn, '2026-08-15')
  assert.match(provider.extractionStrategy, /prefect-careers-redirect-plus-empty-greenhouse-board-return-empty/i)
  assert.match(provider.verifiedSurfaceSummary, /AI-native DataOps marketing copy/i)
  assert.match(provider.verifiedSurfaceSummary, /Data your team trusts\. AI that runs on it\./i)
  assert.match(provider.verifiedSurfaceSummary, /There are no current openings/i)
})

test('Dagster is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'dagster')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /dagster[\\/]jobs\.json$/)
})
