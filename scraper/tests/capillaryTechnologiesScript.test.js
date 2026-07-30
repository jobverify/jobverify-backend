import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  createCapillaryTechnologiesScraper,
  isCareersExperiencePending,
} from '../capillarytechnologies/script.js'

const pendingCareersHtml = `
  <html>
    <head><title>careers - Capillary Technologies</title></head>
    <body>
      <h1>Careers</h1>
      <p>Thank you for your interest in joining our team!</p>
      <p>We are currently hand-crafting a brand-new careers experience to ensure you have the best possible start with us.</p>
      <p>We’ll be live soon—stay tuned!</p>
    </body>
  </html>
`

test('recognizes Capillary Technologies official careers page while its new experience is pending', () => {
  assert.equal(isCareersExperiencePending(pendingCareersHtml), true)
})

test('returns no jobs while Capillary Technologies has no public job records', async () => {
  const requestedUrls = []
  const jobs = await createCapillaryTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return pendingCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('falls back to a browser-backed Capillary Technologies careers fetch when the direct request is blocked', async () => {
  const browserUrls = []

  const jobs = await createCapillaryTechnologiesScraper().run({
    fetchText: async () => {
      throw new Error(`HTTP 403 for ${CAREER_PAGE_URL}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return pendingCareersHtml
    },
  })

  assert.deepEqual(browserUrls, [CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})
