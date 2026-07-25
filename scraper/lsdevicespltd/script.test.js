import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected LS Devices (P) Ltd scraper module at ./script.js')
  }
}

const expiredWixHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Reconnect Your Domain | Wix.com</title>
  <meta name="description" content="This domain used to be connected to a Wix website. Learn how to reconnect it, or create your own website.">
  <link rel="canonical" href="https://www.expiredwixdomain.com/">
  <meta name="robots" content="noindex">
  <meta property="og:title" content="Reconnect Your Domain | Wix.com">
  <meta property="og:description" content="This domain used to be connected to a Wix website. Learn how to reconnect it, or create your own website.">
  <meta property="og:url" content="https://www.expiredwixdomain.com/">
  <meta property="og:site_name" content="Domain Expired Page">
  <script type="application/ld+json">
    {"@context":"https://schema.org/","@type":"WebSite","name":"Domain Expired Page","url":"https://www.expiredwixdomain.com"}
  </script>
</head>
<body>
  <p><strong>Dreaming of your own domain? Claim one now on Wix.</strong></p>
  <p>
    If this domain is yours, check the <a href="https://manage.wix.com/account/domains">status</a> -
    you may need to extend your registration.
  </p>
  <a href="https://www.wix.com/domains" aria-label="Get a Domain">Get a Domain</a>
</body>
</html>
`

const publicJobsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Careers | LS Devices (P) Ltd</title>
</head>
<body>
  <main>
    <h1>Current Openings</h1>
    <a href="/jobs/service-engineer">Apply now</a>
  </main>
</body>
</html>
`

test('LS Devices (P) Ltd sentinel pins the verified expired Wix first-party surface from July 13, 2026', async () => {
  const scraper = await loadModule()

  assert.equal(scraper.SOURCE, 'lsdevicespltd')
  assert.equal(scraper.COMPANY, 'LS Devices (P) Ltd')
  assert.equal(scraper.VERIFIED_AT, '2026-07-13')
  assert.equal(scraper.HOMEPAGE_URL, 'http://lsdevices.com/')
  assert.equal(scraper.WWW_HOMEPAGE_URL, 'http://www.lsdevices.com/')
  assert.equal(scraper.ROBOTS_URL, 'http://lsdevices.com/robots.txt')
  assert.deepEqual(scraper.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'http://lsdevices.com/career',
    'http://lsdevices.com/careers',
    'http://lsdevices.com/careers/',
    'http://lsdevices.com/jobs',
    'http://lsdevices.com/openings',
    'http://lsdevices.com/current-openings',
  ])

  assert.equal(scraper.hasVerifiedExpiredWixSignal(expiredWixHtml), true)
  assert.equal(scraper.hasPublicJobsSignal(expiredWixHtml), false)
  assert.equal(scraper.hasPublicJobsSignal(publicJobsHtml), true)
})

test('LS Devices (P) Ltd sentinel returns [] only while the verified expired-domain surface remains unchanged', async () => {
  const scraper = await loadModule()
  const requestedUrls = []

  const jobs = await scraper.createLSDevicesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === scraper.HOMEPAGE_URL || url === scraper.WWW_HOMEPAGE_URL) {
        return expiredWixHtml
      }

      if (url === scraper.ROBOTS_URL) {
        return expiredWixHtml
      }

      if (scraper.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return expiredWixHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    scraper.HOMEPAGE_URL,
    scraper.WWW_HOMEPAGE_URL,
    scraper.ROBOTS_URL,
    ...scraper.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('LS Devices (P) Ltd sentinel fails closed when the expired-domain surface drifts or starts exposing jobs', async () => {
  const scraper = await loadModule()

  await assert.rejects(
    scraper.createLSDevicesScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL) {
          return '<html><head><title>LS Devices</title></head><body><h1>LS Devices</h1></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage no longer matches the verified expired-domain surface/i,
  )

  await assert.rejects(
    scraper.createLSDevicesScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL || url === scraper.WWW_HOMEPAGE_URL) {
          return publicJobsHtml
        }

        if (url === scraper.ROBOTS_URL) {
          return expiredWixHtml
        }

        if (scraper.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
          return expiredWixHtml
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /appears to expose public jobs/i,
  )

  await assert.rejects(
    scraper.createLSDevicesScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL || url === scraper.WWW_HOMEPAGE_URL) {
          return expiredWixHtml
        }

        if (url === scraper.ROBOTS_URL) {
          return '<html><head><title>robots</title></head><body>User-agent: * Allow: /</body></html>'
        }

        if (scraper.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
          return expiredWixHtml
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /robots surface no longer matches the verified expired-domain contract/i,
  )

  await assert.rejects(
    scraper.createLSDevicesScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL || url === scraper.WWW_HOMEPAGE_URL) {
          return expiredWixHtml
        }

        if (url === scraper.ROBOTS_URL) {
          return expiredWixHtml
        }

        if (url === scraper.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return publicJobsHtml
        }

        if (scraper.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
          return expiredWixHtml
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified no-public-careers route changed/i,
  )
})
