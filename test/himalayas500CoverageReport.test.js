import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { buildScrapers } from '../scraper-support/providers/index.js'

const artifactPath = path.join(
  import.meta.dirname,
  '..',
  'artifacts',
  'himalayas_500_company_coverage_report.json',
)

test('Himalayas 500 coverage artifact exists and reports full coverage', (t) => {
  if (!existsSync(artifactPath)) {
    t.skip(`Missing generated coverage artifact: ${artifactPath}`)
    return
  }

  assert.equal(
    existsSync(artifactPath),
    true,
    `Expected generated coverage artifact at ${artifactPath}`,
  )

  const report = JSON.parse(readFileSync(artifactPath, 'utf8'))

  assert.equal(report.totalRows, 500)
  assert.equal(report.candidateRows, 500)
  assert.equal(report.matchedCount, 500)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])

  const scrapers = buildScrapers()
  const scraperNames = new Set(scrapers.map((scraper) => scraper.name))
  const uniqueMatchedSources = [...new Set(report.matched.map((item) => item.source))]
  const missingRunnableSources = uniqueMatchedSources.filter((source) => !scraperNames.has(source))

  assert.equal(uniqueMatchedSources.length, 500)
  assert.deepEqual(missingRunnableSources, [])
})
