import assert from 'node:assert/strict'
import test from 'node:test'

import { withRetry } from '../utils/retry.js'

const blockedCareersHtml = `
<!doctype html>
<html>
  <body>
    <h1>Just a moment...</h1>
    <p>Enable JavaScript and cookies to continue</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/navisite/script.js')
  } catch {
    assert.fail('Expected NaviSite scraper module at ../../scraper/navisite/script.js')
  }
}

test('NaviSite accepts the blocked Cloudflare shell as a trusted state', async () => {
  const navisite = await loadModule()

  assert.equal(navisite.hasBlockedCareersSignal(blockedCareersHtml), true)
  assert.deepEqual(
    await navisite.createNaviSiteScraper().run({
      fetchText: async () => blockedCareersHtml,
    }),
    [],
  )
})

test('NaviSite can recover with a browser-backed careers page when direct requests are blocked', async () => {
  const navisite = await loadModule()
  const browserUrls = []

  const jobs = await navisite.createNaviSiteScraper().run({
    fetchText: async () => {
      throw new Error(`HTTP 403 for ${navisite.CAREERS_URL}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return blockedCareersHtml
    },
  })

  assert.deepEqual(browserUrls, [navisite.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('NaviSite aborts outer retries when the verified careers surface remains blocked after HTTP fallback', async () => {
  const navisite = await loadModule()
  let browserAttempts = 0

  await assert.rejects(
    withRetry(
      () => navisite.createNaviSiteScraper().run({
        fetchText: async () => {
          throw new Error(`HTTP 403 for ${navisite.CAREERS_URL}`)
        },
        fetchBrowserText: async () => {
          browserAttempts += 1
          throw new Error(`HTTP 403 for ${navisite.CAREERS_URL}`)
        },
      }),
      {
        attempts: 2,
        baseDelayMs: 1,
        label: 'outer-navisite',
      },
    ),
    (error) => {
      assert.match(
        error.message,
        /\[outer-navisite\] Retry aborted after attempt 1\/2\. Last error: NaviSite verified careers surface remains blocked after HTTP fallback/,
      )
      assert.equal(error.abortRetries, true)
      return true
    },
  )

  assert.equal(browserAttempts, 1)
})
