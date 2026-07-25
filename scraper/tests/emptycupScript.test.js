import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  CAREERS_ROUTE_URL,
  JOBS_ROUTE_URL,
  createEmptyCupScraper,
  hasOfficialSiteSignal,
  isMissingCareerRoute,
} from '../emptycup/script.js'

const homepageHtml = `
  <html>
    <head><title>EmptyCup | Interior Design</title></head>
    <body><h1>Welcome to EmptyCup</h1></body>
  </html>
`

const notFoundHtml = `
  <html>
    <head><title>404 Not Found</title></head>
    <body><h1>Not Found</h1></body>
  </html>
`

test('EmptyCup scraper targets the official site and recognizes unavailable careers routes', () => {
  assert.equal(CAREER_PAGE_URL, 'https://emptycup.in/')
  assert.equal(CAREERS_ROUTE_URL, 'https://emptycup.in/careers')
  assert.equal(JOBS_ROUTE_URL, 'https://emptycup.in/jobs')
  assert.equal(hasOfficialSiteSignal(homepageHtml), true)
  assert.equal(isMissingCareerRoute(notFoundHtml), true)
})

test('run returns no jobs when EmptyCup exposes no public careers or jobs route', async () => {
  const requestedUrls = []
  const jobs = await createEmptyCupScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === CAREER_PAGE_URL) return homepageHtml
      if (url === CAREERS_ROUTE_URL || url === JOBS_ROUTE_URL) return notFoundHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREER_PAGE_URL,
    CAREERS_ROUTE_URL,
    JOBS_ROUTE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('run fails closed when the EmptyCup homepage or careers routes change', async () => {
  await assert.rejects(
    createEmptyCupScraper().run({
      fetchText: async (url) => {
        if (url === CAREER_PAGE_URL) return '<html><title>Unexpected</title></html>'
        return notFoundHtml
      },
    }),
    /verified public surface/i,
  )

  await assert.rejects(
    createEmptyCupScraper().run({
      fetchText: async (url) => {
        if (url === CAREER_PAGE_URL) return homepageHtml
        if (url === CAREERS_ROUTE_URL) return '<html><body>Open Positions</body></html>'
        if (url === JOBS_ROUTE_URL) return notFoundHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /no-public-listings surface/i,
  )
})
