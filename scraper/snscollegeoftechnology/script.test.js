import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected SNS College of Technology scraper module at ./script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SNS College of Technology | Autonomous | NAAC A++ | AI Engineering | Coimbatore | TNEA 2726</title>
    <meta
      name="description"
      content="SNS College of Technology, Coimbatore - Autonomous, NAAC A++, NBA. B.Tech in AI, Data Science, Generative AI. Highest package 53 LPA. TNEA Code 2726. Admissions open 2026."
    />
  </head>
  <body>
    <header>
      <a href="https://snsct.org/">Home</a>
      <a href="/programs">Programs</a>
      <a href="/campus-life">Campus Life</a>
    </header>
    <main>
      <h1>SNS College of Technology</h1>
      <p>Autonomous | NAAC A++ | NBA Accreditation</p>
      <p>TNEA Code: 2726</p>
      <p>Admissions open 2026.</p>
      <p>Highest package 53 LPA.</p>
    </main>
    <footer>
      <span>snsct@snsgroups.com</span>
      <span>Career : job@snsgroups.com</span>
    </footer>
  </body>
</html>
`

const noPublicCareersRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SNS College of Technology | Autonomous | NAAC A++ | AI Engineering | Coimbatore | TNEA 2726</title>
    <meta
      name="description"
      content="SNS College of Technology, Coimbatore - Autonomous, NAAC A++, NBA. B.Tech in AI, Data Science, Generative AI. Highest package 53 LPA. TNEA Code 2726. Admissions open 2026."
    />
  </head>
  <body>
    <main>
      <h1>SNS College of Technology</h1>
      <p>TNEA Code: 2726</p>
      <p>Highest package 53 LPA.</p>
    </main>
    <footer>
      <span>snsct@snsgroups.com</span>
      <span>Career : job@snsgroups.com</span>
    </footer>
  </body>
</html>
`

const robotsTxt = `
# ==============================================================================
# robots.txt - SNS College of Technology
# Domain : https://snsct.org
# Generated : May 30, 2026
# ==============================================================================
User-agent: *
Allow: /
Sitemap: https://snsct.org/sitemap.xml
`

const sitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://snsct.org/</loc></url>
  <url><loc>https://snsct.org/programs</loc></url>
  <url><loc>https://snsct.org/campus-life</loc></url>
</urlset>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SNS College of Technology Careers</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <p>Join our team for faculty and staff roles.</p>
      <a href="https://snsct.org/faculty-recruitment/apply">Apply here</a>
    </main>
  </body>
</html>
`

test('SNS College of Technology sentinel pins the verified homepage, career contact, sitemap, robots, and checked routes', async () => {
  const snsct = await loadModule()

  assert.equal(snsct.SOURCE, 'snscollegeoftechnology')
  assert.equal(snsct.COMPANY, 'SNS College of Technology')
  assert.equal(snsct.HOMEPAGE_URL, 'https://snsct.org/')
  assert.equal(snsct.ROBOTS_URL, 'https://snsct.org/robots.txt')
  assert.equal(snsct.SITEMAP_URL, 'https://snsct.org/sitemap.xml')
  assert.deepEqual(snsct.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://snsct.org/careers',
    'https://snsct.org/careers/',
    'https://snsct.org/career',
    'https://snsct.org/career/',
    'https://snsct.org/jobs',
    'https://snsct.org/jobs/',
    'https://snsct.org/job-openings',
    'https://snsct.org/job-openings/',
    'https://snsct.org/recruitment',
    'https://snsct.org/recruitment/',
    'https://snsct.org/faculty-recruitment',
    'https://snsct.org/faculty-recruitment/',
  ])
  assert.equal(snsct.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(snsct.hasCareerContactSignal(homepageHtml), true)
  assert.equal(snsct.hasPublicJobBoardSignal(homepageHtml), false)
  assert.equal(snsct.hasPublicJobBoardSignal(publicJobsHtml), true)
  assert.equal(snsct.robotsMentionCareerLikeRoute(robotsTxt), false)
  assert.equal(snsct.sitemapHasCareerLikeUrl(sitemapXml), false)
  assert.equal(
    snsct.isVerifiedNoPublicCareersRoute({
      status: 404,
      url: snsct.NO_PUBLIC_CAREERS_ROUTE_URLS[0],
      html: noPublicCareersRouteHtml,
    }),
    true,
  )
})

test('SNS College of Technology sentinel returns no jobs only while the verified first-party surface stays careers-free', async () => {
  const snsct = await loadModule()
  const requestedUrls = []

  const jobs = await snsct.createSnsCollegeOfTechnologyScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === snsct.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === snsct.ROBOTS_URL) {
        return { status: 200, url, html: robotsTxt }
      }

      if (url === snsct.SITEMAP_URL) {
        return { status: 200, url, html: sitemapXml }
      }

      if (snsct.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: noPublicCareersRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    snsct.HOMEPAGE_URL,
    snsct.ROBOTS_URL,
    snsct.SITEMAP_URL,
    ...snsct.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('SNS College of Technology sentinel fails closed when the homepage, robots, sitemap, or checked routes drift', async () => {
  const snsct = await loadModule()

  await assert.rejects(
    snsct.createSnsCollegeOfTechnologyScraper().run({
      fetchPage: async (url) => {
        if (url === snsct.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }

        if (url === snsct.ROBOTS_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === snsct.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        return { status: 404, url, html: noPublicCareersRouteHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    snsct.createSnsCollegeOfTechnologyScraper().run({
      fetchPage: async (url) => {
        if (url === snsct.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === snsct.ROBOTS_URL) {
          return { status: 200, url, html: `${robotsTxt}\nDisallow: /careers/` }
        }

        if (url === snsct.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        return { status: 404, url, html: noPublicCareersRouteHtml }
      },
    }),
    /verified robots\.txt/i,
  )

  await assert.rejects(
    snsct.createSnsCollegeOfTechnologyScraper().run({
      fetchPage: async (url) => {
        if (url === snsct.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === snsct.ROBOTS_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === snsct.SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: sitemapXml.replace('</urlset>', '<url><loc>https://snsct.org/careers/</loc></url></urlset>'),
          }
        }

        return { status: 404, url, html: noPublicCareersRouteHtml }
      },
    }),
    /verified sitemap/i,
  )

  await assert.rejects(
    snsct.createSnsCollegeOfTechnologyScraper().run({
      fetchPage: async (url) => {
        if (url === snsct.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === snsct.ROBOTS_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === snsct.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        if (url === snsct.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        return { status: 404, url, html: noPublicCareersRouteHtml }
      },
    }),
    /verified no-public-careers route/i,
  )
})
