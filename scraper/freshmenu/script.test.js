import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ABOUT_URL,
  HOMEPAGE_URL,
  MISSING_JOB_ROUTE_URLS,
  createFreshMenuScraper,
  hasCloudflareBlockedDomainSignal,
} from './script.js'

const blockedHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>DNS points to prohibited IP | www.freshmenu.com | Cloudflare</title>
    </head>
    <body>
      <p>Cloudflare</p>
    </body>
  </html>
`

test('FreshMenu accepts the current Cloudflare blocked-domain shell as a no-public-jobs surface', async () => {
  assert.equal(
    hasCloudflareBlockedDomainSignal({ status: 403, html: blockedHtml }),
    true,
  )

  const jobs = await createFreshMenuScraper().run({
    fetchPage: async (url) => {
      if (url === HOMEPAGE_URL || url === ABOUT_URL || MISSING_JOB_ROUTE_URLS.includes(url)) {
        return { status: 403, url, html: blockedHtml }
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})
