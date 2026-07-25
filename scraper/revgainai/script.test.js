import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>RevGain | Revolutionize Retention &amp; Expansion with AI-Powered Growth</title>
    <meta
      name="description"
      content="RevGain Revenue Platform transforms your growth flywheel by enabling higher retention &amp; expansion. Powered by Human + AI collaboration, it optimizes revenue and accelerates sustainable."
    />
  </head>
  <body>
    <nav>
      <a href="/platform">Platform</a>
      <a href="/resources/blogs">Blogs</a>
      <a href="/signup">Sign up</a>
    </nav>
    <main>
      <h1>The revenue platform that Transforms your Growth Flywheel</h1>
      <p>
        RevGain Revenue Platform enables higher retention &amp; expansion of your growth flywheel,
        with an augmented workforce of Human + AI working together.
      </p>
      <p>Reducing friction in the flywheel &amp; eliminating internal silos unlocks 4-6x Revenue Growth</p>
      <h2>Drive Engagement with Customer Data, Insights &amp; Actions</h2>
    </main>
  </body>
</html>
`

const sitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.revgain.ai/</loc></url>
  <url><loc>https://www.revgain.ai/platform</loc></url>
  <url><loc>https://www.revgain.ai/product/customer-success-platform</loc></url>
  <url><loc>https://www.revgain.ai/resources/blogs</loc></url>
  <url><loc>https://www.revgain.ai/signup</loc></url>
</urlset>
`

const missingCareerRoutePage = {
  status: 404,
  url: 'https://www.revgain.ai/careers',
  html: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Page Not Found | Framer</title>
      </head>
      <body>
        <main>
          <h1>Page Not Found</h1>
          <p>The page you are looking for does not exist or may have been moved.</p>
          <a href="/">Back to Home</a>
        </main>
      </body>
    </html>
  `,
}

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

test('RevGain AI sentinel recognizes the verified homepage, sitemap, and missing careers routes', async () => {
  const revgain = await loadModule()
  assert.ok(revgain, 'Expected scraper module at ./script.js')

  assert.equal(revgain.SOURCE, 'revgainai')
  assert.equal(revgain.COMPANY, 'RevGain AI')
  assert.equal(revgain.HOMEPAGE_URL, 'https://www.revgain.ai/')
  assert.equal(revgain.SITEMAP_URL, 'https://www.revgain.ai/sitemap.xml')
  assert.deepEqual(revgain.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://www.revgain.ai/careers',
    'https://www.revgain.ai/careers/',
    'https://www.revgain.ai/career',
    'https://www.revgain.ai/career/',
    'https://www.revgain.ai/jobs',
    'https://www.revgain.ai/jobs/',
    'https://www.revgain.ai/join-us',
    'https://www.revgain.ai/join-us/',
    'https://www.revgain.ai/openings',
    'https://www.revgain.ai/openings/',
    'https://www.revgain.ai/work-with-us',
    'https://www.revgain.ai/work-with-us/',
  ])

  assert.equal(revgain.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(revgain.hasUnexpectedCareerLikeLink(homepageHtml), false)
  assert.equal(revgain.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(revgain.sitemapHasCareerLikeUrl(sitemapXml), false)
  assert.equal(revgain.isVerifiedMissingCareerRoute(missingCareerRoutePage), true)
})

test('RevGain AI sentinel returns no jobs only while the verified first-party surface exposes no public careers board', async () => {
  const revgain = await loadModule()
  assert.ok(revgain, 'Expected scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await revgain.createRevgainAiScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === revgain.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === revgain.SITEMAP_URL) {
        return { status: 200, url, html: sitemapXml }
      }

      if (revgain.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return { ...missingCareerRoutePage, url }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    revgain.HOMEPAGE_URL,
    revgain.SITEMAP_URL,
    ...revgain.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('RevGain AI sentinel fails closed when the verified public surface drifts', async () => {
  const revgain = await loadModule()
  assert.ok(revgain, 'Expected scraper module at ./script.js')

  await assert.rejects(
    revgain.createRevgainAiScraper().run({
      fetchPage: async (url) => {
        if (url === revgain.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    revgain.createRevgainAiScraper().run({
      fetchPage: async (url) => {
        if (url === revgain.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml.replace('</nav>', '<a href="/careers">Careers</a></nav>'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage now exposes a first-party careers path/i,
  )

  await assert.rejects(
    revgain.createRevgainAiScraper().run({
      fetchPage: async (url) => {
        if (url === revgain.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === revgain.SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: sitemapXml.replace(
              '</urlset>',
              '<url><loc>https://www.revgain.ai/careers</loc></url></urlset>',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /sitemap/i,
  )

  await assert.rejects(
    revgain.createRevgainAiScraper().run({
      fetchPage: async (url) => {
        if (url === revgain.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === revgain.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        if (url === revgain.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><p>Current Openings</p></body></html>',
          }
        }

        if (revgain.NO_PUBLIC_CAREERS_ROUTE_URLS.slice(1).includes(url)) {
          return { ...missingCareerRoutePage, url }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /missing first-party careers route changed or now exposes a public careers surface/i,
  )
})
