import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  createAdvariskScraper,
  hasOfficialCareersSurface,
  pageExposesPublicJobListings,
} from '../advarisk/script.js'

const careersHtml = `
  <html>
    <head><title>Advarisk</title></head>
    <body class="advaMasterEntry-point">
      <header><img src="/AdavaRiskLogo.png" alt="AdvaRisk"></header>
      <main>
        <div>Careers at AdvaRisk</div>
        <div>Join our team today</div>
        <div>7 open positions</div>
        <button type="button">Search</button>
        <div>Be a part of AdvaRisk</div>
        <p>Send us your application here and we will let you know if we find a suitable job for you.</p>
      </main>
    </body>
  </html>
`

test('AdvaRisk validates its official careers surface before returning no unverified listings', async () => {
  assert.equal(CAREERS_URL, 'https://advarisk.com/careers/')
  assert.equal(hasOfficialCareersSurface(careersHtml), true)
  assert.equal(pageExposesPublicJobListings(careersHtml), false)

  const requestedUrls = []
  const jobs = await createAdvariskScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('AdvaRisk requires review when its official careers page adds public job cards', async () => {
  const publicListingHtml = `${careersHtml}
    <article class="job-card">
      <h2>Backend Engineer</h2>
      <a href="/careers/backend-engineer">Apply now</a>
    </article>`

  assert.equal(pageExposesPublicJobListings(publicListingHtml), true)

  await assert.rejects(
    createAdvariskScraper().run({
      fetchText: async () => publicListingHtml,
    }),
    /public job listings/i,
  )
})
