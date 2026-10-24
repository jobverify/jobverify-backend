import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { run, buildIndiaSearchUrl } from './script.js'
import { getRetryMetadata, withRetry } from '../../scraper-support/utils/retry.js'

test('Waymo import under a dry-run runner cannot request or persist jobs', () => {
  const url = new URL('./script.js', import.meta.url).href
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
    process.argv = ['node', 'unrelated-runner.js', '--dry-run'];
    globalThis.fetch = () => { throw Object.assign(Error('Unexpected import network'), { abortRetries: true }); };
    await import(${JSON.stringify(url)});
    console.log('imported');
  `], { encoding: 'utf8', timeout: 3000 })
  assert.equal(output.trim(), 'imported')
})

test('Waymo rejects unsuccessful or redirected responses before parsing their body', async t => {
  const requestUrl = buildIndiaSearchUrl()
  for (const [status, finalUrl] of [[202, requestUrl], [200, 'https://unrelated.invalid/']]) {
    let cancelled = false
    const mocked = t.mock.method(globalThis, 'fetch', async () => ({
      ok: true, status, url: finalUrl,
      body: { cancel() { cancelled = true } },
      text() { assert.fail('Rejected response body must not be read') },
    }))
    try {
      await assert.rejects(run(), error => {
        assert.equal(error.status, status)
        assert.equal(error.requestUrl, requestUrl)
        assert.equal(error.finalUrl, finalUrl)
        assert.match(error.message, new RegExp('HTTP ' + status))
        assert.ok(error.message.includes(finalUrl))
        return true
      })
      assert.equal(cancelled, true)
    } finally { mocked.mock.restore() }
  }
})

test('Waymo cannot certify partial cards against a larger displayed total', async () => {
  const html = `<div class="table-counts">Displaying <b>all&nbsp;2</b> entries</div>
    <article class="job-search-results-card-col">
      <a id="link_job_title_1" href="/jobs/one-bengaluru-india">Software Engineer</a>
      <li class="job-component-location"><span>Bengaluru, Karnataka</span></li>
    </article>`
  await assert.rejects(run({ fetchText: async () => html }), /count|incomplete/i)
})

test('Waymo rate limits keep the server cooldown through the outer retry loop', async t => {
  let calls = 0
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return { status: 429, url: buildIndiaSearchUrl(),
      headers: new Headers({ 'Retry-After': '120' }), body: { cancel() {} },
      text() { assert.fail('Rate-limit body must not be parsed as jobs') } }
  })
  let finalError
  const completion = withRetry(() => run(), { attempts: 2, baseDelayMs: 1, label: 'waymo-cooldown-test' })
    .then(() => assert.fail('Rate-limited requests cannot succeed'), error => { finalError = error })
  const flush = () => new Promise(resolve => setImmediate(resolve))
  await flush()
  assert.equal(calls, 1)
  t.mock.timers.tick(119999)
  await flush()
  assert.equal(calls, 1, 'Do not retry before the server Retry-After has elapsed')
  t.mock.timers.tick(1)
  await completion
  assert.equal(calls, 2)
  assert.equal(finalError.cause.status, 429)
  assert.equal(getRetryMetadata(finalError).retryDelayMs, 120000)
})

test('Waymo permanent access failures stop outer retries immediately', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return { status: 403, url: buildIndiaSearchUrl(), body: { cancel() {} } }
  })
  await assert.rejects(withRetry(() => run(), { attempts: 3, baseDelayMs: 0, label: 'waymo-access-test' }), error => {
    assert.equal(error.cause.status, 403)
    assert.equal(error.abortRetries, true)
    return true
  })
  assert.equal(calls, 1)
})
