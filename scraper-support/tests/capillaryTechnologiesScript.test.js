import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  createCapillaryTechnologiesScraper,
  isCareersExperiencePending,
} from '../../scraper/capillarytechnologies/script.js'

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

const cloudflareBlockedPageHtml = `
  <!doctype html>
  <html lang="en-US">
    <head><title>Just a moment...</title></head>
    <body>
      <h1>Just a moment...</h1>
      <p>Enable JavaScript and cookies to continue</p>
      <p>Sorry, you have been blocked</p>
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

test('surfaces Capillary Technologies direct-request failures without a browser fallback', async () => {
  await assert.rejects(
    createCapillaryTechnologiesScraper().run({
      fetchText: async () => {
        throw new Error(`HTTP 403 for ${CAREER_PAGE_URL}`)
      },
    }),
    /HTTP 403 for https:\/\/www\.capillarytech\.com\/careers\//,
  )
})

test('returns no jobs when the verified Capillary Technologies careers route is Cloudflare-blocked on Thursday, August 13, 2026', async () => {
  const requestedPageUrls = []

  const jobs = await createCapillaryTechnologiesScraper().run({
    fetchText: async (url) => {
      throw new Error(`HTTP 403 for ${url}`)
    },
    fetchPage: async (url) => {
      requestedPageUrls.push(url)
      return {
        status: 403,
        url,
        html: cloudflareBlockedPageHtml,
      }
    },
  })

  assert.deepEqual(requestedPageUrls, [CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})
