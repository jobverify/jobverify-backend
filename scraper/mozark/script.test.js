import assert from 'node:assert/strict'
import test from 'node:test'

const loadMozarkModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Mozark scraper module at ./script.js')
  }
}

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Mozark | AI-Native Synthetic Testing - Built for Enterprise &amp; Public Sector</title>
    <meta property="og:site_name" content="Mozark">
    <meta
      name="description"
      content="Monitor the user experience on your app or network without privacy intrusive end user data collection agents or expensive backend telemetry data collection"
    >
  </head>
  <body>
    <main>
      <h1>AI-Native Synthetic Testing</h1>
      <a href="/contact-us">Contact Us</a>
    </main>
  </body>
</html>
`

const officialSitemapIndexXml = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" generatedBy="WIX">
  <sitemap>
    <loc>https://www.mozark.ai/pages-sitemap.xml</loc>
    <lastmod>2026-05-20</lastmod>
  </sitemap>
</sitemapindex>
`

const officialPagesSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" generatedBy="WIX">
  <url>
    <loc>https://www.mozark.ai/privacy-policy-general</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
  <url>
    <loc>https://www.mozark.ai/blank</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
  <url>
    <loc>https://www.mozark.ai/contact-us</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
  <url>
    <loc>https://www.mozark.ai/home-1</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
  <url>
    <loc>https://www.mozark.ai/privacy-policy-5gmark</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
  <url>
    <loc>https://www.mozark.ai/testmozark01082024</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
  <url>
    <loc>https://www.mozark.ai/blank-1</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
  <url>
    <loc>https://www.mozark.ai</loc>
    <lastmod>2026-05-20</lastmod>
  </url>
</urlset>
`

const officialMissingRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>404 Error: Page Not Found</title>
  </head>
  <body></body>
</html>
`

test('Mozark scraper constants stay pinned to the verified homepage, sitemap handoff, and missing careers routes', async () => {
  const mozark = await loadMozarkModule()

  assert.equal(mozark.SOURCE, 'mozark')
  assert.equal(mozark.COMPANY, 'Mozark')
  assert.equal(mozark.HOMEPAGE_URL, 'https://www.mozark.ai/')
  assert.equal(mozark.SITEMAP_INDEX_URL, 'https://www.mozark.ai/sitemap.xml')
  assert.equal(mozark.PAGES_SITEMAP_URL, 'https://www.mozark.ai/pages-sitemap.xml')
  assert.deepEqual(mozark.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://www.mozark.ai/careers',
    'https://www.mozark.ai/careers/',
    'https://www.mozark.ai/career',
    'https://www.mozark.ai/career/',
    'https://www.mozark.ai/jobs',
    'https://www.mozark.ai/jobs/',
    'https://www.mozark.ai/join-us',
    'https://www.mozark.ai/openings',
  ])
  assert.equal(mozark.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(mozark.hasPublicJobsSignal(officialHomepageHtml), false)
  assert.equal(mozark.extractPagesSitemapUrl(officialSitemapIndexXml), mozark.PAGES_SITEMAP_URL)
  assert.equal(mozark.sitemapHasCareerLikeUrl(officialPagesSitemapXml), false)
  assert.equal(
    mozark.isVerifiedMissingCareersRoute({
      status: 404,
      url: mozark.NO_PUBLIC_CAREERS_ROUTE_URLS[0],
      html: officialMissingRouteHtml,
    }),
    true,
  )
  assert.equal(
    mozark.isVerifiedMissingCareersRoute({
      status: 200,
      url: mozark.NO_PUBLIC_CAREERS_ROUTE_URLS[0],
      html: '<html><body><h1>Careers</h1><a href="/jobs/platform-engineer">Apply now</a></body></html>',
    }),
    false,
  )
})

test('Mozark returns no jobs only while the verified homepage, sitemap, and careers routes stay unchanged', async () => {
  const mozark = await loadMozarkModule()
  const requestedUrls = []

  const jobs = await mozark.createMozarkScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === mozark.HOMEPAGE_URL) {
        return { status: 200, url, html: officialHomepageHtml }
      }

      if (url === mozark.SITEMAP_INDEX_URL) {
        return { status: 200, url, html: officialSitemapIndexXml }
      }

      if (url === mozark.PAGES_SITEMAP_URL) {
        return { status: 200, url, html: officialPagesSitemapXml }
      }

      if (mozark.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: officialMissingRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    mozark.HOMEPAGE_URL,
    mozark.SITEMAP_INDEX_URL,
    mozark.PAGES_SITEMAP_URL,
    ...mozark.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Mozark fails closed when the verified no-public-careers contract drifts', async () => {
  const mozark = await loadMozarkModule()

  await assert.rejects(
    mozark.createMozarkScraper().run({
      fetchPage: async (url) => {
        if (url === mozark.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    mozark.createMozarkScraper().run({
      fetchPage: async (url) => {
        if (url === mozark.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === mozark.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: officialSitemapIndexXml.replace(
              'https://www.mozark.ai/pages-sitemap.xml',
              'https://www.mozark.ai/jobs-sitemap.xml',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified sitemap index/i,
  )

  await assert.rejects(
    mozark.createMozarkScraper().run({
      fetchPage: async (url) => {
        if (url === mozark.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === mozark.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: officialSitemapIndexXml }
        }

        if (url === mozark.PAGES_SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: officialPagesSitemapXml.replace(
              '</urlset>',
              '<url><loc>https://www.mozark.ai/careers</loc></url></urlset>',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified pages sitemap/i,
  )

  await assert.rejects(
    mozark.createMozarkScraper().run({
      fetchPage: async (url) => {
        if (url === mozark.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === mozark.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: officialSitemapIndexXml }
        }

        if (url === mozark.PAGES_SITEMAP_URL) {
          return { status: 200, url, html: officialPagesSitemapXml }
        }

        if (url === mozark.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><a href="https://jobs.ashbyhq.com/mozark">Open positions</a></body></html>',
          }
        }

        return { status: 404, url, html: officialMissingRouteHtml }
      },
    }),
    /careers routes changed materially|public jobs/i,
  )
})
