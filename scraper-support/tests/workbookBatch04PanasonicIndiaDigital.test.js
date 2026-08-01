import assert from 'node:assert/strict'
import test from 'node:test'

const panasonicIndiaDigitalModule = await import('../../scraper/panasonicindiadigital/script.js').catch(
  () => ({}),
)

const {
  COMPANY,
  CORPORATE_URL,
  DISPOSITION,
  GLOBAL_CAREERS_URL,
  OFFICIAL_BRAND,
  PUBLIC_SURFACE_URL,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createPanasonicIndiaDigitalScraper,
  findVerifiedGlobalCareersHandoff,
  hasVerifiedCorporateSurface,
  hasVerifiedIndiaPublicSurface,
  run,
} = panasonicIndiaDigitalModule

const VERIFIED_PUBLIC_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Panasonic India</title>
      <link rel="canonical" href="https://www.panasonic.com/in/" />
      <meta property="og:url" content="https://www.panasonic.com/in/" />
    </head>
    <body>
      <main>
        <h1>Panasonic India</h1>
        <a href="/in/corporate.html">Corporate</a>
      </main>
    </body>
  </html>
`

const VERIFIED_CORPORATE_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Panasonic India Corporate</title>
      <link rel="canonical" href="https://www.panasonic.com/in/corporate.html" />
      <meta property="og:url" content="https://www.panasonic.com/in/corporate.html" />
    </head>
    <body>
      <main>
        <h1>Panasonic India</h1>
        <p>Corporate profile and company information.</p>
        <a href="https://careers.na.panasonic.com/corporate/jobs/locations/country/India">
          Careers[Global site]
        </a>
      </main>
    </body>
  </html>
`

test('Panasonic India Digital stays fail-closed on the verified Panasonic India public surfaces', async () => {
  const requestedUrls = []

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrls.push(url)

      if (url === PUBLIC_SURFACE_URL) return VERIFIED_PUBLIC_SURFACE_HTML
      if (url === CORPORATE_URL) return VERIFIED_CORPORATE_SURFACE_HTML

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [PUBLIC_SURFACE_URL, CORPORATE_URL])
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'panasonicindiadigital')
  assert.equal(COMPANY, 'Panasonic India Digital')
  assert.equal(OFFICIAL_BRAND, 'Panasonic India')
  assert.equal(PUBLIC_SURFACE_URL, 'https://www.panasonic.com/in/')
  assert.equal(CORPORATE_URL, 'https://www.panasonic.com/in/corporate.html')
  assert.equal(
    GLOBAL_CAREERS_URL,
    'https://careers.na.panasonic.com/corporate/jobs/locations/country/India',
  )
  assert.equal(DISPOSITION, 'verified-panasonic-india-corporate-handoff-fail-closed')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /exact workbook entity Panasonic India Digital/i)
  assert.equal(typeof createPanasonicIndiaDigitalScraper, 'function')
  assert.equal(hasVerifiedIndiaPublicSurface(VERIFIED_PUBLIC_SURFACE_HTML), true)
  assert.equal(hasVerifiedCorporateSurface(VERIFIED_CORPORATE_SURFACE_HTML), true)
  assert.equal(
    findVerifiedGlobalCareersHandoff(VERIFIED_CORPORATE_SURFACE_HTML)?.url.toString(),
    GLOBAL_CAREERS_URL,
  )
})

test('Panasonic India Digital rejects when the verified Panasonic India public surface disappears', async () => {
  await assert.rejects(
    run({
      fetchHtml: async (url) =>
        url === CORPORATE_URL
          ? VERIFIED_CORPORATE_SURFACE_HTML
          : `
              <html>
                <head><title>Example Home</title></head>
                <body><h1>Example</h1></body>
              </html>
            `,
    }),
    /verified Panasonic India public surface changed/i,
  )
})

test('Panasonic India Digital rejects when the verified corporate careers handoff disappears', async () => {
  assert.equal(
    hasVerifiedCorporateSurface(`
      <html>
        <head>
          <title>Panasonic India Corporate</title>
          <link rel="canonical" href="https://www.panasonic.com/in/corporate.html" />
        </head>
        <body>
          <h1>Panasonic India</h1>
          <p>Corporate profile.</p>
        </body>
      </html>
    `),
    false,
  )

  await assert.rejects(
    run({
      fetchHtml: async (url) =>
        url === PUBLIC_SURFACE_URL
          ? VERIFIED_PUBLIC_SURFACE_HTML
          : `
              <html>
                <head>
                  <title>Panasonic India Corporate</title>
                  <link rel="canonical" href="https://www.panasonic.com/in/corporate.html" />
                </head>
                <body>
                  <h1>Panasonic India</h1>
                  <p>Corporate profile.</p>
                </body>
              </html>
            `,
    }),
    /verified Panasonic careers handoff changed/i,
  )
})

test('Panasonic India Digital rejects when the Panasonic India surfaces start exposing public jobs directly', async () => {
  await assert.rejects(
    run({
      fetchHtml: async (url) =>
        url === PUBLIC_SURFACE_URL
          ? `
              ${VERIFIED_PUBLIC_SURFACE_HTML}
              <script type="application/ld+json">
                {"@context":"https://schema.org","@type":"JobPosting","title":"Software Engineer"}
              </script>
            `
          : VERIFIED_CORPORATE_SURFACE_HTML,
    }),
    /JobPosting markup/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async (url) =>
        url === PUBLIC_SURFACE_URL
          ? VERIFIED_PUBLIC_SURFACE_HTML
          : `
              ${VERIFIED_CORPORATE_SURFACE_HTML}
              <iframe src="https://boards.greenhouse.io/panasonic"></iframe>
            `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async (url) =>
        url === PUBLIC_SURFACE_URL
          ? `
              ${VERIFIED_PUBLIC_SURFACE_HTML}
              <a href="/careers/software-engineer">Software Engineer</a>
            `
          : VERIFIED_CORPORATE_SURFACE_HTML,
    }),
    /public jobs surface/i,
  )
})
