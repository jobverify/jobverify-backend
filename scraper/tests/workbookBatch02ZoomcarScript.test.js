import assert from 'node:assert/strict'
import test from 'node:test'

const MARKETING_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title id="meta-title">Zoomcar Self Drive Car Rentals in India | Book Online</title>
    <meta id="meta-desc" name="description" content="Enjoy affordable self-drive car hire with flexible plans and online booking. Hire a car for a day or choose monthly car rentals at Zoomcar.">
    <meta property="og:type" content="product">
    <meta property="og:url" content="https://www.zoomcar.com">
    <link href="https://www.zoomcar.com/" rel="canonical"/>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "name": "Zoomcar",
            "url": "https://www.zoomcar.com"
          },
          {
            "@type": "Product",
            "name": "Book Self-Drive Car Rental with Zoomcar"
          }
        ]
      }
    </script>
  </head>
  <body>
    <div id="app"></div>
    <p>Book self drive car at the cheapest rates.</p>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <a href="https://jobs.example.com/community-manager">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../workbookbatch02/zoomcar.js')
  } catch {
    assert.fail('Expected Zoomcar scraper module at ../workbookbatch02/zoomcar.js')
  }
}

test('Zoomcar helper signals stay pinned to the verified consumer marketing shell across homepage, careers, and jobs routes', async () => {
  const zoomcar = await loadModule()

  assert.equal(zoomcar.SOURCE, 'zoomcar')
  assert.equal(zoomcar.COMPANY, 'ZoomCar')
  assert.equal(zoomcar.VERIFIED_ON, '2026-07-30')
  assert.equal(zoomcar.HOMEPAGE_URL, 'https://www.zoomcar.com/')
  assert.equal(zoomcar.CAREERS_URL, 'https://www.zoomcar.com/careers')
  assert.equal(zoomcar.JOBS_URL, 'https://www.zoomcar.com/jobs')
  assert.equal(zoomcar.NON_WWW_CAREERS_URL, 'https://zoomcar.com/careers')
  assert.equal(zoomcar.hasOfficialMarketingShellSignal(MARKETING_SHELL_HTML), true)
  assert.equal(zoomcar.pageExposesPublicJobListings(MARKETING_SHELL_HTML), false)
  assert.equal(zoomcar.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
})

test('Zoomcar returns [] only while homepage, careers, and jobs all serve the same verified marketing shell', async () => {
  const zoomcar = await loadModule()
  const requestedUrls = []

  const jobs = await zoomcar.createZoomcarScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === zoomcar.HOMEPAGE_URL) {
        return { status: 200, url, html: MARKETING_SHELL_HTML }
      }

      if (url === zoomcar.CAREERS_URL) {
        return { status: 200, url, html: MARKETING_SHELL_HTML }
      }

      if (url === zoomcar.NON_WWW_CAREERS_URL) {
        return { status: 200, url: zoomcar.CAREERS_URL, html: MARKETING_SHELL_HTML }
      }

      if (url === zoomcar.JOBS_URL) {
        return { status: 200, url, html: MARKETING_SHELL_HTML }
      }

      throw new Error(`Unexpected Zoomcar URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    zoomcar.HOMEPAGE_URL,
    zoomcar.CAREERS_URL,
    zoomcar.NON_WWW_CAREERS_URL,
    zoomcar.JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Zoomcar fails closed when any verified marketing-shell route changes into a public jobs surface', async () => {
  const zoomcar = await loadModule()

  await assert.rejects(
    zoomcar.createZoomcarScraper().run({
      fetchPage: async (url) => {
        if (url === zoomcar.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Unexpected</body></html>' }
        }

        if (url === zoomcar.CAREERS_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.NON_WWW_CAREERS_URL) {
          return { status: 200, url: zoomcar.CAREERS_URL, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.JOBS_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        throw new Error(`Unexpected Zoomcar URL: ${url}`)
      },
    }),
    /homepage for zoomcar/i,
  )

  await assert.rejects(
    zoomcar.createZoomcarScraper().run({
      fetchPage: async (url) => {
        if (url === zoomcar.HOMEPAGE_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.CAREERS_URL) {
          return { status: 200, url, html: PUBLIC_JOBS_HTML }
        }

        if (url === zoomcar.NON_WWW_CAREERS_URL) {
          return { status: 200, url: zoomcar.CAREERS_URL, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.JOBS_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        throw new Error(`Unexpected Zoomcar URL: ${url}`)
      },
    }),
    /careers route/i,
  )

  await assert.rejects(
    zoomcar.createZoomcarScraper().run({
      fetchPage: async (url) => {
        if (url === zoomcar.HOMEPAGE_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.CAREERS_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.NON_WWW_CAREERS_URL) {
          return { status: 200, url: 'https://zoomcar.com/careers', html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.JOBS_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        throw new Error(`Unexpected Zoomcar URL: ${url}`)
      },
    }),
    /non-www careers alias/i,
  )

  await assert.rejects(
    zoomcar.createZoomcarScraper().run({
      fetchPage: async (url) => {
        if (url === zoomcar.HOMEPAGE_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.CAREERS_URL) {
          return { status: 200, url, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.NON_WWW_CAREERS_URL) {
          return { status: 200, url: zoomcar.CAREERS_URL, html: MARKETING_SHELL_HTML }
        }

        if (url === zoomcar.JOBS_URL) {
          return { status: 200, url, html: PUBLIC_JOBS_HTML }
        }

        throw new Error(`Unexpected Zoomcar URL: ${url}`)
      },
    }),
    /jobs route/i,
  )
})
