import assert from 'node:assert/strict'
import test from 'node:test'

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>FlintLab Sirius — Device Infrastructure PaaS</title>
  </head>
  <body>
    <a href="#main-content">Skip to main content</a>
    <header>
      <a href="/">FLINTLAB</a>
      <nav>
        <a href="/platform">Platform</a>
        <a href="/blog">Blog</a>
        <a href="/resources">Resources</a>
        <a href="/pricing">Pricing</a>
        <a href="/about">About</a>
      </nav>
    </header>
    <main id="main-content">
      <h1>Begin Your Journey Towards Precision Testing</h1>
      <p>FlintLab powers efficient, collaborative testing across devices.</p>
      <p>Ask Flint Nexus Pioneers</p>
      <a href="mailto:engage@flintlab.io">engage@flintlab.io</a>
      <a href="https://www.linkedin.com/company/flintlab-inc">LinkedIn</a>
    </main>
  </body>
</html>
`

const officialSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://flintlab.io/</loc></url>
  <url><loc>https://flintlab.io/platform</loc></url>
  <url><loc>https://flintlab.io/pricing</loc></url>
  <url><loc>https://flintlab.io/about</loc></url>
  <url><loc>https://flintlab.io/resources</loc></url>
  <url><loc>https://flintlab.io/launchpad</loc></url>
  <url><loc>https://flintlab.io/security</loc></url>
  <url><loc>https://flintlab.io/contact</loc></url>
  <url><loc>https://flintlab.io/krishna-seerapu</loc></url>
  <url><loc>https://flintlab.io/docs</loc></url>
  <url><loc>https://flintlab.io/flintapi-docs</loc></url>
  <url><loc>https://flintlab.io/flintcli-docs</loc></url>
  <url><loc>https://flintlab.io/flintui-docs</loc></url>
  <url><loc>https://flintlab.io/privacy-policy</loc></url>
  <url><loc>https://flintlab.io/blog</loc></url>
</urlset>
`

const loadFlintLabModule = async () => {
  try {
    return await import('../../scraper/flintlab/script.js')
  } catch {
    assert.fail('Expected FlintLab scraper module at ../../scraper/flintlab/script.js')
  }
}

test('FlintLab scraper constants stay pinned to the verified official homepage, sitemap, and no-public-careers routes', async () => {
  const flintLab = await loadFlintLabModule()

  assert.equal(flintLab.SOURCE, 'flintlab')
  assert.equal(flintLab.COMPANY, 'FlintLab')
  assert.equal(flintLab.HOMEPAGE_URL, 'https://flintlab.io/')
  assert.equal(flintLab.SITEMAP_URL, 'https://flintlab.io/sitemap.xml')
  assert.deepEqual(flintLab.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://flintlab.io/careers',
    'https://flintlab.io/careers/',
    'https://flintlab.io/career',
    'https://flintlab.io/career/',
    'https://flintlab.io/jobs',
    'https://flintlab.io/jobs/',
  ])
  assert.equal(flintLab.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(flintLab.sitemapHasCareerLikeUrl(officialSitemapXml), false)
  assert.equal(flintLab.isMissingCareerRoute({ status: 404 }), true)
})

test('FlintLab returns no jobs only while the verified first-party homepage and sitemap expose no careers surface', async () => {
  const flintLab = await loadFlintLabModule()
  const requestedUrls = []

  const jobs = await flintLab.createFlintLabScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === flintLab.HOMEPAGE_URL) {
        return { status: 200, url, html: officialHomepageHtml }
      }

      if (url === flintLab.SITEMAP_URL) {
        return { status: 200, url, html: officialSitemapXml }
      }

      if (flintLab.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: '' }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    flintLab.HOMEPAGE_URL,
    flintLab.SITEMAP_URL,
    ...flintLab.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('FlintLab fails closed when the homepage, sitemap, or a checked careers route changes materially', async () => {
  const flintLab = await loadFlintLabModule()

  await assert.rejects(
    flintLab.createFlintLabScraper().run({
      fetchPage: async (url) => {
        if (url === flintLab.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        if (url === flintLab.SITEMAP_URL) {
          return { status: 200, url, html: officialSitemapXml }
        }

        return { status: 404, url, html: '' }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    flintLab.createFlintLabScraper().run({
      fetchPage: async (url) => {
        if (url === flintLab.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === flintLab.SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: officialSitemapXml.replace(
              '</urlset>',
              '<url><loc>https://flintlab.io/careers</loc></url></urlset>',
            ),
          }
        }

        return { status: 404, url, html: '' }
      },
    }),
    /verified sitemap no longer matches the no-public-careers surface/i,
  )

  await assert.rejects(
    flintLab.createFlintLabScraper().run({
      fetchPage: async (url) => {
        if (url === flintLab.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === flintLab.SITEMAP_URL) {
          return { status: 200, url, html: officialSitemapXml }
        }

        if (url === flintLab.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body>Open positions</body></html>' }
        }

        return { status: 404, url, html: '' }
      },
    }),
    /verified no-public-careers route/i,
  )
})
