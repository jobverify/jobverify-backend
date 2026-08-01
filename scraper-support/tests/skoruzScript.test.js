import assert from 'node:assert/strict'
import test from 'node:test'

const SKORUZ_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Skoruz Technologies Pvt Ltd</title>
  </head>
  <body>
    <main>
      <h1>Join Us</h1>
      <p>Multiple Open Positions</p>
      <section>
        <h2>India</h2>
        <iframe
          style="border: 1px solid #ccc; margin: 10px 0;"
          src="https://talenthire.ceipal.in/Jobs/listing/MTAz"
          width="1020"
          height="1700"></iframe>
      </section>
      <section>
        <h2>United States</h2>
        <script
          type="text/javascript"
          src="https://jobsapi.ceipal.com/APISource/widget.js"
          data-ceipal-api-key="MnBZVTdZUU9lZC9xOXJDbFdCSi9OQT09"></script>
        <div id="example-widget-container"></div>
        <h4>"Currently, no openings available. Please check back later for updates. Thank you for your interest!"</h4>
      </section>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/skoruz/script.js')
  } catch {
    assert.fail('Expected Skoruz scraper module at ../../scraper/skoruz/script.js')
  }
}

test('Skoruz sentinel recognizes the verified careers page and the untrusted India CEIPAL embed condition', async () => {
  const skoruz = await loadModule()

  assert.equal(skoruz.SOURCE, 'skoruz')
  assert.equal(skoruz.COMPANY, 'Skoruz')
  assert.equal(skoruz.OFFICIAL_BRAND_NAME, 'Skoruz Technologies Pvt Ltd')
  assert.equal(skoruz.VERIFIED_ON, '2026-07-17')
  assert.equal(skoruz.CAREERS_URL, 'https://www.skoruz.com/careers/')
  assert.equal(skoruz.INDIA_IFRAME_URL, 'https://talenthire.ceipal.in/Jobs/listing/MTAz')
  assert.equal(skoruz.hasVerifiedCareersSignal(SKORUZ_CAREERS_HTML), true)
  assert.equal(
    skoruz.extractIndiaIframeUrl(SKORUZ_CAREERS_HTML),
    'https://talenthire.ceipal.in/Jobs/listing/MTAz',
  )
  assert.equal(
    skoruz.isTrustedIndiaIframeFailure(
      new Error('The underlying connection was closed: Could not establish trust relationship for the SSL/TLS secure channel.'),
    ),
    true,
  )
  assert.equal(
    skoruz.isTrustedIndiaIframeFailure(
      new Error('curl: (28) Failed to connect to talenthire.ceipal.in port 443 after 21065 ms: Could not connect to server'),
    ),
    true,
  )
  assert.equal(
    skoruz.isTrustedIndiaIframeFailure(
      new Error('[skoruz] All 3 attempts failed. Last error: fetch failed | Connect Timeout Error (attempted address: talenthire.ceipal.in:443, timeout: 10000ms)'),
    ),
    true,
  )
})

test('Skoruz returns [] only while the verified careers page still depends on an untrusted India iframe and the US tab is empty', async () => {
  const skoruz = await loadModule()
  const requestedUrls = []

  const jobs = await skoruz.createSkoruzScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === skoruz.CAREERS_URL) return SKORUZ_CAREERS_HTML
      if (url === skoruz.INDIA_IFRAME_URL) {
        throw new Error(
          'The underlying connection was closed: Could not establish trust relationship for the SSL/TLS secure channel.',
        )
      }

      throw new Error(`Unexpected Skoruz URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    skoruz.CAREERS_URL,
    skoruz.INDIA_IFRAME_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Skoruz fails closed when the verified careers page drifts or the India iframe becomes reachable', async () => {
  const skoruz = await loadModule()

  await assert.rejects(
    skoruz.createSkoruzScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified skoruz careers page/i,
  )

  await assert.rejects(
    skoruz.createSkoruzScraper().run({
      fetchText: async (url) => {
        if (url === skoruz.CAREERS_URL) return SKORUZ_CAREERS_HTML
        return '<html><body><h1>Senior Data Engineer</h1><a href="/apply">Apply</a></body></html>'
      },
    }),
    /Skoruz India jobs iframe became reachable or changed materially/i,
  )
})
