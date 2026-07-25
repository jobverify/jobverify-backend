import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Unlox Academy scraper module at ./script.js')
  }
}

const homepageHtml = `
  <html lang="en-IN">
    <head>
      <title>unloxacademy.com</title>
      <meta name="author" content="Unlox Academy" />
      <meta property="og:site_name" content="Unlox Academy" />
      <meta name="twitter:description" content="Launching Soon" />
    </head>
    <body>
      <h1>Launching Soon</h1>
      <h2>Contact Us</h2>
      <p>Copyright © 2025 Unlox Academy - All Rights Reserved.</p>
      <p>Powered by GoDaddy</p>
    </body>
  </html>
`

const sitemapIndexXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <loc>http://unloxacademy.com/sitemap.website.xml</loc>
    </sitemap>
  </sitemapindex>
`

const homepageSitemapXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>http://unloxacademy.com/</loc>
      <lastmod>2025-01-31</lastmod>
      <changefreq>weekly</changefreq>
      <priority>1</priority>
    </url>
  </urlset>
`

const missingRoutePage = (url) => ({
  status: 404,
  url,
  html: `
    <html lang="en-IN">
      <head>
        <title>unloxacademy.com</title>
        <meta property="og:url" content="https://unloxacademy.com/404" />
        <meta property="og:site_name" content="Unlox Academy" />
        <meta name="twitter:description" content="Launching Soon" />
      </head>
      <body>
        <h1>404</h1>
        <p>Launching Soon</p>
        <a href="/">Go To Home Page</a>
      </body>
    </html>
  `,
})

test('Unlox Academy sentinel pins the verified official homepage, sitemap, and first-party missing-job routes', async () => {
  const unloxacademy = await loadModule()

  assert.equal(unloxacademy.SOURCE, 'unloxacademy')
  assert.equal(unloxacademy.COMPANY, 'Unlox Academy')
  assert.equal(unloxacademy.HOMEPAGE_URL, 'https://unloxacademy.com/')
  assert.equal(unloxacademy.SITEMAP_INDEX_URL, 'https://unloxacademy.com/sitemap.xml')
  assert.equal(unloxacademy.SITEMAP_URL, 'https://unloxacademy.com/sitemap.website.xml')
  assert.deepEqual(unloxacademy.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://unloxacademy.com/careers',
    'https://unloxacademy.com/careers/',
    'https://unloxacademy.com/jobs',
    'https://unloxacademy.com/jobs/',
    'https://unloxacademy.com/join-us',
    'https://unloxacademy.com/join-us/',
    'https://unloxacademy.com/openings',
    'https://unloxacademy.com/opportunities',
  ])
  assert.equal(unloxacademy.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(unloxacademy.hasFirstPartyCareerLikeLink(homepageHtml), false)
  assert.equal(unloxacademy.hasVerifiedSitemapIndexSignal(sitemapIndexXml), true)
  assert.equal(unloxacademy.hasVerifiedHomepageSitemapSignal(homepageSitemapXml), true)
  assert.equal(
    unloxacademy.isVerifiedMissingCareerRoute(missingRoutePage('https://unloxacademy.com/careers')),
    true,
  )
})

test('Unlox Academy sentinel returns [] only while the verified official non-listing surface remains unchanged', async () => {
  const unloxacademy = await loadModule()
  const requestedUrls = []

  const jobs = await unloxacademy.createUnloxAcademyScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === unloxacademy.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === unloxacademy.SITEMAP_INDEX_URL) {
        return { status: 200, url, html: sitemapIndexXml }
      }

      if (url === unloxacademy.SITEMAP_URL) {
        return { status: 200, url, html: homepageSitemapXml }
      }

      if (unloxacademy.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return missingRoutePage(url)
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    unloxacademy.HOMEPAGE_URL,
    unloxacademy.SITEMAP_INDEX_URL,
    unloxacademy.SITEMAP_URL,
    ...unloxacademy.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Unlox Academy sentinel fails closed when the official surface starts exposing jobs or drifts', async () => {
  const unloxacademy = await loadModule()

  await assert.rejects(
    unloxacademy.createUnloxAcademyScraper().run({
      fetchPage: async (url) => {
        if (url === unloxacademy.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml.replace('</body>', '<a href="/careers">Careers</a></body>'),
          }
        }

        if (url === unloxacademy.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === unloxacademy.SITEMAP_URL) {
          return { status: 200, url, html: homepageSitemapXml }
        }

        return missingRoutePage(url)
      },
    }),
    /homepage now exposes a first-party careers or jobs link/i,
  )

  await assert.rejects(
    unloxacademy.createUnloxAcademyScraper().run({
      fetchPage: async (url) => {
        if (url === unloxacademy.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === unloxacademy.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === unloxacademy.SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: homepageSitemapXml.replace(
              '</urlset>',
              '<url><loc>https://unloxacademy.com/careers</loc></url></urlset>',
            ),
          }
        }

        return missingRoutePage(url)
      },
    }),
    /verified homepage sitemap/i,
  )

  await assert.rejects(
    unloxacademy.createUnloxAcademyScraper().run({
      fetchPage: async (url) => {
        if (url === unloxacademy.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === unloxacademy.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === unloxacademy.SITEMAP_URL) {
          return { status: 200, url, html: homepageSitemapXml }
        }

        if (url === unloxacademy.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Current Openings</h1><a href="/apply">Apply now</a></body></html>',
          }
        }

        return missingRoutePage(url)
      },
    }),
    /verified no-public-careers route changed/i,
  )
})
