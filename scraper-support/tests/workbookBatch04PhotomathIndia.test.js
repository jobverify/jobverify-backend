import assert from 'node:assert/strict'
import test from 'node:test'

const photomathIndiaModule = await import('../../scraper/photomathindia/script.js').catch(
  () => ({}),
)

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createPhotomathIndiaScraper,
  detectPublicJobsSurface,
  hasVerifiedCompanySurface,
  run,
} = photomathIndiaModule

const VERIFIED_COMPANY_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Photomath | Learn math, step-by-step</title>
      <link rel="canonical" href="https://www.photomath.com/" />
      <meta property="og:site_name" content="Photomath" />
      <meta property="og:url" content="https://www.photomath.com/" />
    </head>
    <body>
      <main>
        <h1>Photomath</h1>
        <p>Learn math, step-by-step, with a global learning product.</p>
        <a href="/app">Get the app</a>
      </main>
    </body>
  </html>
`

test('Photomath India stays fail-closed on the verified exact-name public company surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_COMPANY_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'photomathindia')
  assert.equal(COMPANY, 'Photomath India')
  assert.equal(OFFICIAL_BRAND, 'Photomath')
  assert.equal(CAREERS_URL, 'https://www.photomath.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-company-surface')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /exact-name Photomath public company surface reviewed for Photomath India/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable public jobs contract/i,
  )
  assert.equal(typeof createPhotomathIndiaScraper, 'function')
  assert.equal(hasVerifiedCompanySurface(VERIFIED_COMPANY_SURFACE_HTML), true)
  assert.equal(detectPublicJobsSurface(VERIFIED_COMPANY_SURFACE_HTML), null)
})

test('Photomath India rejects when the verified exact-name public company surface disappears', async () => {
  assert.equal(
    hasVerifiedCompanySurface(`
      <html>
        <head><title>Example Learning App</title></head>
        <body><h1>Example</h1></body>
      </html>
    `),
    false,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <head><title>Example Learning App</title></head>
          <body><h1>Example</h1></body>
        </html>
      `,
    }),
    /verified public company surface/i,
  )
})

test('Photomath India rejects when a same-origin public jobs surface appears', async () => {
  const sameOriginJobsHtml = `
    ${VERIFIED_COMPANY_SURFACE_HTML}
    <section>
      <h2>Current Openings</h2>
      <a href="/careers/senior-software-engineer">Senior Software Engineer</a>
    </section>
  `

  assert.match(
    detectPublicJobsSurface(sameOriginJobsHtml) || '',
    /listing copy|https:\/\/www\.photomath\.com\/careers\/senior-software-engineer/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => sameOriginJobsHtml,
    }),
    /public jobs surface changed materially/i,
  )
})

test('Photomath India rejects when trusted ATS signals or JobPosting markup appear', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <iframe src="https://jobs.ashbyhq.com/photomath"></iframe>
      `,
    }),
    /public jobs surface changed materially/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Software Engineer"}
        </script>
      `,
    }),
    /public jobs surface changed materially/i,
  )
})
