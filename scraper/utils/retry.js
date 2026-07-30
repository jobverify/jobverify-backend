const resolveAbortReason = (signal) => {
  if (signal?.reason !== undefined) {
    return signal.reason
  }

  const error = new Error('The operation was aborted')
  error.name = 'AbortError'
  return error
}

const throwIfAborted = (signal) => {
  if (signal?.aborted) {
    throw resolveAbortReason(signal)
  }
}

const sleep = (ms, { signal } = {}) => {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  if (signal.aborted) {
    return Promise.reject(resolveAbortReason(signal))
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(resolveAbortReason(signal))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

const collectErrorMessages = (error) => {
  const messages = []
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    visited.add(current)

    const message = typeof current?.message === 'string'
      ? current.message.trim()
      : String(current ?? '').trim()
    const code = typeof current?.code === 'string' ? current.code.trim() : ''

    if (message) {
      messages.push(message)
    } else if (code) {
      messages.push(code)
    }

    current = current?.cause
  }

  return [...new Set(messages.filter(Boolean))]
}

const describeError = (error) => collectErrorMessages(error).join(' | ') || String(error ?? '')

const resolveErrorCode = (error) => {
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    visited.add(current)

    if (typeof current?.code === 'string' && current.code.trim()) {
      return current.code.trim()
    }

    current = current?.cause
  }

  return undefined
}

const resolveRetryDelayMs = (error) => {
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    visited.add(current)

    const retryDelayMs = Number(current?.retryDelayMs)
    if (Number.isFinite(retryDelayMs) && retryDelayMs >= 0) {
      return retryDelayMs
    }

    current = current?.cause
  }

  return undefined
}

const buildRetryError = (
  label,
  attemptsUsed,
  attemptsAllowed,
  lastError,
  { aborted = false } = {},
) => {
  const lastErrorSummary = describeError(lastError)
  const message = aborted
    ? `[${label}] Retry aborted after attempt ${attemptsUsed}/${attemptsAllowed}. Last error: ${lastErrorSummary}`
    : `[${label}] All ${attemptsUsed} attempts failed. Last error: ${lastErrorSummary}`
  const finalErr = new Error(message)

  finalErr.cause = lastError

  for (const key of ['softFailure', 'upstreamOutage', 'failureKind', 'abortRetries', 'localTimeout', 'retryDelayMs']) {
    if (lastError?.[key] != null) {
      finalErr[key] = lastError[key]
    }
  }

  const resolvedCode = resolveErrorCode(lastError)
  if (resolvedCode) {
    finalErr.code = resolvedCode
  }

  return finalErr
}

/**
 * Wraps an async function with exponential backoff retry logic.
 *
 * On each failure the delay doubles:
 *   attempt 1 fails -> wait baseDelayMs        (e.g. 2s)
 *   attempt 2 fails -> wait baseDelayMs x 2    (e.g. 4s)
 *   attempt 3 fails -> wait baseDelayMs x 4    (e.g. 8s)
 *   attempt 4 -> throws final error
 *
 * @param {Function} fn          Async function to execute
 * @param {object}   opts
 * @param {number}   opts.attempts      Max total attempts (default 3)
 * @param {number}   opts.baseDelayMs   Initial delay in ms (default 2000)
 * @param {string}   opts.label         Identifier for log messages (e.g. scraper name)
 * @param {AbortSignal} opts.signal      Optional caller cancellation signal
 * @returns {Promise<*>} Result of fn() on success
 * @throws {Error} After all attempts are exhausted
 */
export const withRetry = async (
  fn,
  {
    attempts = 3,
    baseDelayMs = 2000,
    label = 'task',
    signal,
  } = {},
) => {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt++) {
    throwIfAborted(signal)

    try {
      const result = await fn()
      throwIfAborted(signal)
      return result
    } catch (err) {
      throwIfAborted(signal)
      lastError = err
      const isLastAttempt = attempt === attempts

      console.warn(`\n  [retry:${label}] Attempt ${attempt}/${attempts} failed`)
      console.warn(`  [retry:${label}] Error: ${describeError(err)}`)

      if (err?.abortRetries === true) {
        throw buildRetryError(label, attempt, attempts, err, { aborted: true })
      }

      if (!isLastAttempt) {
        const delay = Math.max(
          baseDelayMs * Math.pow(2, attempt - 1),
          resolveRetryDelayMs(err) || 0,
        )
        console.warn(`  [retry:${label}] Retrying in ${(delay / 1000).toFixed(1)}s...\n`)
        await sleep(delay, { signal })
      }
    }
  }

  throw buildRetryError(label, attempts, attempts, lastError)
}
