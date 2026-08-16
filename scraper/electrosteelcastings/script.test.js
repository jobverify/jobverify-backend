import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  LEGACY_CAREERS_ENQUIRY_URL,
  LEGACY_LIFE_AT_URL,
  SOURCE,
  VERIFIED_ON,
  createElectrosteelCastingsScraper,
  hasBrandedMissingRouteSignal,
  hasCareerInfoOnlySignal,
  hasOfficialHomepageSignal,
} from './script.js'

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Home | Electrosteel Castings Limited</title>
    </head>
    <body>
      <p>MANUFACTURING EXCELLENCE.</p>
      <p>A proud make in india company With Global Outreach</p>
      <p>We are the largest manufacturer of Ductile Iron (DI) Pipes in the Indian sub-continent.</p>
    </body>
  </html>
`

const careerInfoHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Electrosteel</title>
    </head>
    <body>
      <h1>Build the Future with Electrosteel Castings Limited</h1>
      <h2>WHY JOIN ELECTROSTEEL</h2>
      <h2>OUR PROMISE</h2>
      <h2>Explore Opportunities at Electrosteel</h2>
      <h2>Khoj The Campus Drive</h2>
      <h3>Roles Offered Under Khoj</h3>
      <p>Final-year students pursuing B.Tech, MBA, CA, B.Sc., B.A., B.Com., and other relevant disciplines from recognised universities and institutes across India</p>
    </body>
  </html>
`

const missingRouteHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Electrosteel</title>
    </head>
    <body>
      <h1>404 / Page Not Found</h1>
      <p>THIS PAGE IS OFF THE GRID.</p>
      <p>Routing Status 404</p>
      <p>Destination unavailable.</p>
    </body>
  </html>
`

test('validates the Friday, August 14, 2026 Electrosteel homepage, careers hub, and branded legacy 404 routes', async () => {
  const requestedUrls = []
  const scraper = createElectrosteelCastingsScraper()

  assert.equal(SOURCE, 'electrosteelcastings')
  assert.equal(VERIFIED_ON, '2026-08-14')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasCareerInfoOnlySignal(careerInfoHtml), true)
  assert.equal(hasBrandedMissingRouteSignal(missingRouteHtml), true)

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careerInfoHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === LEGACY_CAREERS_ENQUIRY_URL || url === LEGACY_LIFE_AT_URL) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    CAREERS_URL,
    LEGACY_CAREERS_ENQUIRY_URL,
    LEGACY_LIFE_AT_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('fails closed when the Electrosteel homepage, careers hub, or legacy 404 routes drift', async () => {
  await assert.rejects(
    createElectrosteelCastingsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) {
          return '<html><body>No manufacturing overview</body></html>'
        }

        return careerInfoHtml
      },
    }),
    /Electrosteel homepage no longer matches the verified official public site/i,
  )

  await assert.rejects(
    createElectrosteelCastingsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === CAREERS_URL) return '<html><body>Apply now for open roles</body></html>'
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchPage: async (url) => ({ status: 404, url, html: missingRouteHtml }),
    }),
    /career information page no longer matches the verified official no-openings surface/i,
  )

  await assert.rejects(
    createElectrosteelCastingsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === CAREERS_URL) return careerInfoHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchPage: async (url) => {
        if (url === LEGACY_CAREERS_ENQUIRY_URL) {
          return { status: 200, url, html: '<html><body>Open roles listed here</body></html>' }
        }

        return { status: 404, url, html: missingRouteHtml }
      },
    }),
    /legacy careers routes no longer match the verified first-party missing-page surface/i,
  )
})
