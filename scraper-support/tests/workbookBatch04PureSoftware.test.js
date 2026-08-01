import assert from 'node:assert/strict'
import test from 'node:test'

const puresoftwareModule = await import('../../scraper/puresoftware/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createPureSoftwareScraper,
  detectPublicJobsSurface,
  hasVerifiedCompanySurface,
  run,
} = puresoftwareModule

const VERIFIED_COMPANY_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>PureSoftware | Digital Engineering and Transformation</title>
      <link rel="canonical" href="https://puresoftware.com/" />
      <meta property="og:url" content="https://puresoftware.com/" />
    </head>
    <body>
      <main>
        <h1>PureSoftware</h1>
        <p>PureSoftware is a digital engineering and transformation partner.</p>
        <a href="/contact-us/">Contact Us</a>
      </main>
    </body>
  </html>
`

test('PureSoftware stays fail-closed on the verified exact-name public company surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_COMPANY_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'puresoftware')
  assert.equal(COMPANY, 'PureSoftware')
  assert.equal(OFFICIAL_BRAND, 'PureSoftware')
  assert.equal(CAREERS_URL, 'https://puresoftware.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-company-surface')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable public jobs contract/i,
  )
  assert.equal(typeof createPureSoftwareScraper, 'function')
  assert.equal(hasVerifiedCompanySurface(VERIFIED_COMPANY_SURFACE_HTML), true)
  assert.equal(detectPublicJobsSurface(VERIFIED_COMPANY_SURFACE_HTML), null)
})

test('PureSoftware rejects when the verified exact-name company surface disappears', async () => {
  assert.equal(
    hasVerifiedCompanySurface(`
      <html>
        <head><title>Example Company</title></head>
        <body><h1>Example</h1></body>
      </html>
    `),
    false,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <head><title>Example Company</title></head>
          <body><h1>Example</h1></body>
        </html>
      `,
    }),
    /verified public company surface/i,
  )
})

test('PureSoftware rejects when a same-origin public jobs surface appears', async () => {
  const sameOriginJobsHtml = `
    ${VERIFIED_COMPANY_SURFACE_HTML}
    <section>
      <h2>Current Openings</h2>
      <a href="/careers/data-engineer">Data Engineer</a>
    </section>
  `

  assert.match(
    detectPublicJobsSurface(sameOriginJobsHtml) || '',
    /listing copy|https:\/\/puresoftware\.com\/careers\/data-engineer/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => sameOriginJobsHtml,
    }),
    /public jobs surface changed materially/i,
  )
})

test('PureSoftware rejects when a trusted ATS board or JobPosting markup appears', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <iframe src="https://jobs.ashbyhq.com/puresoftware"></iframe>
      `,
    }),
    /public jobs surface changed materially/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Platform Engineer"}
        </script>
      `,
    }),
    /public jobs surface changed materially/i,
  )
})
