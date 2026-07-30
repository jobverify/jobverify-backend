import assert from 'node:assert/strict'
import test from 'node:test'

const suprDailyModule = await import('../workbookbatch05/suprdaily.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  VERIFIED_BRAND_COPY,
  createSuprDailyScraper,
  run,
} = suprDailyModule

const VERIFIED_PUBLIC_SURFACE_HTML = `
  <html>
    <head>
      <title>Supr Daily by Swiggy</title>
      <meta property="og:site_name" content="Supr Daily by Swiggy" />
    </head>
    <body>
      <main>
        <h1>Supr Daily by Swiggy</h1>
        <p>Daily essentials delivered to your doorstep.</p>
        <a href="/about-us">About us</a>
      </main>
    </body>
  </html>
`

test('Supr Daily validates the verified exact-name public company surface and stays fail-closed', async () => {
  assert.equal(typeof run, 'function', 'Expected Supr Daily workbook batch-05 module.')

  let requestedUrl = null
  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_PUBLIC_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'suprdaily')
  assert.equal(COMPANY, 'Supr Daily')
  assert.equal(CAREERS_URL, 'https://www.suprdaily.com/')
  assert.equal(VERIFIED_BRAND_COPY, 'Supr Daily by Swiggy')
  assert.equal(DISPOSITION, 'verified-exact-name-public-company-surface')
  assert.equal(typeof createSuprDailyScraper, 'function')
})

test('Supr Daily throws when the verified exact-name brand copy disappears', async () => {
  assert.equal(
    typeof createSuprDailyScraper,
    'function',
    'Expected Supr Daily workbook batch-05 module.',
  )

  await assert.rejects(
    createSuprDailyScraper().run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Swiggy Instamart</h1>
              <p>Daily essentials delivered to your doorstep.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified exact-name public company surface changed/i,
  )
})

test('Supr Daily throws when a trustworthy public jobs surface appears', async () => {
  assert.equal(typeof run, 'function', 'Expected Supr Daily workbook batch-05 module.')

  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_PUBLIC_SURFACE_HTML}
        <section>
          <a href="/careers/software-engineer">Software Engineer</a>
        </section>
      `,
    }),
    /trustworthy public jobs surface/i,
  )
})

test('Supr Daily throws when public JobPosting markup appears on the exact-name surface', async () => {
  assert.equal(typeof run, 'function', 'Expected Supr Daily workbook batch-05 module.')

  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_PUBLIC_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Operations Associate"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})
