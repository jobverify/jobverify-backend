import assert from 'node:assert/strict'
import test from 'node:test'

const loadTechcoveryModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Techcovery Solutions scraper module at ./script.js')
  }
}

const homepageHtml = `
  <html>
    <head>
      <title>Techcovery</title>
      <link rel="canonical" href="https://techcovery.in/" />
    </head>
    <body>
      <nav>
        <a href="https://techcovery.in/about-us/">WHY TECHCOVERY?</a>
        <a href="https://techcovery.in/blogs/">BLOGS</a>
        <a href="https://techcovery.in/courses-1/">COURSES</a>
        <a href="https://techcovery.in/events/">EVENTS</a>
        <a href="https://techcovery.in/contact/">CONTACT US</a>
      </nav>
    </body>
  </html>
`

const aboutHtml = `
  <html>
    <head>
      <title>About Us &#8211; Techcovery</title>
      <link rel="canonical" href="https://techcovery.in/about-us/" />
    </head>
    <body>
      <h1>About Us</h1>
      <p>
        Techcovery has expertise in enterprise consulting and training in niche digital technologies.
        We work closely with various organizations to fulfill needs for upskilling and reskilling the
        workforce to take on more advanced work in various technologies.
      </p>
    </body>
  </html>
`

const contactHtml = `
  <html>
    <head>
      <title>Contact Us &#8211; Techcovery</title>
      <link rel="canonical" href="https://techcovery.in/contact/" />
    </head>
    <body>
      <h1>Contact Us</h1>
      <p>
        Intide Space, BNR Complex,2nd Floor, J.P Nagar, 7th phase Near Brigade Millenium,
        Puttenahalli, Bangalore-560078, Karnataka
      </p>
    </body>
  </html>
`

const missingRouteHtml = `
  <html>
    <head><title>Not Found</title></head>
    <body><h1>404</h1></body>
  </html>
`

test('Techcovery Solutions sentinel validates the verified first-party no-jobs surface', async () => {
  const techcovery = await loadTechcoveryModule()

  assert.equal(techcovery.SOURCE, 'techrecoverysolutions')
  assert.equal(techcovery.COMPANY, 'Techcovery Solutions')
  assert.equal(techcovery.HOMEPAGE_URL, 'https://techcovery.in/')
  assert.equal(techcovery.ABOUT_URL, 'https://techcovery.in/about-us/')
  assert.equal(techcovery.CONTACT_URL, 'https://techcovery.in/contact/')
  assert.deepEqual(techcovery.NO_JOBS_ROUTE_URLS, [
    'https://techcovery.in/careers',
    'https://techcovery.in/careers/',
    'https://techcovery.in/career',
    'https://techcovery.in/career/',
    'https://techcovery.in/jobs',
    'https://techcovery.in/jobs/',
    'https://techcovery.in/join-us',
    'https://techcovery.in/join-us/',
    'https://techcovery.in/current-openings',
    'https://techcovery.in/current-openings/',
  ])
  assert.equal(techcovery.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(techcovery.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(techcovery.hasOfficialContactSignal(contactHtml), true)
  assert.equal(techcovery.hasUnexpectedPublicJobsSignal(homepageHtml), false)
  assert.equal(
    techcovery.isVerifiedMissingJobsRoute({
      status: 404,
      url: techcovery.NO_JOBS_ROUTE_URLS[0],
      html: missingRouteHtml,
    }),
    true,
  )
})

test('Techcovery Solutions sentinel returns no jobs while the verified first-party no-jobs contract holds', async () => {
  const techcovery = await loadTechcoveryModule()
  const requestedUrls = []

  const jobs = await techcovery.createTechcoverySolutionsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === techcovery.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === techcovery.ABOUT_URL) {
        return { status: 200, url, html: aboutHtml }
      }

      if (url === techcovery.CONTACT_URL) {
        return { status: 200, url, html: contactHtml }
      }

      if (techcovery.NO_JOBS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    techcovery.HOMEPAGE_URL,
    techcovery.ABOUT_URL,
    techcovery.CONTACT_URL,
    ...techcovery.NO_JOBS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Techcovery Solutions sentinel fails closed when the verified surface drifts', async () => {
  const techcovery = await loadTechcoveryModule()

  await assert.rejects(
    techcovery.createTechcoverySolutionsScraper().run({
      fetchPage: async (url) => {
        if (url === techcovery.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Placeholder</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    techcovery.createTechcoverySolutionsScraper().run({
      fetchPage: async (url) => {
        if (url === techcovery.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === techcovery.ABOUT_URL) {
          return {
            status: 200,
            url,
            html: `${aboutHtml}<section><h2>Current Openings</h2><a href="/careers/frontend-engineer">Frontend Engineer</a></section>`,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public jobs/i,
  )

  await assert.rejects(
    techcovery.createTechcoverySolutionsScraper().run({
      fetchPage: async (url) => {
        if (url === techcovery.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === techcovery.ABOUT_URL) {
          return { status: 200, url, html: aboutHtml }
        }

        if (url === techcovery.CONTACT_URL) {
          return { status: 200, url, html: contactHtml }
        }

        if (url === techcovery.NO_JOBS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Current Openings</h1></body></html>',
          }
        }

        if (techcovery.NO_JOBS_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /missing jobs routes changed materially/i,
  )
})
