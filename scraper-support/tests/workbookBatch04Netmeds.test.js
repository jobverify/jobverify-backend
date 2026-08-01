import assert from 'node:assert/strict'
import test from 'node:test'

const netmedsModule = await import('../../scraper/netmeds/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createNetmedsScraper,
  hasVerifiedCompanySurface,
  run,
} = netmedsModule

const VERIFIED_COMPANY_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Netmeds.com: Indian Online Pharmacy | Buy Medicines Online</title>
      <link rel="canonical" href="https://www.netmeds.com/" />
      <meta property="og:site_name" content="Netmeds.com" />
      <meta property="og:url" content="https://www.netmeds.com/" />
    </head>
    <body>
      <main>
        <h1>Netmeds.com</h1>
        <p>India's most trusted online pharmacy.</p>
        <a href="/customer-care">Customer Care</a>
      </main>
    </body>
  </html>
`

test('Netmeds stays fail-closed on the verified exact-name public company surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_COMPANY_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'netmeds')
  assert.equal(COMPANY, 'Netmeds')
  assert.equal(CAREERS_URL, 'https://www.netmeds.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-company-surface')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.equal(typeof createNetmedsScraper, 'function')
  assert.equal(hasVerifiedCompanySurface(VERIFIED_COMPANY_SURFACE_HTML), true)
})

test('Netmeds rejects when the verified exact-name public company surface disappears', async () => {
  assert.equal(
    hasVerifiedCompanySurface(`
      <html>
        <head><title>Example Store</title></head>
        <body><h1>Example</h1></body>
      </html>
    `),
    false,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <head><title>Example Store</title></head>
          <body><h1>Example</h1></body>
        </html>
      `,
    }),
    /verified public company surface/i,
  )
})

test('Netmeds rejects when the public company surface starts exposing a first-party jobs route', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <section>
          <h2>Current Openings</h2>
          <a href="/careers/pharmacist">Pharmacist</a>
        </section>
      `,
    }),
    /public jobs surface changed materially/i,
  )
})

test('Netmeds rejects when the public company surface starts exposing trusted ATS signals or JobPosting markup', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <iframe src="https://jobs.ashbyhq.com/netmeds"></iframe>
      `,
    }),
    /public jobs surface changed materially/i,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_COMPANY_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Supply Chain Analyst"}
        </script>
      `,
    }),
    /public jobs surface changed materially/i,
  )
})
