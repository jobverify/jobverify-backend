import assert from 'node:assert/strict'
import test from 'node:test'

import {
  HOMEPAGE_URL,
  WELLFOUND_JOBS_URL,
  defaultFetchPage,
  isVerifiedWellfoundChallenge,
} from './script.js'

test('IQnext Synconext default fetch is bounded by a timeout signal', async () => {
  let capturedInit = null

  const page = await defaultFetchPage(HOMEPAGE_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        status: 200,
        url,
        headers: { get: () => null },
        text: async () => '<html><head><title>Home - Synconext</title></head></html>',
      }
    },
  })

  assert.equal(page.status, 200)
  assert.equal(page.url, HOMEPAGE_URL)
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('IQnext Synconext accepts the current verified Wellfound Cloudflare challenge', () => {
  const html = `<!DOCTYPE html>
  <html lang="en-US">
  <head>
    <title>Just a moment...</title>
    <meta name="robots" content="noindex,nofollow">
  </head>
  <body>
    <script>window._cf_chl_opt = { cZone: "wellfound.com" };</script>
    <div id="challenge-platform"></div>
    <div>Enable JavaScript and cookies to continue</div>
    <div>Ray ID: 1234567890abcdef</div>
  </body>
  </html>`

  assert.equal(isVerifiedWellfoundChallenge({
    status: 403,
    url: WELLFOUND_JOBS_URL,
    html,
  }), true)
})

test('IQnext Synconext still accepts the legacy Wellfound anti-bot challenge', () => {
  const html = `<!DOCTYPE html>
  <html>
  <head><title>Access denied</title></head>
  <body>
    <script src="https://captcha-delivery.com/c.js"></script>
    <div>Please enable JS and disable any ad blocker</div>
  </body>
  </html>`

  assert.equal(isVerifiedWellfoundChallenge({
    status: 403,
    url: WELLFOUND_JOBS_URL,
    html,
  }), true)
})

test('IQnext Synconext rejects unrelated 403 pages', () => {
  assert.equal(isVerifiedWellfoundChallenge({
    status: 403,
    url: WELLFOUND_JOBS_URL,
    html: '<html><head><title>Forbidden</title></head><body>Access denied</body></html>',
  }), false)
})
