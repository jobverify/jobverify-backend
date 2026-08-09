import assert from 'node:assert/strict'
import test from 'node:test'

import { withRetry } from '../utils/retry.js'

const loadModule = async () => {
  try {
    return await import('../../scraper/juegostudio/script.js')
  } catch {
    assert.fail('Expected Juego Studio scraper module at ../../scraper/juegostudio/script.js')
  }
}

test('Juego Studio aborts outer retries when the verified careers page remains blocked after HTTP fallback', async () => {
  const juegoStudio = await loadModule()
  let browserAttempts = 0

  await assert.rejects(
    withRetry(
      () => juegoStudio.createJuegoStudioScraper().run({
        fetchText: async () => {
          throw new Error(`HTTP 403 for ${juegoStudio.CAREERS_URL}`)
        },
        fetchBrowserText: async () => {
          browserAttempts += 1
          throw new Error(`HTTP 403 for ${juegoStudio.CAREERS_URL}`)
        },
      }),
      {
        attempts: 2,
        baseDelayMs: 1,
        label: 'outer-juego',
      },
    ),
    (error) => {
      assert.match(
        error.message,
        /\[outer-juego\] Retry aborted after attempt 1\/2\. Last error: Juego Studio verified careers page remains blocked after HTTP fallback/,
      )
      assert.equal(error.abortRetries, true)
      return true
    },
  )

  assert.equal(browserAttempts, 1)
})
