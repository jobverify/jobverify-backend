import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Pangea Tech scraper module at ./script.js')
  }
}

const dnsFailurePage = (url) => ({
  status: 'FETCH_ERROR',
  url,
  html: '',
  errorMessage: `fetch failed | getaddrinfo ENOTFOUND ${new URL(url).hostname}`,
})

const unreachableFailurePage = (url) => ({
  status: 'FETCH_ERROR',
  url,
  html: '',
  errorMessage: 'fetch failed | Could not connect to server',
})

const unrelatedHomepageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Multilink Broadcast Connect</title>
  <link rel="icon" type="image/png" href="https://multilinkbroadcast.co.uk/favicon.ico"/>
</head>
<body>
  <div class="wrap-login100 p-t-30 p-b-50">
    <span class="login100-form-title p-b-41">
      <img src="static/images/multilink.png" alt="Multilink Broadcast" style="width:60%;" />
    </span>
    <form class="login100-form validate-form p-b-33 p-t-5" autocomplete="chrome-off" method="post">
      <input class="input100" type="text" name="user" placeholder="Enter Username" autocomplete="username">
      <input class="input100" type="password" name="pass" placeholder="Password" autocomplete="new-password">
      <button class="login100-form-btn">Connect</button>
      <p>This system works best using the latest version of <a href="https://www.google.com/chrome/" target="_blank" id="chromelink">Google Chrome</a>.</p>
    </form>
  </div>
</body>
</html>
`

const unrelated404Page = (url) => ({
  status: 404,
  url,
  html: `
    <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
    <html>
      <head><title>404 Not Found</title></head>
      <body>
        <h1>Not Found</h1>
        <p>The requested URL was not found on this server.</p>
        <address>Apache Server at pangea-tech.com Port 443</address>
      </body>
    </html>
  `,
  errorMessage: '',
})

test('Pangea Tech sentinel pins the verified unresolved canonical hosts and unrelated live shell', async () => {
  const scraper = await loadModule()

  assert.equal(scraper.SOURCE, 'pangeatech')
  assert.equal(scraper.COMPANY, 'Pangea Tech')
  assert.equal(scraper.VERIFIED_AT, '2026-07-13')
  assert.deepEqual(scraper.CANONICAL_HOST_CHECKS, [
    { url: 'https://pangea.tech/', expected: 'dns' },
    { url: 'https://www.pangea.tech/', expected: 'dns' },
    { url: 'https://pangeatech.com/', expected: 'unreachable' },
    { url: 'https://www.pangeatech.com/', expected: 'unreachable' },
    { url: 'https://pangeatech.in/', expected: 'dns' },
    { url: 'https://www.pangeatech.in/', expected: 'dns' },
  ])
  assert.equal(scraper.UNRELATED_LIVE_HOST_URL, 'https://pangea-tech.com/')
  assert.deepEqual(scraper.UNRELATED_LIVE_HOST_ROUTE_URLS, [
    'https://pangea-tech.com/careers',
    'https://pangea-tech.com/jobs',
    'https://pangea-tech.com/about-us',
  ])

  assert.equal(
    scraper.isVerifiedCanonicalHostAbsence(
      scraper.CANONICAL_HOST_CHECKS[0],
      dnsFailurePage(scraper.CANONICAL_HOST_CHECKS[0].url),
    ),
    true,
  )
  assert.equal(
    scraper.isVerifiedCanonicalHostAbsence(
      scraper.CANONICAL_HOST_CHECKS[2],
      unreachableFailurePage(scraper.CANONICAL_HOST_CHECKS[2].url),
    ),
    true,
  )
  assert.equal(
    scraper.isVerifiedCanonicalHostAbsence(
      scraper.CANONICAL_HOST_CHECKS[0],
      {
        status: 200,
        url: scraper.CANONICAL_HOST_CHECKS[0].url,
        html: '<html><body>Pangea Tech</body></html>',
        errorMessage: '',
      },
    ),
    false,
  )

  assert.equal(scraper.hasVerifiedUnrelatedLiveHostSignal(unrelatedHomepageHtml), true)
  assert.equal(scraper.hasPublicJobsSignal(unrelatedHomepageHtml), false)
  assert.equal(
    scraper.isVerifiedMissingUnrelatedHostRoute(
      unrelated404Page(scraper.UNRELATED_LIVE_HOST_ROUTE_URLS[0]),
    ),
    true,
  )
})

test('Pangea Tech sentinel returns [] only while the verified no-first-party-signal contract holds', async () => {
  const scraper = await loadModule()
  const requestedUrls = []

  const jobs = await scraper.createPangeaTechScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      const check = scraper.CANONICAL_HOST_CHECKS.find((candidate) => candidate.url === url)
      if (check) {
        return check.expected === 'dns'
          ? dnsFailurePage(url)
          : unreachableFailurePage(url)
      }

      if (url === scraper.UNRELATED_LIVE_HOST_URL) {
        return {
          status: 200,
          url,
          html: unrelatedHomepageHtml,
          errorMessage: '',
        }
      }

      if (scraper.UNRELATED_LIVE_HOST_ROUTE_URLS.includes(url)) {
        return unrelated404Page(url)
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ...scraper.CANONICAL_HOST_CHECKS.map((check) => check.url),
    scraper.UNRELATED_LIVE_HOST_URL,
    ...scraper.UNRELATED_LIVE_HOST_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Pangea Tech sentinel fails closed when a canonical host starts responding', async () => {
  const scraper = await loadModule()

  await assert.rejects(
    scraper.createPangeaTechScraper().run({
      fetchPage: async (url) => {
        if (url === scraper.CANONICAL_HOST_CHECKS[0].url) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Pangea Tech</h1><a href="/careers">Careers</a></body></html>',
            errorMessage: '',
          }
        }

        const check = scraper.CANONICAL_HOST_CHECKS.find((candidate) => candidate.url === url)
        if (check) {
          return check.expected === 'dns'
            ? dnsFailurePage(url)
            : unreachableFailurePage(url)
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /canonical host availability changed/i,
  )
})

test('Pangea Tech sentinel fails closed when the unrelated live shell drifts or starts exposing jobs', async () => {
  const scraper = await loadModule()

  await assert.rejects(
    scraper.createPangeaTechScraper().run({
      fetchPage: async (url) => {
        const check = scraper.CANONICAL_HOST_CHECKS.find((candidate) => candidate.url === url)
        if (check) {
          return check.expected === 'dns'
            ? dnsFailurePage(url)
            : unreachableFailurePage(url)
        }

        if (url === scraper.UNRELATED_LIVE_HOST_URL) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Pangea Tech</title></head><body><h1>Pangea Tech</h1></body></html>',
            errorMessage: '',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /unrelated live host no longer matches/i,
  )

  await assert.rejects(
    scraper.createPangeaTechScraper().run({
      fetchPage: async (url) => {
        const check = scraper.CANONICAL_HOST_CHECKS.find((candidate) => candidate.url === url)
        if (check) {
          return check.expected === 'dns'
            ? dnsFailurePage(url)
            : unreachableFailurePage(url)
        }

        if (url === scraper.UNRELATED_LIVE_HOST_URL) {
          return {
            status: 200,
            url,
            html: unrelatedHomepageHtml,
            errorMessage: '',
          }
        }

        if (url === scraper.UNRELATED_LIVE_HOST_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: `
              <html>
                <head><title>Pangea Tech Careers</title></head>
                <body>
                  <h1>Current Openings</h1>
                  <a href="/jobs/backend-engineer">Apply now</a>
                </body>
              </html>
            `,
            errorMessage: '',
          }
        }

        if (scraper.UNRELATED_LIVE_HOST_ROUTE_URLS.slice(1).includes(url)) {
          return unrelated404Page(url)
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /route changed materially or now exposes public jobs/i,
  )
})
