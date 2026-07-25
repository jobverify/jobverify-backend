import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>ANAND Group: Automotive Components Manufacturer India | Best Automobile Company</title>
    <meta
      name="description"
      content="ANAND is a global leader in the manufacturing of world-class products for the automotive industry."
    >
    <link rel="canonical" href="https://www.anandgroupindia.com/">
  </head>
  <body>
    <nav>
      <a title="Careers at ANAND" href=https://www.anandgroupindia.com/careers-at-anand/>Careers at ANAND</a>
      <a href="https://www.anandgroupindia.com/careers-at-anand/culture-at-anand/">Culture at ANAND</a>
      <a href="https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/">Shop floor Excellence</a>
      <a href="https://www.anandgroupindia.com/careers-at-anand/people-development/">People Development</a>
      <a title="Join Us" href=https://www.anandgroupindia.com/careers-at-anand/join-usnew/>Join Us</a>
    </nav>
  </body>
</html>
`

const careersLandingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career at ANAND - ANAND Group</title>
    <link rel=canonical href=https://www.anandgroupindia.com/careers-at-anand/ >
  </head>
  <body>
    <h1>Career at ANAND</h1>
    <h2>Work With Us</h2>
    <p>Human mind is our fundamental resource</p>
    <a href="https://www.anandgroupindia.com/careers-at-anand/culture-at-anand/">Culture at ANAND</a>
    <a href="https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/">Shop floor Excellence</a>
    <a href="https://www.anandgroupindia.com/careers-at-anand/people-development/">People Development</a>
    <a href=https://www.anandgroupindia.com/careers-at-anand/join-usnew/>Join Us</a>
    <div id="myModal" class="modal fade">
      <div class="modal-content">
        <h5 class="modal-title">Fraudulent Employment Opportunity Disclaimer</h5>
        <p>ANAND Group has a robust recruitment process where the employment criterion is based purely on merit.</p>
        <p>This is to notify to the general public that ANAND Group does not charge or accept any fees from jobseekers at any stage of recruitment.</p>
        <p>ANAND Group will never request sensitive information such as your bank account information.</p>
      </div>
    </div>
  </body>
</html>
`

const joinUsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join Us - ANAND Group</title>
    <meta
      name="description"
      content="Discover the many exciting job openings at ANAND. Exciting new experience appear every day and we love our people’s growth."
    >
    <link rel="canonical" href="https://www.anandgroupindia.com/careers-at-anand/join-usnew/">
  </head>
  <body>
    <section class="joinanand-hero">
      <h1>Join Us At ANAND</h1>
      <a href="#" class="joinanand-btn">
        <span class="joinanand-btn-text">CLICK TO JOIN</span>
      </a>
    </section>
    <nav class="hero-tabs">
      <a class="hero-tabs__item" href="https://www.anandgroupindia.com/careers-at-anand/culture-at-anand/">Culture At ANAND</a>
      <a class="hero-tabs__item" href="https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/">Shop Floor Excellence</a>
      <a class="hero-tabs__item" href="https://www.anandgroupindia.com/careers-at-anand/people-development/">People Development</a>
      <a class="hero-tabs__item" href="https://www.anandgroupindia.com/careers-at-anand/join-usnew/">Join Us</a>
    </nav>
    <h2>JOIN US</h2>
    <p>ANAND is where more than 20,000+ people come together to create world-class, innovative products and components for the automotive industry.</p>
    <h2>WORK WITH US</h2>
    <p>ANAND’s people-focused policies make it a thriving and inclusive workplace.</p>
    <h2>LIFE AT ANAND</h2>
    <p>People Development</p>
    <div class="modal fade" id="myModal">
      <div class="modal-dialog">
        <div class="modal-content corpModal">
          <div class="modal-header"><h4 class="modal-title">Send to a friend</h4></div>
          <div class="modal-body">
            <form action="/careers-at-anand/join-usnew/#wpcf7-f7992-o2">
              <input name="your-name" type="text">
              <input name="your-email" type="email">
              <input name="friend-email" type="email">
              <textarea name="comment"></textarea>
            </form>
          </div>
        </div>
      </div>
    </div>
    <div class="footerNews">
      <form action="/careers-at-anand/join-usnew/#wpcf7-f518-o1">
        <input name="your-email" type="email">
      </form>
    </div>
  </body>
</html>
`

const shopfloorHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Shop floor Excellence - ANAND Group</title>
    <link rel="canonical" href="https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/">
  </head>
  <body>
    <a href="https://www.anandgroupindia.com/careers-at-anand/join-usnew/">Join Us</a>
    <a href="https://www.anandgroupindia.com/careers-at-anand/people-development/">People Development</a>
    <p>Shop floor Excellence</p>
  </body>
</html>
`

const robotsTxt = `
# START YOAST BLOCK
User-agent: *
Allow:

Sitemap: https://www.anandgroupindia.com/sitemap_index.xml
# END YOAST BLOCK
`

const pageSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.anandgroupindia.com/careers-at-anand/</loc>
  </url>
  <url>
    <loc>https://www.anandgroupindia.com/careers-at-anand/people-development/</loc>
  </url>
  <url>
    <loc>https://www.anandgroupindia.com/careers-at-anand/culture-at-anand/</loc>
  </url>
  <url>
    <loc>https://www.anandgroupindia.com/careers-at-anand/join-usnew/</loc>
  </url>
  <url>
    <loc>https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/</loc>
  </url>
  <url>
    <loc>https://www.anandgroupindia.com/who-we-are/</loc>
  </url>
</urlset>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join Us - ANAND Group</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Plant Manager"}
    </script>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="https://jobs.example.com/anandgroupindia/plant-manager">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../anandgroupindia/script.js')
  } catch {
    assert.fail('Expected Anand Group India scraper module at ../anandgroupindia/script.js')
  }
}

test('Anand Group India scraper constants stay pinned to the verified first-party careers subsection and no-public-jobs signals', async () => {
  const anandGroupIndia = await loadModule()

  assert.equal(anandGroupIndia.SOURCE, 'anandgroupindia')
  assert.equal(anandGroupIndia.COMPANY, 'Anand Group India')
  assert.equal(anandGroupIndia.HOMEPAGE_URL, 'https://www.anandgroupindia.com/')
  assert.equal(anandGroupIndia.CAREERS_PAGE_URL, 'https://www.anandgroupindia.com/careers-at-anand/')
  assert.equal(anandGroupIndia.JOIN_US_PAGE_URL, 'https://www.anandgroupindia.com/careers-at-anand/join-usnew/')
  assert.equal(
    anandGroupIndia.SHOPFLOOR_PAGE_URL,
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  )
  assert.equal(anandGroupIndia.ROBOTS_TXT_URL, 'https://www.anandgroupindia.com/robots.txt')
  assert.equal(
    anandGroupIndia.SITEMAP_INDEX_URL,
    'https://www.anandgroupindia.com/sitemap_index.xml',
  )
  assert.equal(
    anandGroupIndia.PAGE_SITEMAP_URL,
    'https://www.anandgroupindia.com/page-sitemap.xml',
  )
  assert.deepEqual(anandGroupIndia.EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP, [
    'https://www.anandgroupindia.com/careers-at-anand/',
    'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  ])
  assert.deepEqual(anandGroupIndia.MISSING_JOB_ROUTE_URLS, [
    'https://www.anandgroupindia.com/careers',
    'https://www.anandgroupindia.com/careers/',
    'https://www.anandgroupindia.com/career',
    'https://www.anandgroupindia.com/jobs',
    'https://www.anandgroupindia.com/join-us',
    'https://www.anandgroupindia.com/openings',
    'https://www.anandgroupindia.com/current-openings',
    'https://www.anandgroupindia.com/work-with-us',
  ])

  assert.equal(anandGroupIndia.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(
    anandGroupIndia.extractHomepageCareerUrl(homepageHtml),
    'https://www.anandgroupindia.com/careers-at-anand/',
  )
  assert.equal(anandGroupIndia.hasOfficialCareersLandingSignal(careersLandingHtml), true)
  assert.equal(
    anandGroupIndia.extractJoinUsPageUrl(careersLandingHtml),
    'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
  )
  assert.equal(anandGroupIndia.hasOfficialJoinUsSignal(joinUsHtml), true)
  assert.equal(anandGroupIndia.extractClickToJoinHref(joinUsHtml), '#')
  assert.equal(anandGroupIndia.hasOfficialShopfloorSignal(shopfloorHtml), true)
  assert.equal(anandGroupIndia.hasPublicJobListingSignal(joinUsHtml), false)
  assert.equal(anandGroupIndia.hasPublicJobListingSignal(publicJobsHtml), true)
  assert.equal(anandGroupIndia.hasExpectedRobotsSignal(robotsTxt), true)
  assert.deepEqual(
    anandGroupIndia.extractExpectedCareerUrlsFromPageSitemap(pageSitemapXml),
    anandGroupIndia.EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP,
  )
  assert.equal(
    anandGroupIndia.isKnownMissingJobRoute(
      {
        status: 404,
        url: 'https://www.anandgroupindia.com/jobs',
        html: '<html><head><title>Page not found - ANAND Group</title></head><body>The page you are looking for does not exist.</body></html>',
      },
      'https://www.anandgroupindia.com/jobs',
    ),
    true,
  )
})

test('Anand Group India returns no jobs while the verified first-party careers subsection remains informational and common job routes stay missing', async () => {
  const anandGroupIndia = await loadModule()
  const requestedUrls = []

  const jobs = await anandGroupIndia.createAnandGroupIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === anandGroupIndia.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === anandGroupIndia.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersLandingHtml }
      }

      if (url === anandGroupIndia.JOIN_US_PAGE_URL) {
        return { status: 200, url, html: joinUsHtml }
      }

      if (url === anandGroupIndia.SHOPFLOOR_PAGE_URL) {
        return { status: 200, url, html: shopfloorHtml }
      }

      if (url === anandGroupIndia.ROBOTS_TXT_URL) {
        return { status: 200, url, html: robotsTxt }
      }

      if (url === anandGroupIndia.SITEMAP_INDEX_URL) {
        return {
          status: 200,
          url,
          html: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${anandGroupIndia.PAGE_SITEMAP_URL}</loc></sitemap></sitemapindex>`,
        }
      }

      if (url === anandGroupIndia.PAGE_SITEMAP_URL) {
        return { status: 200, url, html: pageSitemapXml }
      }

      if (anandGroupIndia.MISSING_JOB_ROUTE_URLS.includes(url)) {
        return {
          status: 404,
          url,
          html: '<html><head><title>Page not found - ANAND Group</title></head><body>The page you are looking for does not exist.</body></html>',
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    anandGroupIndia.HOMEPAGE_URL,
    anandGroupIndia.CAREERS_PAGE_URL,
    anandGroupIndia.JOIN_US_PAGE_URL,
    anandGroupIndia.SHOPFLOOR_PAGE_URL,
    anandGroupIndia.ROBOTS_TXT_URL,
    anandGroupIndia.SITEMAP_INDEX_URL,
    anandGroupIndia.PAGE_SITEMAP_URL,
    ...anandGroupIndia.MISSING_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Anand Group India fails closed when the homepage handoff, careers copy, sitemap-backed careers URLs, or missing routes drift', async () => {
  const anandGroupIndia = await loadModule()

  await assert.rejects(
    anandGroupIndia.createAnandGroupIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroupIndia.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml.replace(
              'https://www.anandgroupindia.com/careers-at-anand/',
              'https://www.anandgroupindia.com/careers',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified homepage careers handoff/i,
  )

  await assert.rejects(
    anandGroupIndia.createAnandGroupIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroupIndia.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroupIndia.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: careersLandingHtml.replace('Career at ANAND - ANAND Group', 'Unexpected'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified careers landing page/i,
  )

  await assert.rejects(
    anandGroupIndia.createAnandGroupIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroupIndia.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroupIndia.CAREERS_PAGE_URL) return { status: 200, url, html: careersLandingHtml }
        if (url === anandGroupIndia.JOIN_US_PAGE_URL) return { status: 200, url, html: publicJobsHtml }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /join us page now appears to expose a public jobs board/i,
  )

  await assert.rejects(
    anandGroupIndia.createAnandGroupIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroupIndia.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroupIndia.CAREERS_PAGE_URL) return { status: 200, url, html: careersLandingHtml }
        if (url === anandGroupIndia.JOIN_US_PAGE_URL) return { status: 200, url, html: joinUsHtml }
        if (url === anandGroupIndia.SHOPFLOOR_PAGE_URL) return { status: 200, url, html: shopfloorHtml }
        if (url === anandGroupIndia.ROBOTS_TXT_URL) return { status: 200, url, html: robotsTxt }
        if (url === anandGroupIndia.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${anandGroupIndia.PAGE_SITEMAP_URL}</loc></sitemap></sitemapindex>`,
          }
        }
        if (url === anandGroupIndia.PAGE_SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: pageSitemapXml.replace(
              '<loc>https://www.anandgroupindia.com/careers-at-anand/join-usnew/</loc>',
              '',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified page sitemap careers urls/i,
  )

  await assert.rejects(
    anandGroupIndia.createAnandGroupIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroupIndia.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroupIndia.CAREERS_PAGE_URL) return { status: 200, url, html: careersLandingHtml }
        if (url === anandGroupIndia.JOIN_US_PAGE_URL) return { status: 200, url, html: joinUsHtml }
        if (url === anandGroupIndia.SHOPFLOOR_PAGE_URL) return { status: 200, url, html: shopfloorHtml }
        if (url === anandGroupIndia.ROBOTS_TXT_URL) return { status: 200, url, html: robotsTxt }
        if (url === anandGroupIndia.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${anandGroupIndia.PAGE_SITEMAP_URL}</loc></sitemap></sitemapindex>`,
          }
        }
        if (url === anandGroupIndia.PAGE_SITEMAP_URL) return { status: 200, url, html: pageSitemapXml }
        if (url === anandGroupIndia.MISSING_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body>Open roles</body></html>' }
        }
        if (anandGroupIndia.MISSING_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return {
            status: 404,
            url,
            html: '<html><head><title>Page not found - ANAND Group</title></head><body>The page you are looking for does not exist.</body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified missing common job route changed/i,
  )
})
