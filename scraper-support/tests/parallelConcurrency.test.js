import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY,
  resolveParallelWorkerConcurrency,
  resolveRecommendedLocalDryRunConcurrency,
} from '../utils/parallelConcurrency.js'

test('resolveRecommendedLocalDryRunConcurrency uses a dedicated safe default for local dry runs', () => {
  assert.equal(RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY, 2)
  assert.equal(resolveRecommendedLocalDryRunConcurrency(undefined), 2)
  assert.equal(resolveRecommendedLocalDryRunConcurrency('3'), 3)
})

test('resolveRecommendedLocalDryRunConcurrency ignores the general SCRAPER_CONCURRENCY setting', () => {
  const previousRequested = process.env.SCRAPER_CONCURRENCY
  const previousRecommended = process.env.SCRAPER_RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY

  process.env.SCRAPER_CONCURRENCY = '5'
  delete process.env.SCRAPER_RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY

  try {
    assert.equal(resolveRecommendedLocalDryRunConcurrency(), 2)
  } finally {
    if (previousRequested == null) {
      delete process.env.SCRAPER_CONCURRENCY
    } else {
      process.env.SCRAPER_CONCURRENCY = previousRequested
    }

    if (previousRecommended == null) {
      delete process.env.SCRAPER_RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY
    } else {
      process.env.SCRAPER_RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY = previousRecommended
    }
  }
})

test('resolveParallelWorkerConcurrency clamps unsafe local dry-run concurrency by default', () => {
  assert.deepEqual(
    resolveParallelWorkerConcurrency({
      requested: '5',
      dryRun: true,
      defaultConcurrency: 5,
      recommendedDryRunConcurrency: 2,
    }),
    {
      requested: 5,
      effective: 2,
      clamped: true,
    },
  )
})
