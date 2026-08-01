import assert from 'node:assert/strict'
import test from 'node:test'

const sporjoModule = await import('../../scraper/sporjo/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  createSporjoScraper,
  run,
} = sporjoModule

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <h1>Sporjo</h1>
        <p>Build teams and careers across the sports industry.</p>
        <a href="/contact">Contact</a>
      </main>
    </body>
  </html>
`

test('Sporjo exact-name sentinel stays fail-closed on the verified public company surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'sporjo')
  assert.equal(COMPANY, 'Sporjo')
  assert.equal(CAREERS_URL, 'https://www.sporjo.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed-sentinel')
  assert.equal(typeof createSporjoScraper, 'function')
})

test('Sporjo rejects when the verified exact-name public surface disappears', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Explore opportunities with us.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified exact-name public surface/i,
  )
})

test('Sporjo rejects when public JobPosting markup appears on the verified surface', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Sports Partnerships Lead"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})

test('Sporjo rejects when the public company surface starts exposing a trusted ATS board', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <iframe src="https://jobs.ashbyhq.com/sporjo"></iframe>
      `,
    }),
    /public listings surface/i,
  )
})
