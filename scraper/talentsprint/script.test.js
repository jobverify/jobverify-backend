import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PAGE_URL,
  OFFICIAL_CAREERS_HANDOFF_URL,
  createTalentSprintScraper,
} from './script.js'

const verifiedCareersPage = `
  <html>
    <head><title>TalentSprint Careers | Job Opportunities</title></head>
    <body>
      <p>Go Beyond the Ordinary</p>
      <p>future-proof, modern-day workforce</p>
      <a href="${OFFICIAL_CAREERS_HANDOFF_URL}">View Job Openings</a>
    </body>
  </html>
`

test('TalentSprint returns an empty result when its verified Darwinbox handoff is unavailable', async () => {
  let darwinboxRunCalled = false
  const scraper = createTalentSprintScraper({
    darwinboxScraper: {
      run: async () => {
        darwinboxRunCalled = true
        throw new Error('HTTP 500')
      },
    },
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      assert.equal(url, CAREERS_PAGE_URL)
      return verifiedCareersPage
    },
  })

  assert.equal(darwinboxRunCalled, false)
  assert.deepEqual(jobs, [])
})
