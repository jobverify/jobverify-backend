import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Electronic Manufacturing Services India | EMS Solutions</title>
    <link rel="canonical" href="https://www.avalontec.com/" />
  </head>
  <body>
    <nav>
      <a href="https://www.avalontec.com/">Home</a>
      <a href="https://www.avalontec.com/careers/">Careers</a>
    </nav>
    <section>
      <h2>Trusted By</h2>
      <h2>Vertical Industry Leaders</h2>
      <p>Electronic Manufacturing Services India.</p>
    </section>
  </body>
</html>
`

const careersPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers for experts passionate about building a better world | Avalon - Avalon Technologies Limited</title>
    <link rel="canonical" href="https://www.avalontec.com/careers/" />
  </head>
  <body>
    <h1>Careers</h1>
    <h2>Post your Resume</h2>
    <form>
      <label>Select Avalon Location</label>
      <select name="avalon-location">
        <option>Chennai</option>
        <option>Bangalore</option>
        <option>Atlanta</option>
        <option>Fremont</option>
      </select>
      <label>Select Experience</label>
      <select name="experience">
        <option>0-2 years</option>
        <option>3-5 years</option>
      </select>
      <p>Allowed file formats : pdf, doc, docx</p>
      <button type="submit">Submit</button>
    </form>
  </body>
</html>
`

const robotsTxt = `
User-agent: *
Disallow: /careers.php
Disallow: /job1
Disallow: /job2
Disallow: /job3
Disallow: /job4
Sitemap: https://www.avalontec.com/sitemap.xml
`

const sitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.avalontec.com/</loc></url>
  <url><loc>https://www.avalontec.com/about-us/</loc></url>
  <url><loc>https://www.avalontec.com/solutions/</loc></url>
  <url><loc>https://www.avalontec.com/careers/</loc></url>
</urlset>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Avalon Technologies Jobs</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Design Engineer"}
    </script>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="https://jobs.lever.co/avalon/apply">Apply now</a>
  </body>
</html>
`

const loadAvalonTechnologiesModule = async () => {
  try {
    return await import('../../scraper/avalontechnologies/script.js')
  } catch {
    assert.fail('Expected Avalon Technologies scraper module at ../../scraper/avalontechnologies/script.js')
  }
}

test('Avalon Technologies scraper constants stay pinned to the verified careers form, crawl surfaces, and broken adjacent job routes', async () => {
  const avalon = await loadAvalonTechnologiesModule()

  assert.equal(avalon.SOURCE, 'avalontechnologies')
  assert.equal(avalon.COMPANY, 'Avalon Technologies')
  assert.equal(avalon.HOMEPAGE_URL, 'https://www.avalontec.com/')
  assert.equal(avalon.CAREERS_URL, 'https://www.avalontec.com/careers/')
  assert.equal(avalon.CAREER_ALIAS_URL, 'https://www.avalontec.com/career/')
  assert.equal(avalon.ROBOTS_TXT_URL, 'https://www.avalontec.com/robots.txt')
  assert.equal(avalon.SITEMAP_URL, 'https://www.avalontec.com/sitemap.xml')
  assert.deepEqual(avalon.BROKEN_JOB_ROUTE_URLS, [
    'https://www.avalontec.com/jobs/',
    'https://www.avalontec.com/openings/',
    'https://www.avalontec.com/current-openings/',
    'https://www.avalontec.com/job1/',
    'https://www.avalontec.com/job2/',
  ])
  assert.equal(avalon.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(avalon.hasResumeOnlyCareersSignal(careersPageHtml), true)
  assert.equal(avalon.hasPublicJobListingSignal(careersPageHtml), false)
  assert.equal(avalon.hasPublicJobListingSignal(publicJobsHtml), true)
  assert.equal(avalon.hasExpectedRobotsTxtSignal(robotsTxt), true)
  assert.equal(avalon.hasExpectedSitemapSignal(sitemapXml), true)
  assert.deepEqual(avalon.extractSitemapUrls(sitemapXml), [
    'https://www.avalontec.com/',
    'https://www.avalontec.com/about-us/',
    'https://www.avalontec.com/solutions/',
    'https://www.avalontec.com/careers/',
  ])
  assert.equal(
    avalon.isKnownCareerAliasRedirect({
      status: 301,
      location: 'https://www.avalontec.com/careers/',
      html: '',
    }),
    true,
  )
  assert.equal(
    avalon.isKnownBrokenJobRoute(
      {
        status: 302,
        location: 'https://www.www.avalontec.com/jobs/',
        html: '',
      },
      'https://www.avalontec.com/jobs/',
    ),
    true,
  )
})

test('Avalon Technologies returns no jobs only while the verified first-party site stays a resume-upload flow without public listings', async () => {
  const avalon = await loadAvalonTechnologiesModule()
  const requestedUrls = []

  const jobs = await avalon.createAvalonTechnologiesScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === avalon.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === avalon.CAREERS_URL) {
        return { status: 200, url, html: careersPageHtml }
      }

      if (url === avalon.ROBOTS_TXT_URL) {
        return { status: 200, url, html: robotsTxt }
      }

      if (url === avalon.SITEMAP_URL) {
        return { status: 200, url, html: sitemapXml }
      }

      if (url === avalon.CAREER_ALIAS_URL) {
        return {
          status: 301,
          url,
          location: avalon.CAREERS_URL,
          html: '',
        }
      }

      if (avalon.BROKEN_JOB_ROUTE_URLS.includes(url)) {
        return {
          status: 302,
          url,
          location: `https://www.www.avalontec.com${new URL(url).pathname}`,
          html: '',
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    avalon.HOMEPAGE_URL,
    avalon.CAREERS_URL,
    avalon.ROBOTS_TXT_URL,
    avalon.SITEMAP_URL,
    avalon.CAREER_ALIAS_URL,
    ...avalon.BROKEN_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Avalon Technologies fails closed when the careers page, crawl surfaces, alias route, or broken job routes drift into a public jobs surface', async () => {
  const avalon = await loadAvalonTechnologiesModule()

  await assert.rejects(
    avalon.createAvalonTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === avalon.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    avalon.createAvalonTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === avalon.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avalon.CAREERS_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers page now appears to expose a public jobs board/i,
  )

  await assert.rejects(
    avalon.createAvalonTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === avalon.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avalon.CAREERS_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === avalon.ROBOTS_TXT_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === avalon.SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: `${sitemapXml}<url><loc>https://www.avalontec.com/jobs/</loc></url>`,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified sitemap/i,
  )

  await assert.rejects(
    avalon.createAvalonTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === avalon.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avalon.CAREERS_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === avalon.ROBOTS_TXT_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === avalon.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        if (url === avalon.CAREER_ALIAS_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified career alias route/i,
  )

  await assert.rejects(
    avalon.createAvalonTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === avalon.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avalon.CAREERS_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === avalon.ROBOTS_TXT_URL) {
          return { status: 200, url, html: robotsTxt }
        }

        if (url === avalon.SITEMAP_URL) {
          return { status: 200, url, html: sitemapXml }
        }

        if (url === avalon.CAREER_ALIAS_URL) {
          return {
            status: 301,
            url,
            location: avalon.CAREERS_URL,
            html: '',
          }
        }

        if (url === avalon.BROKEN_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body>Open roles</body></html>' }
        }

        if (avalon.BROKEN_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return {
            status: 302,
            url,
            location: `https://www.www.avalontec.com${new URL(url).pathname}`,
            html: '',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified no-public-job route changed/i,
  )
})
