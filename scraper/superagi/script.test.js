import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  createSuperagiScraper,
  hasOfficialSiteSignal,
} from './script.js'

const officialHomepageHtml = `
  <html>
    <head><title>SuperAGI | AI Super App for Work</title></head>
    <body>
      <h1>AI Super App for Work</h1>
      <p>SuperAGI combines 25+ AI-Native Apps and Agents in One Single Platform.</p>
    </body>
  </html>
`

test('hasOfficialSiteSignal recognizes the official SuperAGI homepage', () => {
  assert.equal(hasOfficialSiteSignal(officialHomepageHtml), true)
  assert.equal(hasOfficialSiteSignal('<html><body>Unknown site</body></html>'), false)
})

test('run returns no jobs when SuperAGI only exposes the verified official homepage', async () => {
  const requestedUrls = []

  const jobs = await createSuperagiScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialHomepageHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})
