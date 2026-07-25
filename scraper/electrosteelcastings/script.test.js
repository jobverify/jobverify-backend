import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  EMPLOYMENT_FORM_URL,
  HOMEPAGE_URL,
  LIFE_AT_URL,
  createElectrosteelCastingsScraper,
  hasApplicationOnlyCareerSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Electrosteel Castings Limited</title>
    </head>
    <body>
      <nav>
        <a href="${LIFE_AT_URL}">Life @ Electrosteel</a>
        <a href="${CAREERS_URL}">Join us</a>
      </nav>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers Enquiry</title>
    </head>
    <body>
      <h1>Careers Enquiry</h1>
      <p>Step 1: Download Employment Form</p>
      <p>Step 2: Fill in your details</p>
      <p>Step 3: Upload Employment Form</p>
      <a href="${EMPLOYMENT_FORM_URL}">employment_form.pdf</a>
    </body>
  </html>
`

test('validates the official Electrosteel homepage and application-only careers enquiry page', async () => {
  const requestedUrls = []
  const scraper = createElectrosteelCastingsScraper()

  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasApplicationOnlyCareerSignal(careersHtml), true)

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('fails closed when the Electrosteel homepage signal changes', async () => {
  await assert.rejects(
    createElectrosteelCastingsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) {
          return '<html><body>No careers navigation</body></html>'
        }

        return careersHtml
      },
    }),
    /Electrosteel homepage no longer matches the verified official public site/i,
  )
})

test('fails closed when the Electrosteel careers enquiry page changes', async () => {
  await assert.rejects(
    createElectrosteelCastingsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === CAREERS_URL) return '<html><body>Open roles listed here</body></html>'

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /Electrosteel careers enquiry page no longer matches the verified official application-only surface/i,
  )
})
