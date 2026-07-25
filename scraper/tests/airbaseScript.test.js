import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Airbase, a Paylocity Company | Airbase by Paylocity</title>
    <meta name="description" content="Paylocity, a leader in cloud-based HR and payroll software solutions, has completed its acquisition of Airbase Inc.">
  </head>
  <body>
    <a href="https://www.paylocity.com/">Careers</a>
    <img alt="" src="img/airbase-paylocity-wht-1.svg">
    <p>Paylocity for Finance combines our advanced spend management capabilities with Paylocity's robust HCM platform.</p>
    <p>What does this mean for Airbase clients?</p>
    <p>© Airbase Inc. 2025.</p>
  </body>
</html>
`

const currentHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Airbase, a Paylocity Company | Airbase by Paylocity</title>
  </head>
  <body>
    <a href="https://www.paylocity.com/">Paylocity</a>
    <p>Paylocity for Finance combines our advanced spend management capabilities with Paylocity&rsquo;s robust HCM platform.</p>
    <p>What does this mean for Airbase clients?</p>
    <p>Airbase Inc.</p>
  </body>
</html>
`

const genericPaylocityCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Paylocity | Paylocity</title>
    <meta name="description" content="Sure, we build great products, but we also want Paylocity to be a great place to work. Join us as we help clients solve problems and shape the future of work.">
    <link rel="canonical" href="//www.paylocity.com/company/careers/">
  </head>
  <body>
    <h1>Careers</h1>
    <p>Sure, we build great products, but we also want Paylocity to be a great place to work.</p>
    <p>Join us as we help clients solve problems and shape the future of work.</p>
    <a href="//www.paylocity.com/company/careers/protect-yourself/">Protect yourself.</a>
  </body>
</html>
`

const paylocityJsShellHtml = `
<!doctype html>
<html lang="en">
  <head></head>
  <body>
    <p>For the best experience, we recommend enabling JavaScript in your browser.</p>
  </body>
</html>
`

const notFoundHtml = `
  <html>
    <head><title>404 Not Found</title></head>
    <body><h1>Not Found</h1></body>
  </html>
`

const loadAirbaseModule = async () => {
  try {
    return await import('../airbase/script.js')
  } catch {
    assert.fail('Expected Airbase scraper module at ../airbase/script.js')
  }
}

test('Airbase scraper constants stay pinned to the verified acquisition homepage, Paylocity careers redirect, and missing routes', async () => {
  const airbase = await loadAirbaseModule()

  assert.equal(airbase.SOURCE, 'airbase')
  assert.equal(airbase.COMPANY, 'Airbase')
  assert.equal(airbase.HOMEPAGE_URL, 'https://www.airbase.com/')
  assert.equal(airbase.CAREERS_ROUTE_URL, 'https://www.airbase.com/careers')
  assert.equal(airbase.PARENT_CAREERS_URL, 'https://www.paylocity.com/company/careers/')
  assert.deepEqual(airbase.NO_PUBLIC_CAREER_ROUTE_URLS, [
    'https://www.airbase.com/career',
    'https://www.airbase.com/jobs',
    'https://www.airbase.com/join-us',
    'https://www.airbase.com/work-with-us',
    'https://www.airbase.com/openings',
    'https://www.airbase.com/current-openings',
  ])
  assert.equal(airbase.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(airbase.hasOfficialHomepageSignal(currentHomepageHtml), true)
  assert.equal(airbase.hasGenericParentCareersSignal(genericPaylocityCareersHtml), true)
  assert.equal(airbase.hasGenericParentCareersSignal(paylocityJsShellHtml), true)
  assert.equal(airbase.isMissingCareerRoute({ status: 404, url: airbase.NO_PUBLIC_CAREER_ROUTE_URLS[0] }), true)
})

test('Airbase accepts the current Paylocity JavaScript shell as a generic parent careers handoff', async () => {
  const airbase = await loadAirbaseModule()

  const jobs = await airbase.createAirbaseScraper().run({
    fetchPage: async (url) => {
      if (url === airbase.HOMEPAGE_URL) {
        return { status: 200, url, html: currentHomepageHtml }
      }

      if (url === airbase.CAREERS_ROUTE_URL) {
        return {
          status: 200,
          url: airbase.PARENT_CAREERS_URL,
          html: paylocityJsShellHtml,
        }
      }

      if (airbase.NO_PUBLIC_CAREER_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: notFoundHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Airbase returns no jobs only while the first-party careers route redirects to the generic parent Paylocity careers page and the checked Airbase routes stay missing', async () => {
  const airbase = await loadAirbaseModule()
  const requestedUrls = []

  const jobs = await airbase.createAirbaseScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === airbase.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === airbase.CAREERS_ROUTE_URL) {
        return {
          status: 200,
          url: airbase.PARENT_CAREERS_URL,
          html: genericPaylocityCareersHtml,
        }
      }

      if (airbase.NO_PUBLIC_CAREER_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: notFoundHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    airbase.HOMEPAGE_URL,
    airbase.CAREERS_ROUTE_URL,
    ...airbase.NO_PUBLIC_CAREER_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Airbase fails closed when the homepage, parent careers redirect, or checked missing routes drift', async () => {
  const airbase = await loadAirbaseModule()

  await assert.rejects(
    airbase.createAirbaseScraper().run({
      fetchPage: async (url) => {
        if (url === airbase.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        if (url === airbase.CAREERS_ROUTE_URL) {
          return {
            status: 200,
            url: airbase.PARENT_CAREERS_URL,
            html: genericPaylocityCareersHtml,
          }
        }

        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    airbase.createAirbaseScraper().run({
      fetchPage: async (url) => {
        if (url === airbase.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === airbase.CAREERS_ROUTE_URL) {
          return {
            status: 200,
            url: airbase.CAREERS_ROUTE_URL,
            html: genericPaylocityCareersHtml,
          }
        }

        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /verified parent careers redirect/i,
  )

  await assert.rejects(
    airbase.createAirbaseScraper().run({
      fetchPage: async (url) => {
        if (url === airbase.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === airbase.CAREERS_ROUTE_URL) {
          return {
            status: 200,
            url: airbase.PARENT_CAREERS_URL,
            html: genericPaylocityCareersHtml.replace(
              'Join us as we help clients solve problems and shape the future of work.',
              'Join Airbase as we build the future of finance.',
            ),
          }
        }

        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /verified generic parent careers surface/i,
  )

  await assert.rejects(
    airbase.createAirbaseScraper().run({
      fetchPage: async (url) => {
        if (url === airbase.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === airbase.CAREERS_ROUTE_URL) {
          return {
            status: 200,
            url: airbase.PARENT_CAREERS_URL,
            html: genericPaylocityCareersHtml,
          }
        }

        if (url === airbase.NO_PUBLIC_CAREER_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body>Open roles</body></html>' }
        }

        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /verified no-public-careers route/i,
  )
})
