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

const unrelatedUnavailablePage = {
  status: 'FETCH_ERROR',
  url: 'https://pangea-tech.com/',
  html: '',
  errorMessage: "fetch failed | Hostname/IP does not match certificate's altnames: Host: pangea-tech.com. is not in the cert's altnames: DNS:connect.multilinkbroadcast.co.uk",
}

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

test('Pangea Tech keeps its source identity and verified metadata', async () => {
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

  assert.equal(scraper.hasVerifiedUnrelatedLiveHostSignal(unrelatedHomepageHtml), true)
  assert.equal(scraper.isVerifiedUnavailableUnrelatedHost(unrelatedUnavailablePage), true)
  assert.equal(scraper.hasPublicJobsSignal(unrelatedHomepageHtml), false)
  assert.equal(
    scraper.isVerifiedMissingUnrelatedHostRoute(
      unrelated404Page(scraper.UNRELATED_LIVE_HOST_ROUTE_URLS[0]),
    ),
    true,
  )
})

test('Pangea Tech fails closed without making network requests', async () => {
  const scraper = await loadModule()
  let fetchCalled = false
  const jobs = await scraper.createPangeaTechScraper().run({
    fetchPage: async () => { fetchCalled = true },
  })

  assert.deepEqual(jobs, [])
  assert.equal(fetchCalled, false)
})

test('Pangea Tech exposes the stable dependency and runtime factory contract', async () => {
  const scraper = await loadModule()
  const deps = { fetchPage: async () => ({ status: 200, html: '' }) }
  const runtime = { signal: new AbortController().signal }

  assert.equal(typeof scraper.createPangeatechScraper, 'function')
  assert.deepEqual(await scraper.createPangeatechScraper(deps).run(runtime), [])
})

test('Pangea Tech remains empty even when a caller supplies a changed live page', async () => {
  const scraper = await loadModule()

  assert.deepEqual(
    await scraper.createPangeaTechScraper().run({
      fetchPage: async () => ({ status: 200, html: '<h1>Current Openings</h1>' }),
    }),
    [],
  )
})
