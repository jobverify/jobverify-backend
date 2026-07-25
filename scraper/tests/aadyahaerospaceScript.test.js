import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
  <html>
    <head><title>AADYAH Aerospace | Careers</title></head>
    <body>
      <header>AADYAH Aerospace</header>
      <main>
        <h1>LIFE AT AADYAH</h1>
        <h2>WORK WITH US</h2>
        <p>Join us on our mission to revolutionize transportation.</p>
        <a href="https://www.linkedin.com/company/aadyah-aerospace-private-limited">VIEW ON LINKEDIN</a>
      </main>
    </body>
  </html>
`

test('Aadyah Aerospace validates its official careers surface before returning no unverified listings', async () => {
  const aadyah = await import('../aadyahaerospace/script.js')
  const requestedUrls = []

  assert.equal(aadyah.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(aadyah.pageExposesPublicJobListings(officialCareersHtml), false)

  const jobs = await aadyah.createAadyahAerospaceScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [aadyah.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Aadyah Aerospace scraper requires review when the official careers page adds public job cards', async () => {
  const aadyah = await import('../aadyahaerospace/script.js')
  const publicListingHtml = `${officialCareersHtml}<article class="job-card"><h2>Avionics Engineer</h2><a>Apply Now</a></article>`

  assert.equal(aadyah.pageExposesPublicJobListings(publicListingHtml), true)

  await assert.rejects(
    aadyah.createAadyahAerospaceScraper().run({
      fetchText: async () => publicListingHtml,
    }),
    /public job listings/i,
  )
})
