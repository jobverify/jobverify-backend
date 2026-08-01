import assert from 'node:assert/strict'
import test from 'node:test'

const stackboxModule = await import('../../scraper/stackbox/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createStackboxScraper,
  detectPublicJobsSurface,
  hasVerifiedCompanySurface,
  run,
} = stackboxModule

const VERIFIED_COMPANY_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Company | Stackbox</title>
      <link rel="canonical" href="https://www.stackbox.xyz/company" />
      <meta property="og:url" content="https://www.stackbox.xyz/company" />
    </head>
    <body>
      <main>
        <h1>Stackbox</h1>
        <section>
          <h2>Company</h2>
          <p>Stackbox powers warehousing and fulfillment operations for modern commerce.</p>
          <p>Learn more about the Stackbox company and platform on this exact-name public surface.</p>
        </section>
      </main>
    </body>
  </html>
`

test('Stackbox stays fail-closed on the verified exact-name public company surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_COMPANY_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'stackbox')
  assert.equal(COMPANY, 'Stackbox')
  assert.equal(CAREERS_URL, 'https://www.stackbox.xyz/company')
  assert.equal(DISPOSITION, 'verified-exact-name-public-company-surface')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.equal(typeof createStackboxScraper, 'function')
  assert.equal(hasVerifiedCompanySurface(VERIFIED_COMPANY_SURFACE_HTML), true)
  assert.equal(detectPublicJobsSurface(VERIFIED_COMPANY_SURFACE_HTML), null)
})

test('Stackbox rejects when the verified exact-name company surface disappears', async () => {
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
    /verified public company surface/i,
  )
})

test('Stackbox rejects when a trustworthy jobs surface appears on the exact-name page', async () => {
  const sameOriginJobsHtml = `
    ${VERIFIED_COMPANY_SURFACE_HTML}
    <section>
      <h2>Current Openings</h2>
      <a href="/careers/software-engineer">Software Engineer</a>
    </section>
  `

  assert.match(
    detectPublicJobsSurface(sameOriginJobsHtml) || '',
    /listing copy|https:\/\/www\.stackbox\.xyz\/careers\/software-engineer/i,
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
        <iframe src="https://boards.greenhouse.io/embed/job_board?for=stackbox"></iframe>
      `,
    }),
    /public jobs surface changed materially/i,
  )
})
