import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>ANAND Group: Automotive Components Manufacturer India | Best Automobile Company</title>
    <meta
      name="description"
      content="ANAND is a global leader in the manufacturing of world-class products for the automotive industry. The Group also offers experiential luxury through the hospitality vertical, SUJÁN."
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
    <meta
      name="description"
      content="ANAND Group believes that 'Business is 90% people'. We believes that it is through knowledge, education and practical training that ANAND Group is the market front-runner in many of the product solutions across the world."
    >
    <link rel=canonical href=https://www.anandgroupindia.com/careers-at-anand/ >
  </head>
  <body>
    <h1>Career at ANAND</h1>
    <h2>Work With Us</h2>
    <a href="https://www.anandgroupindia.com/careers-at-anand/culture-at-anand/">Culture at ANAND</a>
    <a href=https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/>Shop floor Excellence</a>
    <a href="https://www.anandgroupindia.com/careers-at-anand/people-development/">People Development</a>
    <a href=https://www.anandgroupindia.com/careers-at-anand/join-usnew/>Join Us</a>
    <p>Empowering Women at ANAND</p>
    <p>Culture at ANAND</p>
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
    <link rel=canonical href=https://www.anandgroupindia.com/careers-at-anand/join-usnew/ >
  </head>
  <body>
    <h1>Join Us At ANAND</h1>
    <button>CLICK TO JOIN</button>
    <h2>JOIN US</h2>
    <p>ANAND is where more than 20,000+ people come together to create world-class, innovative products and components for the automotive industry.</p>
    <h2>WORK WITH US</h2>
    <p>ANAND’s people-focused policies make it a thriving and inclusive workplace.</p>
    <h2>LIFE AT ANAND</h2>
    <p>People Development</p>
    <a href="https://www.linkedin.com/posts/anandgroupindia_anand-anandgroupindia-anandtalent-activity-7094225821380321282--_Fc/?utm_source=share&utm_medium=member_desktop">Watch video</a>
    <a href="https://www.linkedin.com/posts/anandgroupindia_anandforequity-anand-anandgroupindia-activity-7047115574170009602-rAD8/?utm_source=share&utm_medium=member_desktop">Watch video</a>
    <div class="anandvoices-grid">
      <div class="anandvoices-card">
        <h3>SAMAR GUPTA</h3>
        <p>GROUP IT HEAD, AIPL</p>
      </div>
      <div class="anandvoices-card">
        <h3>ARCHANA SHARMA</h3>
        <p>MANAGER – PRODUCTION MATS</p>
      </div>
      <div class="anandvoices-card">
        <h3>PRIYANKA TAYE</h3>
        <p>OET IN PRODUCTION, ANCHEMCO</p>
      </div>
      <div class="anandvoices-card">
        <h3>YOGESH GADHAVE</h3>
        <p>MANAGER, PUNE & SATARA OPERATIONS, SNSF</p>
      </div>
    </div>
    <form action="/careers-at-anand/join-usnew/#wpcf7-f518-o1">
      <input name="your-email" type="email">
    </form>
    <form action="/careers-at-anand/join-usnew/#wpcf7-f7992-o2">
      <input name="your-name" type="text">
      <input name="your-email" type="email">
      <input name="friend-email" type="email">
      <textarea name="comment"></textarea>
    </form>
  </body>
</html>
`

const shopfloorHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Shop floor Excellence - ANAND Group</title>
    <meta name="description" content="The shopfloor excellence">
    <link rel=canonical href=https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/ >
  </head>
  <body>
    <a href=https://www.anandgroupindia.com/careers-at-anand/join-usnew/>Join Us</a>
    <a href="https://www.anandgroupindia.com/careers-at-anand/people-development/">People Development</a>
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
    <a href="https://jobs.example.com/anandgroup/plant-manager">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../anandgroup/script.js')
  } catch {
    assert.fail('Expected Anand Group scraper module at ../anandgroup/script.js')
  }
}

test('Anand Group scraper constants stay pinned to the verified first-party careers subsection and no-public-jobs signals', async () => {
  const anandGroup = await loadModule()

  assert.equal(anandGroup.SOURCE, 'anandgroup')
  assert.equal(anandGroup.COMPANY, 'Anand Group')
  assert.equal(anandGroup.HOMEPAGE_URL, 'https://www.anandgroupindia.com/')
  assert.equal(anandGroup.CAREERS_PAGE_URL, 'https://www.anandgroupindia.com/careers-at-anand/')
  assert.equal(anandGroup.JOIN_US_PAGE_URL, 'https://www.anandgroupindia.com/careers-at-anand/join-usnew/')
  assert.equal(
    anandGroup.SHOPFLOOR_PAGE_URL,
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  )
  assert.equal(anandGroup.ROBOTS_TXT_URL, 'https://www.anandgroupindia.com/robots.txt')
  assert.equal(
    anandGroup.SITEMAP_INDEX_URL,
    'https://www.anandgroupindia.com/sitemap_index.xml',
  )
  assert.equal(
    anandGroup.PAGE_SITEMAP_URL,
    'https://www.anandgroupindia.com/page-sitemap.xml',
  )
  assert.deepEqual(anandGroup.EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP, [
    'https://www.anandgroupindia.com/careers-at-anand/',
    'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  ])
  assert.deepEqual(anandGroup.MISSING_JOB_ROUTE_URLS, [
    'https://www.anandgroupindia.com/careers',
    'https://www.anandgroupindia.com/careers/',
    'https://www.anandgroupindia.com/career',
    'https://www.anandgroupindia.com/jobs',
    'https://www.anandgroupindia.com/join-us',
    'https://www.anandgroupindia.com/openings',
    'https://www.anandgroupindia.com/current-openings',
    'https://www.anandgroupindia.com/work-with-us',
  ])

  assert.equal(anandGroup.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(anandGroup.hasOfficialCareersLandingSignal(careersLandingHtml), true)
  assert.equal(anandGroup.hasOfficialJoinUsSignal(joinUsHtml), true)
  assert.equal(anandGroup.hasOfficialShopfloorSignal(shopfloorHtml), true)
  assert.equal(anandGroup.hasPublicJobListingSignal(joinUsHtml), false)
  assert.equal(anandGroup.hasPublicJobListingSignal(publicJobsHtml), true)
  assert.equal(anandGroup.hasExpectedRobotsSignal(robotsTxt), true)
  assert.deepEqual(
    anandGroup.extractExpectedCareerUrlsFromPageSitemap(pageSitemapXml),
    anandGroup.EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP,
  )
  assert.equal(
    anandGroup.isKnownMissingJobRoute(
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

test('Anand Group returns no jobs while the verified first-party careers subsection remains informational and common job routes stay missing', async () => {
  const anandGroup = await loadModule()
  const requestedUrls = []

  const jobs = await anandGroup.createAnandGroupScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === anandGroup.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === anandGroup.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersLandingHtml }
      }

      if (url === anandGroup.JOIN_US_PAGE_URL) {
        return { status: 200, url, html: joinUsHtml }
      }

      if (url === anandGroup.SHOPFLOOR_PAGE_URL) {
        return { status: 200, url, html: shopfloorHtml }
      }

      if (url === anandGroup.ROBOTS_TXT_URL) {
        return { status: 200, url, html: robotsTxt }
      }

      if (url === anandGroup.SITEMAP_INDEX_URL) {
        return {
          status: 200,
          url,
          html: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${anandGroup.PAGE_SITEMAP_URL}</loc></sitemap></sitemapindex>`,
        }
      }

      if (url === anandGroup.PAGE_SITEMAP_URL) {
        return { status: 200, url, html: pageSitemapXml }
      }

      if (anandGroup.MISSING_JOB_ROUTE_URLS.includes(url)) {
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
    anandGroup.HOMEPAGE_URL,
    anandGroup.CAREERS_PAGE_URL,
    anandGroup.JOIN_US_PAGE_URL,
    anandGroup.SHOPFLOOR_PAGE_URL,
    anandGroup.ROBOTS_TXT_URL,
    anandGroup.SITEMAP_INDEX_URL,
    anandGroup.PAGE_SITEMAP_URL,
    ...anandGroup.MISSING_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Anand Group fails closed when the homepage handoff, careers copy, sitemap-backed careers URLs, or missing routes drift', async () => {
  const anandGroup = await loadModule()

  await assert.rejects(
    anandGroup.createAnandGroupScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroup.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml.replace('https://www.anandgroupindia.com/careers-at-anand/', 'https://www.anandgroupindia.com/careers'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified homepage careers handoff/i,
  )

  await assert.rejects(
    anandGroup.createAnandGroupScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroup.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroup.CAREERS_PAGE_URL) {
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
    anandGroup.createAnandGroupScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroup.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroup.CAREERS_PAGE_URL) return { status: 200, url, html: careersLandingHtml }
        if (url === anandGroup.JOIN_US_PAGE_URL) return { status: 200, url, html: publicJobsHtml }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /join us page now appears to expose a public jobs board/i,
  )

  await assert.rejects(
    anandGroup.createAnandGroupScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroup.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroup.CAREERS_PAGE_URL) return { status: 200, url, html: careersLandingHtml }
        if (url === anandGroup.JOIN_US_PAGE_URL) return { status: 200, url, html: joinUsHtml }
        if (url === anandGroup.SHOPFLOOR_PAGE_URL) return { status: 200, url, html: shopfloorHtml }
        if (url === anandGroup.ROBOTS_TXT_URL) return { status: 200, url, html: robotsTxt }
        if (url === anandGroup.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${anandGroup.PAGE_SITEMAP_URL}</loc></sitemap></sitemapindex>`,
          }
        }
        if (url === anandGroup.PAGE_SITEMAP_URL) {
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
    anandGroup.createAnandGroupScraper().run({
      fetchPage: async (url) => {
        if (url === anandGroup.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === anandGroup.CAREERS_PAGE_URL) return { status: 200, url, html: careersLandingHtml }
        if (url === anandGroup.JOIN_US_PAGE_URL) return { status: 200, url, html: joinUsHtml }
        if (url === anandGroup.SHOPFLOOR_PAGE_URL) return { status: 200, url, html: shopfloorHtml }
        if (url === anandGroup.ROBOTS_TXT_URL) return { status: 200, url, html: robotsTxt }
        if (url === anandGroup.SITEMAP_INDEX_URL) {
          return {
            status: 200,
            url,
            html: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${anandGroup.PAGE_SITEMAP_URL}</loc></sitemap></sitemapindex>`,
          }
        }
        if (url === anandGroup.PAGE_SITEMAP_URL) return { status: 200, url, html: pageSitemapXml }
        if (url === anandGroup.MISSING_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body>Open roles</body></html>' }
        }
        if (anandGroup.MISSING_JOB_ROUTE_URLS.slice(1).includes(url)) {
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
