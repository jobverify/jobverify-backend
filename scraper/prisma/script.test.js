import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PAGE_URL,
  COMPANY,
  SOURCE,
  createPrismaScraper,
  hasOfficialCareersPageSignal,
  hasZeroOpenRolesSignal,
} from './script.js'

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers | Prisma</title>
      <link rel="canonical" href="https://www.prisma.io/careers" />
    </head>
    <body>
      <main>
        <h1>Join Prisma</h1>
        <p>Help us empower developers to build data-driven applications.</p>
        <section>
          <h2>Why Prisma?</h2>
          <p>Prisma is building the data access layer for modern applications.</p>
        </section>
        <section>
          <h2>Flexible remote organization</h2>
          <p>Our team is globally distributed and everyone can work from any location within the UTC -5 to UTC +3 timezones.</p>
        </section>
        <a href="#open-positions">View open positions</a>
        <h2>Open roles</h2>
        <label>Filter by department</label>
        <div>All</div>
        <div>0</div>
        <h5>Subscribe to our newsletter</h5>
      </main>
    </body>
  </html>
`

test('detects the verified Prisma careers surface and its zero-open-roles marker', () => {
  assert.equal(SOURCE, 'prisma')
  assert.equal(COMPANY, 'Prisma')
  assert.equal(CAREERS_PAGE_URL, 'https://www.prisma.io/careers')
  assert.equal(hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(hasZeroOpenRolesSignal(careersHtml), true)
  assert.equal(hasOfficialCareersPageSignal('<html><body>Placeholder</body></html>'), false)
  assert.equal(hasZeroOpenRolesSignal('<html><body><h2>Open roles</h2><div>3</div></body></html>'), false)
})

test('run returns an empty list while Prisma publishes zero open roles on the first-party careers page', async () => {
  const requestedUrls = []
  const jobs = await createPrismaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('run fails closed when Prisma careers page changes or starts exposing public roles', async () => {
  await assert.rejects(
    createPrismaScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /Prisma careers page no longer matches the verified first-party surface/i,
  )

  await assert.rejects(
    createPrismaScraper().run({
      fetchText: async () => careersHtml.replace('<div>0</div>', '<div>4</div>'),
    }),
    /Prisma careers page changed and may now expose public roles/i,
  )
})
