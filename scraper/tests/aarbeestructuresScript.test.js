import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
  <!doctype html>
  <html>
    <head><title>Careers - Aarbee Structures</title></head>
    <body>
      <header>Aarbee Structures Pvt. Ltd.</header>
      <main>
        <h1>Careers</h1>
        <h2>Aarbee Career</h2>
        <p>We are searching for great talent to join our team</p>
        <a href="https://docs.google.com/forms/d/e/example/viewform">Work with Us</a>
        <h4>Current Openings</h4>
        <img src="/wp-content/uploads/2025-jr-system-administrator.png" alt="2025 Jr System Administrator">
      </main>
      <footer>Aarbee Structures Pvt. Ltd.</footer>
    </body>
  </html>
`

test('Aarbee Structures validates its official image-only careers surface and returns no unverified jobs', async () => {
  const aarbee = await import('../aarbeestructures/script.js')
  const requestedUrls = []

  assert.equal(aarbee.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(aarbee.pageExposesStructuredJobListings(officialCareersHtml), false)

  const jobs = await aarbee.createAarbeeStructuresScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [aarbee.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Aarbee Structures scraper fails closed when the careers identity changes', async () => {
  const aarbee = await import('../aarbeestructures/script.js')

  await assert.rejects(
    aarbee.createAarbeeStructuresScraper().run({
      fetchText: async () => '<html><body>Unrelated site</body></html>',
    }),
    /official careers surface/i,
  )
})

test('Aarbee Structures scraper requires review when a structured job link appears', async () => {
  const aarbee = await import('../aarbeestructures/script.js')
  const listedJobsHtml = officialCareersHtml.replace(
    '</main>',
    '<article class="job-card"><h3>Junior System Administrator</h3><a href="/jobs/junior-system-administrator">Apply now</a></article></main>',
  )

  assert.equal(aarbee.pageExposesStructuredJobListings(listedJobsHtml), true)

  await assert.rejects(
    aarbee.createAarbeeStructuresScraper().run({
      fetchText: async () => listedJobsHtml,
    }),
    /structured public job listings/i,
  )
})
