import assert from 'node:assert/strict'
import test from 'node:test'

const loadCampalinModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Campalin scraper module at ./script.js')
  }
}

const homepageHtml = `
<!DOCTYPE html>
<html lang="en-IN">
  <head>
    <title>campalin.in</title>
    <meta name="author" content="campalin.in" />
    <meta name="generator" content="Starfield Technologies; Go Daddy Website Builder 8.0.0000" />
  </head>
  <body>
    <main>
      <a href="/">campalin.in</a>
      <h1>Launching Soon</h1>
      <p>Contact Us</p>
      <p>Copyright © 2025 campalin.in - All Rights Reserved.</p>
      <p>Powered by GoDaddy</p>
    </main>
  </body>
</html>
`

const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>http://campalin.in/sitemap.website.xml</loc>
  </sitemap>
  <sitemap>
    <loc>http://campalin.in/sitemap.ols.xml</loc>
  </sitemap>
</sitemapindex>`

const websiteSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://campalin.in/</loc>
    <lastmod>2025-07-28</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1</priority>
  </url>
</urlset>`

const missingCareersPage = {
  status: 404,
  url: 'https://campalin.in/careers',
  html: homepageHtml,
}

const publicJobsPage = {
  status: 200,
  url: 'https://campalin.in/careers',
  html: `
    <html>
      <head><title>Careers | Campalin</title></head>
      <body>
        <main>
          <h1>Current Openings</h1>
          <article>
            <h2>Founding Engineer</h2>
            <a href="/careers/founding-engineer">Apply now</a>
          </article>
        </main>
      </body>
    </html>
  `,
}

test('Campalin sentinel pins the verified Campalin first-party placeholder surface', async () => {
  const campalin = await loadCampalinModule()

  assert.equal(campalin.SOURCE, 'campalin')
  assert.equal(campalin.COMPANY, 'Campalin')
  assert.equal(campalin.VERIFIED_AT, '2026-07-13')
  assert.equal(campalin.HOMEPAGE_URL, 'https://campalin.in/')
  assert.equal(campalin.SITEMAP_INDEX_URL, 'https://campalin.in/sitemap.xml')
  assert.equal(campalin.WEBSITE_SITEMAP_URL, 'https://campalin.in/sitemap.website.xml')
  assert.deepEqual(campalin.CAREERS_ROUTE_URLS, [
    'https://campalin.in/careers',
    'https://campalin.in/career',
    'https://campalin.in/jobs',
    'https://campalin.in/job',
    'https://campalin.in/join-us',
    'https://campalin.in/work-with-us',
  ])

  assert.equal(campalin.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(campalin.hasVerifiedSitemapIndexSignal(sitemapIndexXml), true)
  assert.equal(campalin.hasVerifiedWebsiteSitemapSignal(websiteSitemapXml), true)
  assert.equal(campalin.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(campalin.hasPublicJobsSignal(publicJobsPage.html), true)
})

test('Campalin sentinel recognizes the verified no-public-careers routes', async () => {
  const campalin = await loadCampalinModule()

  assert.equal(campalin.isVerifiedNoPublicCareersRoute(missingCareersPage), true)
  assert.equal(campalin.isVerifiedNoPublicCareersRoute(publicJobsPage), false)
})

test('Campalin sentinel returns [] only while the verified first-party placeholder surface remains unchanged', async () => {
  const campalin = await loadCampalinModule()
  const requestedUrls = []

  const jobs = await campalin.createCampalinScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === campalin.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          html: homepageHtml,
        }
      }

      if (url === campalin.SITEMAP_INDEX_URL) {
        return {
          status: 200,
          url,
          html: sitemapIndexXml,
        }
      }

      if (url === campalin.WEBSITE_SITEMAP_URL) {
        return {
          status: 200,
          url,
          html: websiteSitemapXml,
        }
      }

      return {
        ...missingCareersPage,
        url,
      }
    },
  })

  assert.deepEqual(requestedUrls, [
    campalin.HOMEPAGE_URL,
    campalin.SITEMAP_INDEX_URL,
    campalin.WEBSITE_SITEMAP_URL,
    ...campalin.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Campalin sentinel fails closed when the placeholder surface drifts or starts exposing jobs', async () => {
  const campalin = await loadCampalinModule()

  await assert.rejects(
    campalin.createCampalinScraper().run({
      fetchPage: async (url) => {
        if (url === campalin.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Campalin</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage no longer matches/i,
  )

  await assert.rejects(
    campalin.createCampalinScraper().run({
      fetchPage: async (url) => {
        if (url === campalin.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml,
          }
        }

        if (url === campalin.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: sitemapIndexXml.replace('</sitemapindex>', '<sitemap><loc>http://campalin.in/careers</loc></sitemap></sitemapindex>'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /sitemap index no longer matches/i,
  )

  await assert.rejects(
    campalin.createCampalinScraper().run({
      fetchPage: async (url) => {
        if (url === campalin.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml,
          }
        }

        if (url === campalin.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: sitemapIndexXml,
          }
        }

        if (url === campalin.WEBSITE_SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: `${websiteSitemapXml}<loc>http://campalin.in/careers</loc>`,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /website sitemap no longer matches/i,
  )

  await assert.rejects(
    campalin.createCampalinScraper().run({
      fetchPage: async (url) => {
        if (url === campalin.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml,
          }
        }

        if (url === campalin.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: sitemapIndexXml,
          }
        }

        if (url === campalin.WEBSITE_SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: websiteSitemapXml,
          }
        }

        return {
          ...publicJobsPage,
          url,
        }
      },
    }),
    /careers route changed materially or now exposes public jobs/i,
  )
})
