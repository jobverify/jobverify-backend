import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_ROUTE_URL,
  CAREERS_ROUTE_URL,
  HOMEPAGE_URL,
  JOBS_ROUTE_URL,
  createE6DataScraper,
  hasHomepageCareersSignal,
  hasMissingRouteSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const officialHomepageHtml = `
  <html lang="en">
    <head>
      <title>e6data: 10x Faster Lakehouse Queries at 60% Lower Cost | SQL & AI Engine</title>
    </head>
    <body>
      <header>
        <a href="/pricing">Pricing</a>
        <a href="/about-us">About Us</a>
        <a href="https://docs.e6data.com/">Docs</a>
      </header>
      <main>
        <h1>Compute Engine for Iceberg, Delta Lake, Hudi: Query | ETL | Ingestion</h1>
        <p>The only engine built for the Agentic AI era.</p>
        <p>Save 60% without migrating from Databricks, Snowflake, Redshift, Fabric. 10x faster.</p>
      </main>
      <footer>
        <a href="/blog">Blog</a>
        <a href="/events">Events</a>
      </footer>
    </body>
  </html>
`

const missingRoutePage = {
  status: 404,
  url: CAREERS_ROUTE_URL,
  html: `
    <html>
      <head>
        <title>404 Page Not Found</title>
      </head>
      <body>
        <h1>404</h1>
        <p>The page you are looking for could not be found.</p>
      </body>
    </html>
  `,
}

test('homepage helpers recognize the verified e6data homepage and missing-route surface', () => {
  assert.equal(HOMEPAGE_URL, 'https://www.e6data.com/')
  assert.equal(CAREERS_ROUTE_URL, 'https://www.e6data.com/careers')
  assert.equal(CAREER_ROUTE_URL, 'https://www.e6data.com/career')
  assert.equal(JOBS_ROUTE_URL, 'https://www.e6data.com/jobs')
  assert.equal(hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(hasHomepageCareersSignal(officialHomepageHtml), false)
  assert.equal(hasMissingRouteSignal(missingRoutePage), true)
})

test('run returns no jobs only when the verified homepage matches and all checked public careers routes are still missing', async () => {
  const requestedUrls = []

  const jobs = await createE6DataScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          html: officialHomepageHtml,
        }
      }

      if (url === CAREERS_ROUTE_URL || url === CAREER_ROUTE_URL || url === JOBS_ROUTE_URL) {
        return {
          ...missingRoutePage,
          url,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    CAREERS_ROUTE_URL,
    CAREER_ROUTE_URL,
    JOBS_ROUTE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('run fails closed when the homepage no longer matches the verified official e6data surface', async () => {
  await assert.rejects(
    createE6DataScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><head><title>Placeholder</title></head><body>Coming soon</body></html>',
      }),
    }),
    /e6data homepage no longer matches the verified official public surface/i,
  )
})

test('run fails closed when the verified homepage starts exposing public careers signals', async () => {
  await assert.rejects(
    createE6DataScraper().run({
      fetchPage: async (url) => {
        if (url === HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: `
              <html>
                <head>
                  <title>e6data: 10x Faster Lakehouse Queries at 60% Lower Cost | SQL & AI Engine</title>
                </head>
                <body>
                  <h1>Compute Engine for Iceberg, Delta Lake, Hudi: Query | ETL | Ingestion</h1>
                  <p>The only engine built for the Agentic AI era.</p>
                  <a href="/careers">Careers</a>
                </body>
              </html>
            `,
          }
        }

        return {
          ...missingRoutePage,
          url,
        }
      },
    }),
    /e6data homepage now appears to expose a public careers surface/i,
  )
})

test('run fails closed when any checked public careers route stops being the verified missing surface', async () => {
  await assert.rejects(
    createE6DataScraper().run({
      fetchPage: async (url) => {
        if (url === HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: officialHomepageHtml,
          }
        }

        if (url === JOBS_ROUTE_URL) {
          return {
            status: 200,
            url,
            html: `
              <html>
                <head>
                  <title>Jobs | e6data</title>
                </head>
                <body>
                  <h1>Open Positions</h1>
                </body>
              </html>
            `,
          }
        }

        return {
          ...missingRoutePage,
          url,
        }
      },
    }),
    /e6data public careers surface changed/i,
  )
})
