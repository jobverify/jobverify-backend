import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>AvenDATA \u2013 Decommission Legacy Systems &amp; Archive Data Securely</title>
  </head>
  <body>
    <nav>
      <a href="https://avendata.com/why-avendata">Why AvenDATA</a>
      <a href="https://avendata.com/careers">Careers</a>
      <a href="https://avendata.com/contact">Contact</a>
    </nav>
    <main>
      <h1>Legacy Applications &amp; Application Retirement</h1>
      <p>Archive legacy systems securely and modernize enterprise data access.</p>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at AvenDATA \u2013 Archive Legacy Systems &amp; Carve-Outs</title>
    <meta name="keywords" content="Archiving Specialist Job Openings, Legacy Systems, AvenDATA" />
    <link rel="canonical" href="https://avendata.com/careers" />
  </head>
  <body>
    <main>
      <h1>Careers at AvenDATA</h1>
      <h2>Join Our Global Team of Industry Specialists!</h2>
      <p>Our mission is to cultivate an inclusive, diverse, remote-first culture.</p>
      <h3>Apply Now to Join a Dynamic, Forward-Thinking Enterprise Team</h3>
      <p>Upload Your Resume</p>
      <button type="submit">Submit Application</button>
    </main>
  </body>
</html>
`

const currentHomepageHtml = homepageHtml.replace(
  '<title>AvenDATA \u2013 Decommission Legacy Systems &amp; Archive Data Securely</title>',
  '<title>Decommission Legacy Systems &amp; Archive Data Securely | AvenDATA</title>',
)
const currentCareersHtml = careersHtml.replace(
  '<title>Careers at AvenDATA \u2013 Archive Legacy Systems &amp; Carve-Outs</title>',
  '<title>Careers at AvenDATA : Archive Legacy Systems &amp; Carve-Outs</title>',
)

test('AvenDATA recognizes the current official page titles while retaining the no-listings checks', async () => {
  const avenData = await loadAvenDataModule()
  assert.equal(avenData.hasOfficialHomepageSignal(currentHomepageHtml), true)
  assert.equal(avenData.extractHomepageCareerUrl(currentHomepageHtml), avenData.CAREERS_PAGE_URL)
  assert.equal(avenData.hasOfficialCareersSignal(currentCareersHtml), true)
  assert.equal(avenData.hasOfficialCareersSignal(currentCareersHtml + '<a href="https://avendata.com/careers/new-role">Job</a>'), false)
})

const publicJobsCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at AvenDATA \u2013 Archive Legacy Systems &amp; Carve-Outs</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Senior Data Archivist"}
    </script>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://avendata.com/careers/senior-data-archivist">Apply now</a>
    </main>
  </body>
</html>
`

const robotsTxt = `
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Sitemap: https://avendata.com/sitemap.xml
`

const sitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://avendata.com/</loc></url>
  <url><loc>https://avendata.com/about-us</loc></url>
  <url><loc>https://avendata.com/careers</loc></url>
  <url><loc>https://avendata.com/contact</loc></url>
</urlset>
`

const driftedSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://avendata.com/</loc></url>
  <url><loc>https://avendata.com/careers</loc></url>
  <url><loc>https://avendata.com/careers/senior-data-archivist</loc></url>
</urlset>
`

const missingRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Page not found &#8211; AvenDATA &#8211; IT Application Decommissioning</title>
  </head>
  <body>
    <main>
      <h1>Page not found</h1>
    </main>
  </body>
</html>
`

const loadAvenDataModule = async () => {
  try {
    return await import('../../scraper/avendata/script.js')
  } catch {
    assert.fail('Expected AvenDATA scraper module at ../../scraper/avendata/script.js')
  }
}

test('AvenDATA constants stay pinned to the verified homepage, careers form page, sitemap, alias routes, and missing job routes', async () => {
  const avenData = await loadAvenDataModule()

  assert.equal(avenData.SOURCE, 'avendata')
  assert.equal(avenData.COMPANY, 'AvenDATA')
  assert.equal(avenData.OFFICIAL_BRAND_NAME, 'AvenDATA')
  assert.equal(avenData.VERIFIED_ON, '2026-10-03')
  assert.equal(avenData.HOMEPAGE_URL, 'https://avendata.com/')
  assert.equal(avenData.CAREERS_PAGE_URL, 'https://avendata.com/careers')
  assert.equal(avenData.ROBOTS_TXT_URL, 'https://avendata.com/robots.txt')
  assert.equal(avenData.SITEMAP_URL, 'https://avendata.com/sitemap.xml')
  assert.deepEqual(avenData.SITEMAP_CAREER_ROUTE_URLS, ['https://avendata.com/careers'])
  assert.deepEqual(avenData.CAREER_ALIAS_ROUTE_URLS, [
    'https://avendata.com/careers/',
    'https://www.avendata.com/careers',
  ])
  assert.deepEqual(avenData.NO_PUBLIC_JOB_ROUTE_URLS, [
    'https://avendata.com/career',
    'https://avendata.com/jobs',
    'https://avendata.com/join-us',
    'https://avendata.com/work-with-us',
    'https://avendata.com/openings',
    'https://avendata.com/current-openings',
    'https://avendata.com/company/careers',
    'https://avendata.com/about/careers',
  ])
  assert.match(avenData.VERIFIED_SURFACE_SUMMARY, /Upload Your Resume/i)
  assert.equal(avenData.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(
    avenData.extractHomepageCareerUrl(homepageHtml),
    'https://avendata.com/careers',
  )
  assert.equal(avenData.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(avenData.hasExpectedRobotsTxt(robotsTxt), true)
  assert.equal(avenData.hasExpectedCareerRouteSet(sitemapXml), true)
  assert.equal(avenData.hasExpectedCareerRouteSet(driftedSitemapXml), false)
  assert.deepEqual(avenData.extractPublicJobLinks(careersHtml), [])
  assert.deepEqual(avenData.extractPublicJobLinks(publicJobsCareersHtml), [
    'https://avendata.com/careers/senior-data-archivist',
  ])
  assert.equal(
    avenData.isVerifiedCareerAliasPage({
      status: 200,
      url: avenData.CAREERS_PAGE_URL,
      html: careersHtml,
    }),
    true,
  )
  assert.equal(
    avenData.isVerifiedMissingPublicJobRoute({
      status: 404,
      url: avenData.NO_PUBLIC_JOB_ROUTE_URLS[0],
      html: missingRouteHtml,
    }),
    true,
  )
})

test('AvenDATA sentinel returns [] only while the verified first-party careers surface remains unchanged', async () => {
  const avenData = await loadAvenDataModule()
  const requestedUrls = []

  const jobs = await avenData.createAvenDataScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === avenData.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === avenData.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === avenData.ROBOTS_TXT_URL) {
        return { status: 200, url, html: robotsTxt }
      }

      if (url === avenData.SITEMAP_URL) {
        return { status: 200, url, html: sitemapXml }
      }

      if (avenData.CAREER_ALIAS_ROUTE_URLS.includes(url)) {
        return { status: 200, url: avenData.CAREERS_PAGE_URL, html: careersHtml }
      }

      if (avenData.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    avenData.HOMEPAGE_URL,
    avenData.CAREERS_PAGE_URL,
    avenData.ROBOTS_TXT_URL,
    avenData.SITEMAP_URL,
    ...avenData.CAREER_ALIAS_ROUTE_URLS,
    ...avenData.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('AvenDATA sentinel fails closed when the homepage, careers page, robots, sitemap, alias routes, or missing routes drift into public jobs', async () => {
  const avenData = await loadAvenDataModule()

  await assert.rejects(
    avenData.createAvenDataScraper().run({
      fetchPage: async (url) => {
        if (url === avenData.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected homepage</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    avenData.createAvenDataScraper().run({
      fetchPage: async (url) => {
        if (url === avenData.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avenData.CAREERS_PAGE_URL) {
          return { status: 200, url, html: publicJobsCareersHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers resume-form surface|public jobs/i,
  )

  await assert.rejects(
    avenData.createAvenDataScraper().run({
      fetchPage: async (url) => {
        if (url === avenData.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avenData.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === avenData.ROBOTS_TXT_URL) {
          return { status: 200, url, html: 'User-agent: *' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /robots\.txt/i,
  )

  await assert.rejects(
    avenData.createAvenDataScraper().run({
      fetchPage: async (url) => {
        if (url === avenData.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avenData.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === avenData.ROBOTS_TXT_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === avenData.SITEMAP_URL) {
          return { status: 200, url, html: driftedSitemapXml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /sitemap/i,
  )

  await assert.rejects(
    avenData.createAvenDataScraper().run({
      fetchPage: async (url) => {
        if (url === avenData.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avenData.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === avenData.ROBOTS_TXT_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === avenData.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        if (url === avenData.CAREER_ALIAS_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsCareersHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /career alias route changed materially or now exposes public jobs/i,
  )

  await assert.rejects(
    avenData.createAvenDataScraper().run({
      fetchPage: async (url) => {
        if (url === avenData.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avenData.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === avenData.ROBOTS_TXT_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === avenData.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        if (avenData.CAREER_ALIAS_ROUTE_URLS.includes(url)) {
          return { status: 200, url: avenData.CAREERS_PAGE_URL, html: careersHtml }
        }

        if (url === avenData.NO_PUBLIC_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsCareersHtml }
        }

        if (avenData.NO_PUBLIC_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /adjacent job route changed materially or now exposes public jobs/i,
  )
})
