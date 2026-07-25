const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wraps an async function with exponential backoff retry logic.
 *
 * On each failure the delay doubles:
 *   attempt 1 fails → wait baseDelayMs        (e.g. 2s)
 *   attempt 2 fails → wait baseDelayMs × 2    (e.g. 4s)
 *   attempt 3 fails → wait baseDelayMs × 4    (e.g. 8s)
 *   attempt 4 → throws final error
 *
 * @param {Function} fn          Async function to execute
 * @param {object}   opts
 * @param {number}   opts.attempts      Max total attempts (default 3)
 * @param {number}   opts.baseDelayMs   Initial delay in ms (default 2000)
 * @param {string}   opts.label         Identifier for log messages (e.g. scraper name)
 * @returns {Promise<*>} Result of fn() on success
 * @throws {Error} After all attempts are exhausted
 */
export const withRetry = async (fn, { attempts = 3, baseDelayMs = 2000, label = 'task' } = {}) => {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const isLastAttempt = attempt === attempts

      // Log the full error message — scrapers should include the failing URL
      // in their thrown errors so this line surfaces it automatically
      console.warn(`\n  [retry:${label}] Attempt ${attempt}/${attempts} failed`)
      console.warn(`  [retry:${label}] Error: ${err.message}`)

      if (!isLastAttempt) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        console.warn(`  [retry:${label}] Retrying in ${(delay / 1000).toFixed(1)}s...\n`)
        await sleep(delay)
      }
    }
  }

  // Propagate with full context so the runner can log it cleanly
  const finalErr = new Error(
    `[${label}] All ${attempts} attempts failed. Last error: ${lastError.message}`,
  )
  finalErr.cause = lastError
  finalErr.softFailure = lastError?.softFailure === true
  finalErr.upstreamOutage = lastError?.upstreamOutage === true
  throw finalErr
}
