import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Manycon Trading and Contracting scraper module at ./script.js')
  }
}

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Home - Manycon India | Expert Fire Protection, Coatings &amp; Construction Services</title>
    <link rel="canonical" href="https://manycon.com/" />
    <meta
      name="description"
      content="Qatar &amp; Saudi Arabia Leading Fireproofing Services and firestopping solutions."
    />
  </head>
  <body>
    <nav>
      <a href="https://manycon.com/about/">About Us</a>
      <a href="https://manycon.com/contact/">Contact</a>
      <a href="https://manycon.com/fireproofing-services/">Fireproofing Services</a>
      <a href="https://manycon.com/construction-solutions/">Construction Solutions</a>
    </nav>
    <main>
      <span>Welcome To Manycon</span>
      <h1>Qatar &amp; Saudi Arabia Leading Fireproofing Services</h1>
      <p>Manycon India delivers certified fireproofing, passive fire protection and construction services.</p>
      <p>Qatar &amp; Saudi Arabia's QCDD-Approved Certified Experts in Fireproofing, Passive Fire Protection &amp; Road Marking</p>
      <p>Proudly serving Qatar's &amp; Saudi Arabia's top companies and organizations.</p>
    </main>
    <footer>
      <p>2025 <a href="https://manycon.com/">ManyconQatar</a>. All Rights Reserved.</p>
    </footer>
  </body>
</html>
`

const ABOUT_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>About Us - Manycon India | Expert Fire Protection, Coatings &amp; Construction Services</title>
    <link rel="canonical" href="https://manycon.com/about/" />
  </head>
  <body>
    <main>
      <h1>About Us</h1>
      <p>3,200+ Firestop Projects in Qatar | 100+ in Saudi Arabia</p>
      <p>Mega Manycon brings unmatched regional experience to every project.</p>
      <p>Completed major commercial and industrial projects across Qatar and Saudi Arabia.</p>
    </main>
  </body>
</html>
`

const SITEMAP_INDEX_XML = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc><![CDATA[https://manycon.com/post-sitemap.xml]]></loc></sitemap>
  <sitemap><loc><![CDATA[https://manycon.com/page-sitemap.xml]]></loc></sitemap>
  <sitemap><loc><![CDATA[https://manycon.com/category-sitemap.xml]]></loc></sitemap>
</sitemapindex>
`

const PAGE_SITEMAP_XML = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://manycon.com/</loc></url>
  <url><loc>https://manycon.com/about/</loc></url>
  <url><loc>https://manycon.com/contact/</loc></url>
  <url><loc>https://manycon.com/fireproofing-services/</loc></url>
  <url><loc>https://manycon.com/construction-solutions/</loc></url>
</urlset>
`

const MISSING_ROUTE_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Page not found - Manycon India | Expert Fire Protection, Coatings &amp; Construction Services</title>
    <link rel="canonical" href="https://manycon.com/careers/" />
  </head>
  <body>
    <main>
      <h1>Oops! That page can’t be found.</h1>
      <p>It looks like nothing was found at this location.</p>
    </main>
  </body>
</html>
`

test('Manycon Trading and Contracting sentinel pins the verified first-party zero-public-careers surface', async () => {
  const scraper = await loadModule()

  assert.equal(scraper.SOURCE, 'manycontradingandcontracting')
  assert.equal(scraper.COMPANY, 'Manycon Trading and Contracting')
  assert.equal(scraper.VERIFIED_AT, '2026-07-13')
  assert.equal(scraper.HOMEPAGE_URL, 'https://manycon.com/')
  assert.equal(scraper.ABOUT_URL, 'https://manycon.com/about/')
  assert.equal(scraper.SITEMAP_INDEX_URL, 'https://manycon.com/sitemap_index.xml')
  assert.equal(scraper.PAGE_SITEMAP_URL, 'https://manycon.com/page-sitemap.xml')
  assert.deepEqual(scraper.MISSING_ROUTE_URLS, [
    'https://manycon.com/careers',
    'https://manycon.com/careers/',
    'https://manycon.com/career',
    'https://manycon.com/career/',
    'https://manycon.com/jobs',
    'https://manycon.com/jobs/',
    'https://manycon.com/join-us',
    'https://manycon.com/join-us/',
    'https://manycon.com/work-with-us',
    'https://manycon.com/vacancies',
    'https://manycon.com/current-openings',
  ])

  assert.equal(scraper.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(scraper.hasOfficialAboutSignal(ABOUT_HTML), true)
  assert.equal(scraper.hasOfficialSitemapIndexSignal(SITEMAP_INDEX_XML), true)
  assert.equal(scraper.hasOfficialPageSitemapSignal(PAGE_SITEMAP_XML), true)
  assert.equal(
    scraper.isVerifiedMissingRoute({ status: 404, html: MISSING_ROUTE_HTML }),
    true,
  )
})

test('Manycon Trading and Contracting sentinel returns [] only while the verified first-party surface exposes no public careers board', async () => {
  const scraper = await loadModule()
  const requestedUrls = []

  const jobs = await scraper.createManyconTradingAndContractingScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === scraper.HOMEPAGE_URL) return { status: 200, url, html: HOMEPAGE_HTML }
      if (url === scraper.ABOUT_URL) return { status: 200, url, html: ABOUT_HTML }
      if (url === scraper.SITEMAP_INDEX_URL) return { status: 200, url, html: SITEMAP_INDEX_XML }
      if (url === scraper.PAGE_SITEMAP_URL) return { status: 200, url, html: PAGE_SITEMAP_XML }
      if (scraper.MISSING_ROUTE_URLS.includes(url)) return { status: 404, url, html: MISSING_ROUTE_HTML }

      throw new Error(`Unexpected URL ${url}`)
    },
  })

  assert.deepEqual(
    requestedUrls,
    [
      scraper.HOMEPAGE_URL,
      scraper.ABOUT_URL,
      scraper.SITEMAP_INDEX_URL,
      scraper.PAGE_SITEMAP_URL,
      ...scraper.MISSING_ROUTE_URLS,
    ],
  )
  assert.deepEqual(jobs, [])
})

test('Manycon Trading and Contracting sentinel fails closed when the verified public surface drifts into a jobs surface', async () => {
  const scraper = await loadModule()

  await assert.rejects(
    scraper.createManyconTradingAndContractingScraper().run({
      fetchPage: async (url) => {
        if (url === scraper.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: HOMEPAGE_HTML.replace(
              '<a href="https://manycon.com/contact/">Contact</a>',
              '<a href="https://manycon.com/careers/">Careers</a>',
            ),
          }
        }

        if (url === scraper.ABOUT_URL) return { status: 200, url, html: ABOUT_HTML }
        if (url === scraper.SITEMAP_INDEX_URL) return { status: 200, url, html: SITEMAP_INDEX_XML }
        if (url === scraper.PAGE_SITEMAP_URL) return { status: 200, url, html: PAGE_SITEMAP_XML }
        return { status: 404, url, html: MISSING_ROUTE_HTML }
      },
    }),
    /verified homepage no longer matches|verified public surface changed/i,
  )

  await assert.rejects(
    scraper.createManyconTradingAndContractingScraper().run({
      fetchPage: async (url) => {
        if (url === scraper.HOMEPAGE_URL) return { status: 200, url, html: HOMEPAGE_HTML }
        if (url === scraper.ABOUT_URL) return { status: 200, url, html: ABOUT_HTML }
        if (url === scraper.SITEMAP_INDEX_URL) return { status: 200, url, html: SITEMAP_INDEX_XML }
        if (url === scraper.PAGE_SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: PAGE_SITEMAP_XML.replace(
              '</urlset>',
              '<url><loc>https://manycon.com/careers/</loc></url></urlset>',
            ),
          }
        }

        return { status: 404, url, html: MISSING_ROUTE_HTML }
      },
    }),
    /verified page sitemap no longer matches|verified public surface changed/i,
  )

  await assert.rejects(
    scraper.createManyconTradingAndContractingScraper().run({
      fetchPage: async (url) => {
        if (url === scraper.HOMEPAGE_URL) return { status: 200, url, html: HOMEPAGE_HTML }
        if (url === scraper.ABOUT_URL) return { status: 200, url, html: ABOUT_HTML }
        if (url === scraper.SITEMAP_INDEX_URL) return { status: 200, url, html: SITEMAP_INDEX_XML }
        if (url === scraper.PAGE_SITEMAP_URL) return { status: 200, url, html: PAGE_SITEMAP_XML }
        if (url === 'https://manycon.com/careers') {
          return {
            status: 200,
            url,
            html: '<html><head><title>Careers - Manycon</title></head><body><h1>Join Manycon</h1></body></html>',
          }
        }

        return { status: 404, url, html: MISSING_ROUTE_HTML }
      },
    }),
    /missing-route validation failed/i,
  )
})
