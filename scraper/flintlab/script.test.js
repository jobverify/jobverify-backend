import assert from 'node:assert/strict'
import test from 'node:test'

import {
  HOMEPAGE_URL,
  NO_PUBLIC_CAREERS_ROUTE_URLS,
  SITEMAP_URL,
  createFlintLabScraper,
  hasOfficialHomepageSignal,
} from './script.js'

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>FlintLab Sirius - Device Infrastructure PaaS</title>
    </head>
    <body>
      <a href="/request-demo">Request a Demo</a>
      <p>Begin Your Journey Towards Precision Testing</p>
      <p>Login to continue</p>
      <p>FlintLab powers efficient, collaborative testing across devices.</p>
      <p>What's New</p>
      <a href="https://www.linkedin.com/company/flintlab-inc">LinkedIn</a>
    </body>
  </html>
`

const sitemapXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://flintlab.io/</loc></url>
    <url><loc>https://flintlab.io/platform</loc></url>
    <url><loc>https://flintlab.io/pricing</loc></url>
    <url><loc>https://flintlab.io/about</loc></url>
  </urlset>
`

const missingRouteHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>404: This page could not be found.</title>
    </head>
    <body>
      <h1>404</h1>
      <p>This page could not be found.</p>
      <p>FlintLab - AI-Powered Device Infrastructure PaaS</p>
    </body>
  </html>
`

test('FlintLab accepts the current homepage shell without the old mailto requirement', () => {
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
})

test('FlintLab run returns [] while the verified homepage, sitemap, and no-careers routes still hold', async () => {
  const requestedUrls = []

  const jobs = await createFlintLabScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === SITEMAP_URL) return { status: 200, url, html: sitemapXml }
      if (NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    SITEMAP_URL,
    ...NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})
