import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>BYJU'S Online learning Programs For K3, K10, K12, NEET, JEE, UPSC &amp; Bank Exams</title>
    <meta property="og:url" content="https://byjus.com/">
  </head>
  <body class="home page-template page-template-home page-template-index page-template-homeindex-php">
    <main>
      <h1>BYJU'S Online learning Programs</h1>
      <p>For K3, K10, K12, NEET, JEE, UPSC &amp; Bank Exams</p>
      <a href="/careers-at-byjus/">Careers</a>
    </main>
  </body>
</html>
`

const careersLandingHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>e Learning for Online Courses like UPSC, K3, K10, K12, CBSE NCERT, ICSE, NEET &amp; JEE</title>
    <meta property="og:url" content="https://byjus.com/careers-at-byjus/">
  </head>
  <body class="page-template-careers_at_byjus">
    <main>
      <h1>Careers at BYJU'S</h1>
      <a href="https://byjus.com/careers/all-openings/job-category/tech/">View all Jobs</a>
      <a href="https://byjus.com/careers/all-openings/job-category/sales/">View Jobs</a>
      <p>Drop us a mail at recruitments@byjus.com with your dream department name in the subject line</p>
    </main>
  </body>
</html>
`

const salesApplyHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>e Learning for Online Courses like UPSC, K3, K10, K12, CBSE NCERT, ICSE, NEET &amp; JEE</title>
    <link rel="canonical" href="https://byjus.com/sales-apply/">
  </head>
  <body class="page-template page-template-sales-apply page-template-sales-apply-php">
    <main>
      <h1>career in Sales</h1>
      <p>Unprecedented Job Perks</p>
      <form id="sales-apply-form" action="https://web.mxradon.com/t/FormTracker.aspx" method="post">
        <button type="submit">Apply</button>
      </form>
    </main>
  </body>
</html>
`

const missingRouteHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Page not found - BYJU&#039;S</title>
  </head>
  <body>
    <h1>404</h1>
  </body>
</html>
`

const technetiumHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title></title>
    <meta property="og:url" content="https://byjus.com/chemistry/technetium/">
  </head>
  <body class="post-template-default single single-post slug-technetium">
    <main>
      <h1>Technetium</h1>
      <p>Learn about the chemical element technetium.</p>
    </main>
  </body>
</html>
`

const sitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://byjus.com/post-sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://byjus.com/page-sitemap.xml</loc>
  </sitemap>
</sitemapindex>
`

const sitemapWithCareerUrls = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://byjus.com/careers-at-byjus/</loc></url>
  <url><loc>https://byjus.com/careers/all-openings/</loc></url>
</urlset>
`

const publicJobsHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Current Openings</title>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="https://jobs.lever.co/byjus/software-engineer">Apply now</a>
  </body>
</html>
`

const loadByjusModule = async () => {
  try {
    return await import('../byjus/script.js')
  } catch {
    assert.fail("Expected BYJU'S scraper module at ../byjus/script.js")
  }
}

test("BYJU'S helpers stay pinned to the verified homepage, careers landing page, 404 routes, tech misdirection, and generic sales apply form", async () => {
  const byjus = await loadByjusModule()

  assert.equal(byjus.SOURCE, 'byjus')
  assert.equal(byjus.COMPANY, "BYJU'S")
  assert.equal(byjus.OFFICIAL_BRAND_NAME, "BYJU'S")
  assert.equal(byjus.VERIFIED_ON, '2026-07-15')
  assert.equal(byjus.HOMEPAGE_URL, 'https://byjus.com/')
  assert.equal(byjus.CAREER_PAGE_URL, 'https://byjus.com/careers-at-byjus/')
  assert.equal(byjus.SALES_CATEGORY_ROUTE_URL, 'https://byjus.com/careers/all-openings/job-category/sales/')
  assert.equal(byjus.SALES_APPLY_URL, 'https://byjus.com/sales-apply/')
  assert.equal(byjus.MISDIRECTED_TECH_ROUTE_URL, 'https://byjus.com/careers/all-openings/job-category/tech/')
  assert.equal(byjus.MISDIRECTED_TECH_FINAL_URL, 'https://byjus.com/chemistry/technetium/')
  assert.equal(byjus.SITEMAP_URL, 'https://byjus.com/sitemap.xml')
  assert.deepEqual(byjus.CHECKED_MISSING_ROUTE_URLS, [
    'https://byjus.com/jobs/',
    'https://byjus.com/careers/all-openings/',
    'https://byjus.com/careers/all-openings/job-category/academics/',
  ])
  assert.equal(byjus.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(byjus.hasCareerLandingSignal(careersLandingHtml), true)
  assert.equal(byjus.hasGenericSalesApplySignal(salesApplyHtml), true)
  assert.equal(byjus.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(byjus.hasPublicJobsSignal(publicJobsHtml), true)
  assert.deepEqual(byjus.extractCareerLikeUrlsFromSitemap(sitemapXml), [])
  assert.deepEqual(byjus.extractCareerLikeUrlsFromSitemap(sitemapWithCareerUrls), [
    'https://byjus.com/careers-at-byjus/',
    'https://byjus.com/careers/all-openings/',
  ])
  assert.equal(
    byjus.isMissingCareerRoute({
      status: 404,
      url: byjus.CHECKED_MISSING_ROUTE_URLS[0],
      html: missingRouteHtml,
    }),
    true,
  )
  assert.equal(
    byjus.isMisdirectedTechRoute({
      status: 200,
      url: byjus.MISDIRECTED_TECH_FINAL_URL,
      html: technetiumHtml,
    }),
    true,
  )
  assert.equal(
    byjus.isGenericSalesApplyRoute({
      status: 200,
      url: byjus.SALES_APPLY_URL,
      html: salesApplyHtml,
    }),
    true,
  )
})

test("BYJU'S returns [] only while the verified careers page remains a stale shell and the public jobs routes stay broken or generic", async () => {
  const byjus = await loadByjusModule()
  const requestedUrls = []

  const jobs = await byjus.createByjusScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === byjus.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === byjus.CAREER_PAGE_URL) {
        return { status: 200, url, html: careersLandingHtml }
      }

      if (url === byjus.SALES_CATEGORY_ROUTE_URL) {
        return { status: 200, url: byjus.SALES_APPLY_URL, html: salesApplyHtml }
      }

      if (url === byjus.MISDIRECTED_TECH_ROUTE_URL) {
        return { status: 200, url: byjus.MISDIRECTED_TECH_FINAL_URL, html: technetiumHtml }
      }

      if (url === byjus.SITEMAP_URL) {
        return { status: 200, url, html: sitemapXml }
      }

      if (byjus.CHECKED_MISSING_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected BYJU'S URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    byjus.HOMEPAGE_URL,
    byjus.CAREER_PAGE_URL,
    ...byjus.CHECKED_MISSING_ROUTE_URLS,
    byjus.MISDIRECTED_TECH_ROUTE_URL,
    byjus.SALES_CATEGORY_ROUTE_URL,
    byjus.SITEMAP_URL,
  ])
  assert.deepEqual(jobs, [])
})

test("BYJU'S fails closed when the homepage, careers landing page, broken-route validation, tech misdirection, sales-apply handoff, or sitemap drift changes", async () => {
  const byjus = await loadByjusModule()

  await assert.rejects(
    byjus.createByjusScraper().run({
      fetchPage: async (url) => {
        if (url === byjus.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Unexpected</title></head><body></body></html>' }
        }

        throw new Error(`Unexpected BYJU'S URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    byjus.createByjusScraper().run({
      fetchPage: async (url) => {
        if (url === byjus.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === byjus.CAREER_PAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Unexpected</title></head><body></body></html>' }
        }

        throw new Error(`Unexpected BYJU'S URL: ${url}`)
      },
    }),
    /careers landing page/i,
  )

  await assert.rejects(
    byjus.createByjusScraper().run({
      fetchPage: async (url) => {
        if (url === byjus.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === byjus.CAREER_PAGE_URL) {
          return { status: 200, url, html: careersLandingHtml }
        }

        if (url === byjus.CHECKED_MISSING_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        if (url === byjus.MISDIRECTED_TECH_ROUTE_URL) {
          return { status: 200, url: byjus.MISDIRECTED_TECH_FINAL_URL, html: technetiumHtml }
        }

        if (url === byjus.SALES_CATEGORY_ROUTE_URL) {
          return { status: 200, url: byjus.SALES_APPLY_URL, html: salesApplyHtml }
        }

        if (url === byjus.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        return { status: 404, url, html: missingRouteHtml }
      },
    }),
    /missing career route changed/i,
  )

  await assert.rejects(
    byjus.createByjusScraper().run({
      fetchPage: async (url) => {
        if (url === byjus.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === byjus.CAREER_PAGE_URL) {
          return { status: 200, url, html: careersLandingHtml }
        }

        if (byjus.CHECKED_MISSING_ROUTE_URLS.includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        if (url === byjus.MISDIRECTED_TECH_ROUTE_URL) {
          return { status: 200, url, html: careersLandingHtml }
        }

        if (url === byjus.SALES_CATEGORY_ROUTE_URL) {
          return { status: 200, url: byjus.SALES_APPLY_URL, html: salesApplyHtml }
        }

        if (url === byjus.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        throw new Error(`Unexpected BYJU'S URL: ${url}`)
      },
    }),
    /tech category route/i,
  )

  await assert.rejects(
    byjus.createByjusScraper().run({
      fetchPage: async (url) => {
        if (url === byjus.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === byjus.CAREER_PAGE_URL) {
          return { status: 200, url, html: careersLandingHtml }
        }

        if (byjus.CHECKED_MISSING_ROUTE_URLS.includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        if (url === byjus.MISDIRECTED_TECH_ROUTE_URL) {
          return { status: 200, url: byjus.MISDIRECTED_TECH_FINAL_URL, html: technetiumHtml }
        }

        if (url === byjus.SALES_CATEGORY_ROUTE_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        if (url === byjus.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        throw new Error(`Unexpected BYJU'S URL: ${url}`)
      },
    }),
    /sales category route/i,
  )

  await assert.rejects(
    byjus.createByjusScraper().run({
      fetchPage: async (url) => {
        if (url === byjus.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === byjus.CAREER_PAGE_URL) {
          return { status: 200, url, html: careersLandingHtml }
        }

        if (byjus.CHECKED_MISSING_ROUTE_URLS.includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        if (url === byjus.MISDIRECTED_TECH_ROUTE_URL) {
          return { status: 200, url: byjus.MISDIRECTED_TECH_FINAL_URL, html: technetiumHtml }
        }

        if (url === byjus.SALES_CATEGORY_ROUTE_URL) {
          return { status: 200, url: byjus.SALES_APPLY_URL, html: salesApplyHtml }
        }

        if (url === byjus.SITEMAP_URL) {
          return { status: 200, url, html: sitemapWithCareerUrls }
        }

        throw new Error(`Unexpected BYJU'S URL: ${url}`)
      },
    }),
    /sitemap career surface changed/i,
  )
})
