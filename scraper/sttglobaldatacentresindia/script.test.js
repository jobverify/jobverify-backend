import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <a href="https://www.sttelemediagdc.com/contact">Contact</a>
        <a href="https://www.sttelemediagdc.com/in-en/about-us/careers">Careers</a>
        <h1>STT GDC India Inaugurates Rajasthan's First AI-Ready Data Centre</h1>
        <p>At the Core of Highly secure</p>
        <p>Accelerate the growth of your business</p>
        <p>10 Data centres in India</p>
      </main>
    </body>
  </html>
`

const aboutHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <h2>The foundation of a smarter, more sustainable digital future</h2>
        <p>As one of the world's fastest-growing data centre providers, ST Telemedia Global Data Centres' purpose is to power a sustainable digital future.</p>
        <p>All our operations come together on the shared goal of enabling technological advancement through innovation to offer scalable and secure, world-class data centre solutions and services.</p>
        <p>STT GDC commenced operations</p>
      </main>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <h2>Shape a better digital world</h2>
        <p>If you are looking to grow your career while shaping a better digital world, we want to hear from you.</p>
        <p>For job enquiries and applications, please write to us below.</p>
        <p>STT Global Data Centres India Private Limited C/o Tata Communications Ltd., Tower B, 5th Floor, Plot No. C 21 &amp; C36, G Block, Bandra Kurla Complex, Vidyanagari Post, Bandra East, Mumbai - 400098</p>
        <p>contact@sttelemediagdc.in (HQ): +91-22-68192192</p>
        <p>Services</p>
        <p>Colocation</p>
        <p>Connectivity</p>
        <p>Support Services</p>
      </main>
    </body>
  </html>
`

const contactHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <h1>Contact Us</h1>
        <p>Let us know how we can help you</p>
        <h2>How Can We Help You?</h2>
        <p>ST Telemedia Global Data Centres</p>
      </main>
    </body>
  </html>
`

test('STT sentinel validates the verified India homepage, about page, careers page, and contact page with an email-only careers handoff', async () => {
  const stt = await loadModule()
  assert.ok(stt, 'STT scraper module should load')

  assert.equal(stt.SOURCE, 'sttglobaldatacentresindia')
  assert.equal(stt.COMPANY, 'STT Global Data Centres India Private Limited')
  assert.equal(stt.HOMEPAGE_URL, 'https://www.sttelemediagdc.com/in-en')
  assert.equal(stt.ABOUT_URL, 'https://www.sttelemediagdc.com/in-en/about-us/the-company')
  assert.equal(stt.CAREERS_URL, 'https://www.sttelemediagdc.com/in-en/about-us/careers')
  assert.equal(stt.CONTACT_URL, 'https://www.sttelemediagdc.com/contact')
  assert.equal(stt.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(stt.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(stt.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(stt.hasOfficialContactSignal(contactHtml), true)
  assert.equal(stt.extractEmailApplyHandoff(careersHtml), 'contact@sttelemediagdc.in')
  assert.equal(stt.hasPublicJobListingSignal(careersHtml), false)
})

test('STT run returns an empty list while the verified India careers page exposes only the email-based application handoff', async () => {
  const stt = await loadModule()
  assert.ok(stt, 'STT scraper module should load')

  const requestedUrls = []
  const jobs = await stt.createSttGlobalDataCentresIndiaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === stt.HOMEPAGE_URL) return homepageHtml
      if (url === stt.ABOUT_URL) return aboutHtml
      if (url === stt.CAREERS_URL) return careersHtml
      if (url === stt.CONTACT_URL) return contactHtml
      throw new Error(`Unexpected STT URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.sttelemediagdc.com/in-en',
    'https://www.sttelemediagdc.com/in-en/about-us/the-company',
    'https://www.sttelemediagdc.com/in-en/about-us/careers',
    'https://www.sttelemediagdc.com/contact',
  ])
  assert.deepEqual(jobs, [])
})

test('STT fails closed when the trusted pages change materially or public job records appear', async () => {
  const stt = await loadModule()
  assert.ok(stt, 'STT scraper module should load')

  await assert.rejects(
    stt.createSttGlobalDataCentresIndiaScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected homepage</h1></body></html>',
    }),
    /verified india homepage/i,
  )

  await assert.rejects(
    stt.createSttGlobalDataCentresIndiaScraper().run({
      fetchText: async (url) => {
        if (url === stt.HOMEPAGE_URL) return homepageHtml
        if (url === stt.ABOUT_URL) return aboutHtml
        if (url === stt.CONTACT_URL) return contactHtml
        return careersHtml.replace(
          '</main>',
          '<script type="application/ld+json">{"@type":"JobPosting"}</script></main>',
        )
      },
    }),
    /now appears to expose public job records/i,
  )
})
