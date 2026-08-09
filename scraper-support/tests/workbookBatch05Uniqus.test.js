import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  CONTACT_EMAIL,
  DISPOSITION,
  SOURCE,
  VIEW_OPPORTUNITIES_CTA,
  createUniqusScraper,
  run,
} from '../../scraper/uniqus/script.js'

const VERIFIED_HANDOFF_HTML = `
  <html>
    <body>
      <section>
        <h2>Careers</h2>
        <p>
          Write to us at careers@uniqus.com to explore opportunities at Uniqus
          and elevate your professional journey.
        </p>
        <a href="https://jobs.example.com/uniqus">View Opportunities</a>
      </section>
    </body>
  </html>
`

test('Uniqus validates its verified email-handoff careers surface and stays fail-closed', async () => {
  let requestedUrl = null
  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_HANDOFF_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'uniqus')
  assert.equal(COMPANY, 'Uniqus')
  assert.equal(CONTACT_EMAIL, 'careers@uniqus.com')
  assert.equal(VIEW_OPPORTUNITIES_CTA, 'View Opportunities')
  assert.equal(DISPOSITION, 'verified-email-handoff-careers-surface')
})

test('Uniqus throws when the verified email handoff disappears', async () => {
  await assert.rejects(
    createUniqusScraper().run({
      fetchHtml: async () => `
        <html>
          <body>
            <h2>Careers</h2>
            <p>Explore opportunities at Uniqus.</p>
            <a href="https://jobs.example.com/uniqus">View Opportunities</a>
          </body>
        </html>
      `,
    }),
    /missing careers@uniqus\.com email handoff/i,
  )
})

test('Uniqus throws when a first-party opportunities surface appears', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <body>
            <h2>Careers</h2>
            <p>Write to us at careers@uniqus.com to explore opportunities at Uniqus.</p>
            <a href="/careers/opportunities">View Opportunities</a>
          </body>
        </html>
      `,
    }),
    /first-party opportunities page/i,
  )
})

test('Uniqus throws when public JobPosting markup appears on the official surface', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <body>
            <h2>Careers</h2>
            <p>Write to us at careers@uniqus.com to explore opportunities at Uniqus.</p>
            <a href="https://jobs.example.com/uniqus">View Opportunities</a>
            <script type="application/ld+json">
              {"@context":"https://schema.org","@type":"JobPosting","title":"Manager"}
            </script>
          </body>
        </html>
      `,
    }),
    /JobPosting markup/i,
  )
})
