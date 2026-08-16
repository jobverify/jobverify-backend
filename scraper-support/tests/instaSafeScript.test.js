import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedCareersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at InstaSafe | InstaSafe</title>
    <link rel="canonical" href="https://instasafe.com/careers/" />
    <meta
      name="description"
      content="Join a global, remote-friendly team simplifying cybersecurity for enterprises across five continents."
    />
  </head>
  <body>
    <main id="main">
      <h1 class="izsc-h1">
        <span>Build</span>
        <span> </span>
        <span>the</span>
        <span> </span>
        <em class="izsc-hl">Future</em>
        <span> </span>
        <em class="izsc-hl">of</em>
        <span> </span>
        <em class="izsc-hl">Access.</em>
      </h1>
      <p>
        Join a global, remote-friendly team simplifying cybersecurity for enterprises across five continents.
      </p>
      <a href="/book-a-demo">Book a demo</a>
      <a href="https://docs.instasafe.com/">Read the docs</a>
      <a href="mailto:sales@instasafe.com">Talk to sales</a>
      <a href="https://support.instasafe.com/portal/en/home">Contact support</a>
    </main>
  </body>
</html>
`

const verifiedCareersPageWithLegacyZohoHandoffHtml = `
${verifiedCareersPageHtml.replace(
  '</main>',
  `
      <a href="https://instasafe.zohorecruit.com/jobs/Careers/">View jobs</a>
    </main>`,
)}
`

const verifiedCareersPageWithSameOriginJobsRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at InstaSafe | InstaSafe</title>
    <link rel="canonical" href="https://instasafe.com/careers/" />
    <meta
      name="description"
      content="Join a global, remote-friendly team simplifying cybersecurity for enterprises across five continents."
    />
  </head>
  <body>
    <main id="main">
      <h1>Build the <em>Future</em> of <em>Access.</em></h1>
      <a href="/careers/open-roles">Open roles</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/instasafe/script.js')
  } catch {
    assert.fail('Expected InstaSafe scraper module at ../../scraper/instasafe/script.js')
  }
}

test('InstaSafe constants stay pinned to the verified first-party careers surface and fail-closed empty-state contract', async () => {
  const instasafe = await loadModule()

  assert.equal(instasafe.SOURCE, 'instasafe')
  assert.equal(instasafe.COMPANY, 'InstaSafe')
  assert.equal(instasafe.OFFICIAL_BRAND_NAME, 'InstaSafe')
  assert.equal(instasafe.VERIFIED_ON, '2026-08-15')
  assert.equal(instasafe.HOMEPAGE_URL, 'https://instasafe.com/')
  assert.equal(instasafe.CAREERS_PAGE_URL, 'https://instasafe.com/careers/')
  assert.match(instasafe.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs inventory/i)
  assert.match(instasafe.VERIFIED_SURFACE_SUMMARY, /fails closed/i)
  assert.equal(instasafe.hasOfficialCareersPageSignal(verifiedCareersPageHtml), true)
  assert.equal(instasafe.detectPublicJobsSurface(verifiedCareersPageHtml), null)
})

test('detectPublicJobsSurface flags reappearing ATS and same-origin openings routes for review', async () => {
  const instasafe = await loadModule()
  assert.equal(
    instasafe.detectPublicJobsSurface(verifiedCareersPageWithLegacyZohoHandoffHtml),
    'https://instasafe.zohorecruit.com/jobs/Careers/',
  )
  assert.equal(
    instasafe.detectPublicJobsSurface(verifiedCareersPageWithSameOriginJobsRouteHtml),
    'https://instasafe.com/careers/open-roles',
  )
})

test('run returns an honest empty result when the verified careers page exposes no trustworthy public jobs surface', async () => {
  const instasafe = await loadModule()
  const requestedUrls = []

  const jobs = await instasafe.createInstaSafeScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === instasafe.CAREERS_PAGE_URL) return verifiedCareersPageHtml
      assert.fail(`Unexpected InstaSafe HTML request: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [instasafe.CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('run preserves the honest empty result when the verified InstaSafe careers page is temporarily timeout-blocked', async () => {
  const instasafe = await loadModule()
  const requestedUrls = []

  const jobs = await instasafe.createInstaSafeScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      throw new Error('fetch failed | Connect Timeout Error (attempted address: instasafe.com:443, timeout: 10000ms)')
    },
  })

  assert.deepEqual(requestedUrls, [instasafe.CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('run fails closed when the verified InstaSafe careers page markers drift', async () => {
  const instasafe = await loadModule()

  await assert.rejects(
    instasafe.createInstaSafeScraper().run({
      fetchText: async (url) => {
        if (url === instasafe.CAREERS_PAGE_URL) {
          return '<html><body>Broken careers page</body></html>'
        }

        return portalHtml
      },
      fetchJson: async () => apiPayload,
    }),
    /official InstaSafe careers page/i,
  )
})

test('run fails closed when the verified InstaSafe page starts exposing a public jobs surface again', async () => {
  const instasafe = await loadModule()

  await assert.rejects(
    instasafe.createInstaSafeScraper().run({
      fetchText: async () => verifiedCareersPageWithLegacyZohoHandoffHtml,
    }),
    /public jobs surface changed materially/i,
  )
})
