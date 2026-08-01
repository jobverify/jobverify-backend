import assert from 'node:assert/strict'
import test from 'node:test'

const trellModule = await import('../../scraper/trell/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createTrellScraper,
  detectPublicJobsSurface,
  hasVerifiedCompanySurface,
  run,
} = trellModule

const VERIFIED_COMPANY_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Trell | Discover lifestyle-led communities</title>
      <link rel="canonical" href="https://trell.co/" />
      <meta property="og:url" content="https://trell.co/" />
    </head>
    <body>
      <main>
        <h1>Trell</h1>
        <p>Trell builds lifestyle-led communities around commerce, content, and discovery.</p>
        <a href="/about">About</a>
      </main>
    </body>
  </html>
`

test('Trell stays fail-closed on the verified exact-name public company surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_COMPANY_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'trell')
  assert.equal(COMPANY, 'Trell')
  assert.equal(CAREERS_URL, 'https://trell.co/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed-sentinel')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.equal(typeof createTrellScraper, 'function')
  assert.equal(hasVerifiedCompanySurface(VERIFIED_COMPANY_SURFACE_HTML), true)
  assert.equal(detectPublicJobsSurface(VERIFIED_COMPANY_SURFACE_HTML), null)
})

test('Trell rejects when the verified exact-name company surface disappears', async () => {
  assert.equal(
    hasVerifiedCompanySurface(`
      <html>
        <head><title>About Example</title></head>
        <body><h1>Example</h1></body>
      </html>
    `),
    false,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <head><title>About Example</title></head>
          <body><h1>Example</h1></body>
        </html>
      `,
    }),
    /verified exact-name public company surface/i,
  )
})

test('Trell rejects when a trustworthy jobs surface appears on the verified page', async () => {
  const sameOriginJobsHtml = `
    ${VERIFIED_COMPANY_SURFACE_HTML}
    <section>
      <h2>Current Openings</h2>
      <a href="/careers/community-manager">Community Manager</a>
    </section>
  `

  assert.match(
    detectPublicJobsSurface(sameOriginJobsHtml) || '',
    /listing copy|https:\/\/trell\.co\/careers\/community-manager/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => sameOriginJobsHtml,
    }),
    /public jobs surface changed materially/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <iframe src="https://jobs.ashbyhq.com/trell"></iframe>
      `,
    }),
    /public jobs surface changed materially/i,
  )
})

test('Trell rejects when JobPosting markup appears on the verified page', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Creator Partnerships Lead"}
        </script>
      `,
    }),
    /public jobs surface changed materially/i,
  )
})
