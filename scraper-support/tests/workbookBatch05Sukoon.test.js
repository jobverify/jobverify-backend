import assert from 'node:assert/strict'
import test from 'node:test'

const sukoonModule = await import('../../scraper/sukoon/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  VERIFIED_SURFACE_CONTRACT,
  createSukoonScraper,
  run,
} = sukoonModule

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <h1>Sukoon</h1>
        <p>
          We are hiring thoughtful operators, clinicians, and builders for the
          next phase of Sukoon.
        </p>
        <p>
          Learn more about how Sukoon is building the future of mental health.
        </p>
      </main>
    </body>
  </html>
`

test('Sukoon keeps its verified exact-name company surface fail-closed', async () => {
  assert.equal(SOURCE, 'sukoon')
  assert.equal(COMPANY, 'Sukoon')
  assert.equal(CAREERS_URL, 'https://trysukoon.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-company-surface-with-hiring-signals')
  assert.match(
    VERIFIED_SURFACE_CONTRACT,
    /Saturday, July 25, 2026.*exact-name public Sukoon surface/i,
  )

  const scraper = createSukoonScraper()
  const jobs = await scraper.run({
    fetchHtml: async (url) => {
      assert.equal(url, CAREERS_URL)
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.deepEqual(jobs, [])
  assert.deepEqual(
    await run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML,
    }),
    [],
  )
})

test('Sukoon rejects surfaces that lose the exact company name', async () => {
  const scraper = createSukoonScraper()

  await assert.rejects(
    () =>
      scraper.run({
        fetchHtml: async () => `
          <html>
            <body>
              <main>
                <h1>Mental health insurance</h1>
                <p>We are hiring across functions.</p>
              </main>
            </body>
          </html>
        `,
      }),
    /exact-name Sukoon public surface/i,
  )
})

test('Sukoon rejects surfaces that lose the verified hiring signal', async () => {
  const scraper = createSukoonScraper()

  await assert.rejects(
    () =>
      scraper.run({
        fetchHtml: async () => `
          <html>
            <body>
              <main>
                <h1>Sukoon</h1>
                <p>Mental health insurance for India.</p>
              </main>
            </body>
          </html>
        `,
      }),
    /brand-associated hiring signals/i,
  )
})

test('Sukoon rejects when a first-party public listings surface appears', async () => {
  const scraper = createSukoonScraper()

  await assert.rejects(
    () =>
      scraper.run({
        fetchHtml: async () => `
          <html>
            <body>
              <main>
                <h1>Sukoon</h1>
                <p>We are hiring across functions.</p>
                <section>
                  <h2>Current Openings</h2>
                  <a href="/careers/founding-engineer">Founding Engineer</a>
                </section>
              </main>
            </body>
          </html>
        `,
      }),
    /first-party public job listings/i,
  )
})

test('Sukoon rejects when JobPosting markup appears on the verified surface', async () => {
  const scraper = createSukoonScraper()

  await assert.rejects(
    () =>
      scraper.run({
        fetchHtml: async () => `
          <html>
            <body>
              <main>
                <h1>Sukoon</h1>
                <p>We are hiring across functions.</p>
              </main>
              <script type="application/ld+json">
                {"@context":"https://schema.org","@type":"JobPosting","title":"Operations Lead"}
              </script>
            </body>
          </html>
        `,
      }),
    /JobPosting markup/i,
  )
})
