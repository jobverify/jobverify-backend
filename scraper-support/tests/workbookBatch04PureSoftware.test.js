import assert from 'node:assert/strict'
import test from 'node:test'

const puresoftwareModule = await import('../../scraper/puresoftware/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  HANDOFF_URL,
  MOVED_URL,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createPureSoftwareScraper,
  isVerifiedKnownNoJobsSurface,
  isVerifiedMovedPage,
  isVerifiedPlaceholderPage,
  run,
} = puresoftwareModule

const VERIFIED_MOVED_PAGE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>We've Moved</title>
      <meta http-equiv="refresh" content="5;url=https://www.happiestminds.com/" />
    </head>
    <body>
      <main>
        <p>Redirecting you in <span id="count">5</span> seconds...</p>
      </main>
      <script>
        window.location.href = "https://www.happiestminds.com/"
      </script>
    </body>
  </html>
`

const VERIFIED_PLACEHOLDER_PAGE = {
  status: 200,
  url: CAREERS_URL,
  headers: {
    server: 'Sucuri/Cloudproxy',
    'content-type': 'text/html; charset=UTF-8',
  },
  html: 'TEST DIMPLE',
}

test('PureSoftware validates the verified placeholder surface and returns []', async () => {
  const requestedUrls = []

  const jobs = await run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return VERIFIED_PLACEHOLDER_PAGE
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'puresoftware')
  assert.equal(COMPANY, 'PureSoftware')
  assert.equal(OFFICIAL_BRAND, 'PureSoftware')
  assert.equal(DISPOSITION, 'verified-first-party-placeholder-no-public-careers')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Tuesday, August 4, 2026/)
  assert.match(VERIFIED_SURFACE_SUMMARY, /TEST DIMPLE/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Sucuri\/Cloudproxy/i)
  assert.equal(typeof createPureSoftwareScraper, 'function')
  assert.equal(isVerifiedPlaceholderPage(VERIFIED_PLACEHOLDER_PAGE), true)
  assert.equal(isVerifiedKnownNoJobsSurface(VERIFIED_PLACEHOLDER_PAGE), true)
})

test('PureSoftware still accepts the historical moved-page handoff if it reappears', async () => {
  const movedPage = {
    status: 200,
    url: MOVED_URL,
    html: VERIFIED_MOVED_PAGE_HTML,
  }

  assert.equal(isVerifiedMovedPage(movedPage), true)
  assert.equal(isVerifiedKnownNoJobsSurface(movedPage), true)
})

test('PureSoftware rejects when the verified no-jobs surface disappears', async () => {
  assert.equal(
    isVerifiedPlaceholderPage({
      status: 200,
      url: CAREERS_URL,
      headers: {
        server: 'Sucuri/Cloudproxy',
        'content-type': 'text/html; charset=UTF-8',
      },
      html: 'PureSoftware',
    }),
    false,
  )

  await assert.rejects(
    run({
      fetchPage: async () => ({
        status: 200,
        url: CAREERS_URL,
        headers: {
          server: 'Sucuri/Cloudproxy',
          'content-type': 'text/html; charset=UTF-8',
        },
        html: `
          <html>
            <head><title>PureSoftware</title></head>
            <body><h1>PureSoftware</h1></body>
          </html>
        `,
      }),
    }),
    /verified no-jobs first-party surface/i,
  )
})

test('PureSoftware rejects when the historical handoff no longer points to Happiest Minds', async () => {
  await assert.rejects(
    run({
      fetchPage: async () => ({
        status: 200,
        url: MOVED_URL,
        html: `
          <html>
            <head>
              <title>We've Moved</title>
              <meta http-equiv="refresh" content="5;url=https://example.com/" />
            </head>
            <body>
              <p>Redirecting you in 5 seconds...</p>
              <script>
                window.location.href = "https://example.com/"
              </script>
            </body>
          </html>
        `,
      }),
    }),
    /verified no-jobs first-party surface/i,
  )
})

test('PureSoftware still supports fetchHtml-based unit injection for the historical moved page', async () => {
  const jobs = await run({
    fetchHtml: async (url) => {
      assert.equal(url, CAREERS_URL)
      return VERIFIED_MOVED_PAGE_HTML
    },
  })

  assert.deepEqual(jobs, [])
  assert.equal(HANDOFF_URL, 'https://www.happiestminds.com/')
})
