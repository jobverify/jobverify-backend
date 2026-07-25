import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  createElecbitsScraper,
  extractPublicListings,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <a href="https://elecbits.in/careers/">Careers</a>
      <footer>Azoox Technologies Private Limited</footer>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <section class="role-card">
        <h3>Senior Hardware Engineer</h3>
        <a href="/wp-content/uploads/2025/12/JD-Senior-Hardware-Designer.pdf">Download JD</a>
      </section>
      <section class="role-card">
        <h3>SDE II</h3>
        <a href="/wp-content/uploads/2025/12/EB_SDE-II.pdf">Download JD</a>
      </section>
      <section class="role-card">
        <h3>Product Manager</h3>
        <a href="/wp-content/uploads/2025/12/EB_Product-Manager.pdf">Download JD</a>
      </section>
    </body>
  </html>
`

test('extractPublicListings parses the verified Elecbits career cards and JD links', () => {
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)

  const jobs = extractPublicListings(careersHtml)
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
    })),
    [
      {
        title: 'Senior Hardware Engineer',
        sourceUrl: 'https://elecbits.in/wp-content/uploads/2025/12/JD-Senior-Hardware-Designer.pdf',
        applyUrl: null,
      },
      {
        title: 'SDE II',
        sourceUrl: 'https://elecbits.in/wp-content/uploads/2025/12/EB_SDE-II.pdf',
        applyUrl: null,
      },
      {
        title: 'Product Manager',
        sourceUrl: 'https://elecbits.in/wp-content/uploads/2025/12/EB_Product-Manager.pdf',
        applyUrl: null,
      },
    ],
  )
})

test('scraper run fetches the official homepage and careers page and returns normalized jobs', async () => {
  const requestedUrls = []
  const scraper = createElecbitsScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].company, 'Elecbits')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].source, 'elecbits')
  assert.equal(jobs[0].link, 'https://elecbits.in/wp-content/uploads/2025/12/JD-Senior-Hardware-Designer.pdf')
  assert.ok(jobs[0].scrapedAt)
})

test('fails closed when the Elecbits homepage signal changes', async () => {
  await assert.rejects(
    createElecbitsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return '<html><body>No careers link</body></html>'
        return careersHtml
      },
    }),
    /Elecbits homepage no longer matches the verified official public site/i,
  )
})

test('fails closed when the Elecbits careers surface changes', async () => {
  await assert.rejects(
    createElecbitsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === CAREERS_URL) return '<html><body>No JD links</body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /Elecbits careers page no longer matches the verified official public jobs surface/i,
  )
})
