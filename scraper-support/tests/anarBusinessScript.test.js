import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Anar Business App: A Journey Concluded</title>
  </head>
  <body>
    <main>
      <h1>Anar Business App: A Journey Concluded</h1>
      <h2>Why We Shut Down</h2>
      <p>The Anar Business App journey has come to a close.</p>
      <p>Thank you for being part of Anar.</p>
    </main>
  </body>
</html>
`

const missingRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>404 | Anar</title>
  </head>
  <body>
    <main>
      <h1>404</h1>
      <p>Page not found on Anar.</p>
    </main>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Anar Careers</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Growth Manager"}
    </script>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://jobs.lever.co/anar/growth-manager">Apply now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/anarbusiness/script.js')
  } catch {
    assert.fail('Expected Anar Business scraper module at ../../scraper/anarbusiness/script.js')
  }
}

test('Anar Business helpers stay pinned to the verified shutdown homepage and missing careers routes', async () => {
  const anar = await loadModule()

  assert.equal(anar.SOURCE, 'anarbusiness')
  assert.equal(anar.COMPANY, 'Anar Business')
  assert.equal(anar.OFFICIAL_BRAND_NAME, 'Anar')
  assert.equal(anar.VERIFIED_ON, '2026-07-15')
  assert.equal(anar.HOMEPAGE_URL, 'https://www.anar.biz/')
  assert.deepEqual(anar.NO_PUBLIC_JOB_ROUTE_URLS, [
    'https://www.anar.biz/career',
    'https://www.anar.biz/careers',
    'https://www.anar.biz/jobs',
    'https://www.anar.biz/join-us',
    'https://www.anar.biz/work-with-us',
  ])
  assert.match(anar.VERIFIED_SURFACE_SUMMARY, /A Journey Concluded/i)
  assert.equal(anar.hasShutdownExplainerSignal(homepageHtml), true)
  assert.equal(anar.pageExposesPublicJobListings(homepageHtml), false)
  assert.equal(anar.pageExposesPublicJobListings(publicJobsHtml), true)
  assert.equal(
    anar.isVerifiedMissingCareersRoute(
      {
        status: 404,
        url: 'https://www.anar.biz/careers',
        html: missingRouteHtml,
      },
      'https://www.anar.biz/careers',
    ),
    true,
  )
})

test('Anar Business returns no jobs while the verified shutdown homepage and missing careers routes remain unchanged', async () => {
  const anar = await loadModule()
  const requestedUrls = []

  const jobs = await anar.run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === anar.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (anar.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    anar.HOMEPAGE_URL,
    ...anar.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Anar Business fails closed when the homepage or missing careers routes drift into a public jobs surface', async () => {
  const anar = await loadModule()

  await assert.rejects(
    anar.run({
      fetchPage: async (url) => {
        if (url === anar.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Anar</title></head><body>Placeholder</body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /shutdown homepage no longer matches/i,
  )

  await assert.rejects(
    anar.run({
      fetchPage: async (url) => {
        if (url === anar.HOMEPAGE_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /shutdown homepage no longer matches/i,
  )

  await assert.rejects(
    anar.run({
      fetchPage: async (url) => {
        if (url === anar.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === anar.NO_PUBLIC_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        if (anar.NO_PUBLIC_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /missing careers route changed materially or now exposes public jobs/i,
  )
})
