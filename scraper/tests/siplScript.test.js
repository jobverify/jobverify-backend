import assert from 'node:assert/strict'
import test from 'node:test'

const loadSIPLModule = async () => {
  try {
    return await import('../sipl/script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <html>
    <head>
      <title>SIPL - SIPL Pvt Ltd</title>
      <meta name="description" content="SIPL Pvt Ltd is an established and reputed firm in the Sustainable domain since 2008. We provide consultancy services like LCA/EPD/GHG/CFP." />
    </head>
    <body>
      <h1>SIPL Pvt Ltd</h1>
      <p>Sustainable domain consultancy since 2008.</p>
    </body>
  </html>
`

const contactHtml = `
  <html>
    <head>
      <title>Contact Us - SIPL Pvt Ltd</title>
      <meta property="og:description" content="Office Address: SIPL Pvt. Ltd., Noida, India +91 9911921666 support@siplsustainability.onmicrosoft.com" />
    </head>
    <body>
      <h1>Contact Us</h1>
      <p>support@siplsustainability.onmicrosoft.com</p>
    </body>
  </html>
`

test('official site and contact signals are present while public careers routes are absent', async () => {
  const sipl = await loadSIPLModule()
  assert.ok(sipl)

  assert.equal(sipl.hasOfficialSiteSignal(homepageHtml), true)
  assert.equal(sipl.hasContactSignal(contactHtml), true)
  assert.equal(sipl.hasCareersSignal(homepageHtml), false)
})

test('run returns no jobs when SIPL only exposes company and contact pages publicly', async () => {
  const sipl = await loadSIPLModule()
  assert.ok(sipl)

  const requestedUrls = []
  const jobs = await sipl.createSIPLScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === sipl.CAREER_PAGE_URL) {
        return homepageHtml
      }

      if (url === sipl.CONTACT_PAGE_URL) {
        return contactHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.sipl-sustainability.com/',
    'https://www.sipl-sustainability.com/contact-us/',
  ])
  assert.deepEqual(jobs, [])
})
