import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  createTechtreeItSystemsScraper,
} from './script.js'

const HOMEPAGE_URL = 'https://www.techtreeit.com/'

const SUCURI_CHALLENGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>You are being redirected...</title>
  </head>
  <body>
    <noscript>Javascript is required. Please enable javascript before you are allowed to see this page.</noscript>
    <script>
      var sucuri_cloudproxy_js = ''
    </script>
  </body>
</html>
`

test('Techtree It Systems returns [] when homepage and careers both match the verified Sucuri challenge shell', async () => {
  const requestedUrls = []

  const jobs = await createTechtreeItSystemsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return {
        status: 307,
        url,
        html: SUCURI_CHALLENGE_HTML,
      }
    },
    fetchJson: async () => {
      throw new Error('Jobs API should not be called when the verified first-party surfaces are blocked')
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_URL,
    HOMEPAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})
