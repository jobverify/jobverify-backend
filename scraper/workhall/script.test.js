import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_ROUTE_URLS,
  COMPANY,
  HOMEPAGE_URL,
  SOURCE,
  createWorkhallScraper,
  hasOfficialHomepageSignal,
  hasPublicJobsSignal,
  isVerifiedNoPublicJobsRoute,
} from './script.js'

const homepageHtml = `
  <html>
    <head>
      <title>Workhall | AI-driven no-code business process platform</title>
      <meta property="og:url" content="https://workhall.co/">
    </head>
    <body>
      <header>
        <a href="https://workhall.co/">workhall.co</a>
      </header>
      <main>
        <h1>Workhall</h1>
        <p>Automate work with a no-code process orchestration platform.</p>
      </main>
    </body>
  </html>
`

const notFoundRoute = {
  status: 404,
  url: 'https://workhall.co/careers',
  html: '<html><body><h1>404</h1><p>Page not found</p></body></html>',
}

const redirectedHomepageRoute = {
  status: 200,
  url: 'https://workhall.co/',
  html: homepageHtml,
}

const publicJobsRoute = {
  status: 200,
  url: 'https://workhall.co/careers',
  html: '<html><body><h1>Current Openings</h1><a href="/apply">Apply now</a></body></html>',
}

test('Workhall sentinel stays pinned to the official homepage and common careers routes', () => {
  assert.equal(SOURCE, 'workhall')
  assert.equal(COMPANY, 'Workhall Pvt Ltd')
  assert.equal(HOMEPAGE_URL, 'https://workhall.co/')
  assert.equal(CAREERS_ROUTE_URLS.length, 8)
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasPublicJobsSignal(publicJobsRoute.html), true)
})

test('isVerifiedNoPublicJobsRoute accepts 404s and homepage redirects but rejects public job pages', () => {
  assert.equal(isVerifiedNoPublicJobsRoute(notFoundRoute), true)
  assert.equal(isVerifiedNoPublicJobsRoute(redirectedHomepageRoute), true)
  assert.equal(isVerifiedNoPublicJobsRoute(publicJobsRoute), false)
})

test('run returns an empty list only when Workhall exposes no public careers surface on common routes', async () => {
  const requestedUrls = []
  const scraper = createWorkhallScraper()

  const jobs = await scraper.run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) {
        return {
          status: 200,
          url: HOMEPAGE_URL,
          html: homepageHtml,
        }
      }

      return {
        ...notFoundRoute,
        url,
      }
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, ...CAREERS_ROUTE_URLS])
  assert.deepEqual(jobs, [])
})
