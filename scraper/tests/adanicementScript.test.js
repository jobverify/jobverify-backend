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
        <a href="/businesses/materials/cement">Cement</a>
        <h2>Current Openings</h2>
        <a href="https://www.adani.com/opportunity/#en/sites/CX_2027/requisitions">View Openings</a>
      </main>
      <footer>Adani Group</footer>
    </body>
  </html>
`

test('Adani Cement validates the official careers surface before returning no unverified listings', async () => {
  const adaniCement = await import('../adanicement/script.js')
  const requestedUrls = []

  assert.equal(adaniCement.hasOfficialCareersSignal(officialCareersHtml), true)

  const jobs = await adaniCement.createAdaniCementScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [adaniCement.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Adani Cement fails closed when the official careers surface changes', async () => {
  const adaniCement = await import('../adanicement/script.js')

  await assert.rejects(
    adaniCement.createAdaniCementScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
    }),
    /Adani Cement official careers surface changed/i,
  )
})
