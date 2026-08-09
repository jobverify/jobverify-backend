import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers at Adani Group: Explore Job Opportunities and Vacancies</title>
      <link rel="canonical" href="https://www.adani.com/careers" />
    </head>
    <body>
      <header><a href="/careers">Careers</a></header>
      <main>
        <h1>Careers at Adani Group</h1>
        <h2>Current Openings</h2>
        <a href="https://www.adani.com/opportunity/#en/sites/CX_2027/requisitions">View Openings</a>
      </main>
      <footer>Adani Group</footer>
    </body>
  </html>
`

test('Adani Group validates its official careers surface before returning no unverified listings', async () => {
  const adani = await import('../../scraper/adani/script.js')
  const requestedUrls = []

  assert.equal(adani.hasOfficialCareersSignal(officialCareersHtml), true)

  const jobs = await adani.createAdaniScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [adani.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Adani Group fails closed when the official careers surface changes', async () => {
  const adani = await import('../../scraper/adani/script.js')

  await assert.rejects(
    adani.createAdaniScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
    }),
    /Adani Group official careers surface changed/i,
  )
})
