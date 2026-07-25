import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Digitize Revenue Cycle Management - Ascent Health</title>
  </head>
  <body>
    <nav>
      <a href="https://www.ascenthealthcare.com/who-we-are/">Who we are</a>
      <a href="https://www.ascenthealthcare.com/careers/">Explore Careers</a>
    </nav>
    <section>
      <h2>Join Ascent</h2>
      <p>Breaking barriers for Healthcare providers to achieve financial success, enhanced patient outcomes, and operational excellence.</p>
    </section>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Ascent Career - Join Our Team and Step-in to Exciting Career</title>
    <link rel="canonical" href="https://www.ascenthealthcare.com/careers/">
  </head>
  <body>
    <h1>Let&#8217;s rise beyond, together.</h1>
    <p>Send your updated resume/CV to: careers@ascent-group.com</p>
    <p>Discover exciting opportunities tailored to your skills and aspirations. See our current open positions and join us in shaping the future of healthcare.</p>
    <a href="https://ascenthealthcare.com/careers/">Careers</a>
    <form>
      <label>First Name*</label>
      <label>Last Name*</label>
      <label>Email*</label>
      <label>Mobile No.*</label>
      <label>Which Job are you looking for?*</label>
      <textarea name="your-message"></textarea>
      <label>Upload CV/Resume*</label>
      <input type="file" name="file-12" />
      <label>How did you come across this job information?</label>
      <select name="select-828">
        <option value="Select">Select</option>
        <option value="LinkedIn">LinkedIn</option>
        <option value="Company Website">Company Website</option>
      </select>
    </form>
    <footer>
      <p>©2026 Ascent Health Solutions Inc.</p>
    </footer>
  </body>
</html>
`

const publicJobsCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Ascent Career - Join Our Team and Step-in to Exciting Career</title>
  </head>
  <body>
    <p>careers@ascent-group.com</p>
    <section>
      <h2>Current Openings</h2>
      <article>
        <h3>Revenue Cycle Analyst</h3>
        <a href="https://www.ascenthealthcare.com/careers/revenue-cycle-analyst/">Apply now</a>
      </article>
    </section>
  </body>
</html>
`

const sitemapIndexXml = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.ascenthealthcare.com/post-sitemap.xml</loc></sitemap>
  <sitemap><loc>https://www.ascenthealthcare.com/page-sitemap.xml</loc></sitemap>
  <sitemap><loc>https://www.ascenthealthcare.com/news-sitemap.xml</loc></sitemap>
</sitemapindex>
`

const pageSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.ascenthealthcare.com/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/jobs/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/job-openings/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/careers/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/get-in-touch/</loc></url>
</urlset>
`

const driftedPageSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.ascenthealthcare.com/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/jobs/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/job-openings/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/careers/</loc></url>
  <url><loc>https://www.ascenthealthcare.com/careers/revenue-cycle-analyst/</loc></url>
</urlset>
`

const missingRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Page not found - Ascent Health</title>
  </head>
  <body>
    <h1>Page not found</h1>
  </body>
</html>
`

const loadAscentHealthModule = async () => {
  try {
    return await import('../ascenthealth/script.js')
  } catch {
    assert.fail('Expected Ascent Health scraper module at ../ascenthealth/script.js')
  }
}

test('Ascent Health constants stay pinned to the verified homepage, resume-intake careers page, and sitemap routes', async () => {
  const ascentHealth = await loadAscentHealthModule()

  assert.equal(ascentHealth.SOURCE, 'ascenthealth')
  assert.equal(ascentHealth.COMPANY, 'Ascent Health')
  assert.equal(ascentHealth.OFFICIAL_BRAND_NAME, 'Ascent Health')
  assert.equal(ascentHealth.VERIFIED_ON, '2026-07-15')
  assert.equal(ascentHealth.HOMEPAGE_URL, 'https://www.ascenthealthcare.com/')
  assert.equal(ascentHealth.CAREERS_PAGE_URL, 'https://www.ascenthealthcare.com/careers/')
  assert.equal(ascentHealth.SITEMAP_INDEX_URL, 'https://www.ascenthealthcare.com/sitemap_index.xml')
  assert.equal(ascentHealth.PAGE_SITEMAP_URL, 'https://www.ascenthealthcare.com/page-sitemap.xml')
  assert.deepEqual(ascentHealth.SITEMAP_CAREER_ROUTE_URLS, [
    'https://www.ascenthealthcare.com/jobs/',
    'https://www.ascenthealthcare.com/job-openings/',
    'https://www.ascenthealthcare.com/careers/',
  ])
  assert.deepEqual(ascentHealth.CAREER_ALIAS_ROUTE_URLS, [
    'https://www.ascenthealthcare.com/jobs/',
    'https://www.ascenthealthcare.com/job-openings/',
    'https://www.ascenthealthcare.com/careers/jobs/',
  ])
  assert.deepEqual(ascentHealth.NO_PUBLIC_JOB_ROUTE_URLS, [
    'https://www.ascenthealthcare.com/current-openings/',
    'https://www.ascenthealthcare.com/open-positions/',
    'https://www.ascenthealthcare.com/careers/openings/',
  ])
  assert.match(ascentHealth.VERIFIED_SURFACE_SUMMARY, /careers@ascent-group\.com/i)
  assert.equal(ascentHealth.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(ascentHealth.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(ascentHealth.hasExpectedSitemapIndex(sitemapIndexXml), true)
  assert.equal(ascentHealth.hasExpectedCareerRouteSet(pageSitemapXml), true)
  assert.equal(ascentHealth.hasExpectedCareerRouteSet(driftedPageSitemapXml), false)
  assert.deepEqual(ascentHealth.extractPublicJobLinks(careersHtml), [])
  assert.deepEqual(
    ascentHealth.extractPublicJobLinks('<a href="https://ascenthealthcare.com/careers/">Careers</a>'),
    [],
  )
  assert.deepEqual(ascentHealth.extractPublicJobLinks(publicJobsCareersHtml), [
    'https://www.ascenthealthcare.com/careers/revenue-cycle-analyst/',
  ])
  assert.equal(
    ascentHealth.isVerifiedCareerAliasPage({
      status: 200,
      url: ascentHealth.CAREERS_PAGE_URL,
      html: careersHtml,
    }),
    true,
  )
  assert.equal(
    ascentHealth.isVerifiedMissingPublicJobRoute({
      status: 404,
      url: ascentHealth.NO_PUBLIC_JOB_ROUTE_URLS[0],
      html: missingRouteHtml,
    }),
    true,
  )
})

test('Ascent Health sentinel returns [] only while the verified resume-intake surface remains unchanged', async () => {
  const ascentHealth = await loadAscentHealthModule()
  const requestedUrls = []

  const jobs = await ascentHealth.createAscentHealthScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === ascentHealth.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === ascentHealth.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === ascentHealth.SITEMAP_INDEX_URL) {
        return { status: 200, url, html: sitemapIndexXml }
      }

      if (url === ascentHealth.PAGE_SITEMAP_URL) {
        return { status: 200, url, html: pageSitemapXml }
      }

      if (ascentHealth.CAREER_ALIAS_ROUTE_URLS.includes(url)) {
        return { status: 200, url: ascentHealth.CAREERS_PAGE_URL, html: careersHtml }
      }

      if (ascentHealth.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ascentHealth.HOMEPAGE_URL,
    ascentHealth.CAREERS_PAGE_URL,
    ascentHealth.SITEMAP_INDEX_URL,
    ascentHealth.PAGE_SITEMAP_URL,
    ...ascentHealth.CAREER_ALIAS_ROUTE_URLS,
    ...ascentHealth.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Ascent Health sentinel fails closed when the homepage, careers page, sitemap, alias routes, or missing routes drift into public jobs', async () => {
  const ascentHealth = await loadAscentHealthModule()

  await assert.rejects(
    ascentHealth.createAscentHealthScraper().run({
      fetchPage: async (url) => {
        if (url === ascentHealth.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Ascent</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    ascentHealth.createAscentHealthScraper().run({
      fetchPage: async (url) => {
        if (url === ascentHealth.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === ascentHealth.CAREERS_PAGE_URL) {
          return { status: 200, url, html: publicJobsCareersHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /resume-intake careers surface/i,
  )

  await assert.rejects(
    ascentHealth.createAscentHealthScraper().run({
      fetchPage: async (url) => {
        if (url === ascentHealth.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === ascentHealth.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === ascentHealth.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === ascentHealth.PAGE_SITEMAP_URL) {
          return { status: 200, url, html: driftedPageSitemapXml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /page sitemap/i,
  )

  await assert.rejects(
    ascentHealth.createAscentHealthScraper().run({
      fetchPage: async (url) => {
        if (url === ascentHealth.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === ascentHealth.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === ascentHealth.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === ascentHealth.PAGE_SITEMAP_URL) {
          return { status: 200, url, html: pageSitemapXml }
        }

        if (url === ascentHealth.CAREER_ALIAS_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsCareersHtml }
        }

        if (ascentHealth.CAREER_ALIAS_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 200, url: ascentHealth.CAREERS_PAGE_URL, html: careersHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /career alias route changed materially or now exposes public jobs/i,
  )

  await assert.rejects(
    ascentHealth.createAscentHealthScraper().run({
      fetchPage: async (url) => {
        if (url === ascentHealth.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === ascentHealth.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === ascentHealth.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === ascentHealth.PAGE_SITEMAP_URL) {
          return { status: 200, url, html: pageSitemapXml }
        }

        if (ascentHealth.CAREER_ALIAS_ROUTE_URLS.includes(url)) {
          return { status: 200, url: ascentHealth.CAREERS_PAGE_URL, html: careersHtml }
        }

        if (url === ascentHealth.NO_PUBLIC_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsCareersHtml }
        }

        if (ascentHealth.NO_PUBLIC_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /adjacent job route changed materially or now exposes public jobs/i,
  )
})
