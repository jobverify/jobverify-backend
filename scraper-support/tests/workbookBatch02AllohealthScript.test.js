import assert from 'node:assert/strict'
import test from 'node:test'

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Best STI Doctors in India | Allo Health</title>
    <meta name="description" content="Connect with best STI doctors in India. Explore doctor profiles, book appointments online, read user reviews to make informed choices about your sexual health.">
    <link rel="canonical" href="https://www.allohealth.com"/>
    <meta property="og:url" content="https://www.allohealth.com"/>
    <meta property="og:type" content="website"/>
  </head>
  <body>
    <nav>
      <a href="/about">About Us</a>
      <a href="/for-clinicians">For Clinicians</a>
    </nav>
    <h1>Allo Health</h1>
  </body>
</html>
`

const ABOUT_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Best STI Doctors in India | Allo Health</title>
    <meta name="description" content="Connect with best STI doctors in India. Explore doctor profiles, book appointments online, read user reviews to make informed choices about your sexual health.">
    <link rel="canonical" href="https://www.allohealth.com/about"/>
    <meta property="og:url" content="https://www.allohealth.com/about"/>
    <meta property="og:type" content="website"/>
  </head>
  <body>
    <h2>About Us</h2>
    <p>We're building India's first structured healthcare ecosystem to help people take charge of their health.</p>
    <p>Operating in 70+ cities across India.</p>
  </body>
</html>
`

const MISSING_ROUTE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Allo Health</title>
    <meta name="description" content="India's #1 sexual health provider. Private, judgement-free consultations with qualified doctors for sexual wellness, STI testing, mental health & more. Book online.">
  </head>
  <body>
    <div>Not Found</div>
    <a href="/about">About Us</a>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <a href="https://jobs.example.com/sexual-health-counsellor">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/allohealth/script.js')
  } catch {
    assert.fail('Expected Allo Health scraper module at ../../scraper/allohealth/script.js')
  }
}

test('Allo Health helper signals stay pinned to the verified homepage, about page, and missing careers routes', async () => {
  const allohealth = await loadModule()

  assert.equal(allohealth.SOURCE, 'allohealth')
  assert.equal(allohealth.COMPANY, 'Allo Health')
  assert.equal(allohealth.VERIFIED_ON, '2026-07-30')
  assert.equal(allohealth.HOMEPAGE_URL, 'https://www.allohealth.com/')
  assert.equal(allohealth.ABOUT_URL, 'https://www.allohealth.com/about')
  assert.equal(allohealth.CAREERS_URL, 'https://www.allohealth.com/careers')
  assert.equal(allohealth.NON_WWW_CAREERS_URL, 'https://allohealth.com/careers')
  assert.equal(allohealth.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(allohealth.hasOfficialAboutPageSignal(ABOUT_HTML), true)
  assert.equal(allohealth.pageExposesPublicJobListings(HOMEPAGE_HTML), false)
  assert.equal(allohealth.pageExposesPublicJobListings(ABOUT_HTML), false)
  assert.equal(allohealth.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
  assert.equal(
    allohealth.isVerifiedMissingCareerRoute(
      { status: 404, url: allohealth.CAREERS_URL, html: MISSING_ROUTE_HTML },
      allohealth.CAREERS_URL,
    ),
    true,
  )
})

test('Allo Health returns [] only while the verified homepage and about page stay company-identifying and /careers stays missing', async () => {
  const allohealth = await loadModule()
  const requestedUrls = []

  const jobs = await allohealth.createAllohealthScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === allohealth.HOMEPAGE_URL) {
        return { status: 200, url, html: HOMEPAGE_HTML }
      }

      if (url === allohealth.ABOUT_URL) {
        return { status: 200, url, html: ABOUT_HTML }
      }

      if (url === allohealth.CAREERS_URL) {
        return { status: 404, url, html: MISSING_ROUTE_HTML }
      }

      if (url === allohealth.NON_WWW_CAREERS_URL) {
        return { status: 404, url: allohealth.CAREERS_URL, html: MISSING_ROUTE_HTML }
      }

      throw new Error(`Unexpected Allo Health URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    allohealth.HOMEPAGE_URL,
    allohealth.ABOUT_URL,
    allohealth.CAREERS_URL,
    allohealth.NON_WWW_CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Allo Health fails closed when the verified company surface changes materially', async () => {
  const allohealth = await loadModule()

  await assert.rejects(
    allohealth.createAllohealthScraper().run({
      fetchPage: async (url) => {
        if (url === allohealth.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Unexpected</body></html>' }
        }

        if (url === allohealth.ABOUT_URL) {
          return { status: 200, url, html: ABOUT_HTML }
        }

        if (url === allohealth.CAREERS_URL) {
          return { status: 404, url, html: MISSING_ROUTE_HTML }
        }

        if (url === allohealth.NON_WWW_CAREERS_URL) {
          return { status: 404, url: allohealth.CAREERS_URL, html: MISSING_ROUTE_HTML }
        }

        throw new Error(`Unexpected Allo Health URL: ${url}`)
      },
    }),
    /homepage for allo health/i,
  )

  await assert.rejects(
    allohealth.createAllohealthScraper().run({
      fetchPage: async (url) => {
        if (url === allohealth.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === allohealth.ABOUT_URL) {
          return { status: 200, url, html: PUBLIC_JOBS_HTML }
        }

        if (url === allohealth.CAREERS_URL) {
          return { status: 404, url, html: MISSING_ROUTE_HTML }
        }

        if (url === allohealth.NON_WWW_CAREERS_URL) {
          return { status: 404, url: allohealth.CAREERS_URL, html: MISSING_ROUTE_HTML }
        }

        throw new Error(`Unexpected Allo Health URL: ${url}`)
      },
    }),
    /about page for allo health/i,
  )

  await assert.rejects(
    allohealth.createAllohealthScraper().run({
      fetchPage: async (url) => {
        if (url === allohealth.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === allohealth.ABOUT_URL) {
          return { status: 200, url, html: ABOUT_HTML }
        }

        if (url === allohealth.CAREERS_URL) {
          return { status: 200, url, html: PUBLIC_JOBS_HTML }
        }

        if (url === allohealth.NON_WWW_CAREERS_URL) {
          return { status: 404, url: allohealth.CAREERS_URL, html: MISSING_ROUTE_HTML }
        }

        throw new Error(`Unexpected Allo Health URL: ${url}`)
      },
    }),
    /verified no-public-careers route changed/i,
  )

  await assert.rejects(
    allohealth.createAllohealthScraper().run({
      fetchPage: async (url) => {
        if (url === allohealth.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === allohealth.ABOUT_URL) {
          return { status: 200, url, html: ABOUT_HTML }
        }

        if (url === allohealth.CAREERS_URL) {
          return { status: 404, url, html: MISSING_ROUTE_HTML }
        }

        if (url === allohealth.NON_WWW_CAREERS_URL) {
          return { status: 404, url: 'https://allohealth.com/careers', html: MISSING_ROUTE_HTML }
        }

        throw new Error(`Unexpected Allo Health URL: ${url}`)
      },
    }),
    /non-www careers alias/i,
  )
})
