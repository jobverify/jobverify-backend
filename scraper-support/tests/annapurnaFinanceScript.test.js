import assert from 'node:assert/strict'
import test from 'node:test'

const loadAnnapurnaModule = async () => {
  try {
    return await import('../../scraper/annapurnafinance/script.js')
  } catch {
    assert.fail('Expected Annapurna Finance scraper module at ../../scraper/annapurnafinance/script.js')
  }
}

const homepageHtml = `
  <html>
    <head><title>Annapurna Finance Pvt. Ltd.</title></head>
    <body>
      <h1>Annapurna Finance Pvt. Ltd.</h1>
      <p>Annapurna Finance does not authorize any mobile application or digital platform to represent its loan services except A-Pay.</p>
      <a href="/about-us/our-journey">Our Journey</a>
      <a href="/product-and-services">Product &amp; Services</a>
      <a href="/contact-us">Contact Us</a>
    </body>
  </html>
`

const missingRouteHtml = `
  <html>
    <head><title>404 | Annapurna Finance Pvt. Ltd.</title></head>
    <body>
      <h1>404</h1>
      <p>Annapurna Finance does not authorize any mobile application or digital platform to represent its loan services except A-Pay.</p>
      <a href="/about-us/our-journey">Our Journey</a>
      <a href="/product-and-services">Product &amp; Services</a>
    </body>
  </html>
`

test('Annapurna Finance scraper targets the verified homepage and missing public careers routes', async () => {
  const annapurna = await loadAnnapurnaModule()

  assert.equal(annapurna.HOMEPAGE_URL, 'https://annapurnafinance.in/')
  assert.deepEqual(annapurna.CAREER_ROUTE_URLS, [
    'https://annapurnafinance.in/career-openings/',
    'https://annapurnafinance.in/careers/',
    'https://annapurnafinance.in/jobs/',
  ])
  assert.equal(annapurna.hasOfficialHomepageSurface(homepageHtml), true)
  assert.equal(annapurna.isMissingCareerRoute({ status: 404, url: annapurna.CAREER_ROUTE_URLS[0], html: missingRouteHtml }), true)
})

test('Annapurna Finance run returns no jobs when public careers routes are verified missing', async () => {
  const annapurna = await loadAnnapurnaModule()
  const requestedUrls = []

  const jobs = await annapurna.createAnnapurnaFinanceScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === annapurna.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (annapurna.CAREER_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected Annapurna URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    annapurna.HOMEPAGE_URL,
    ...annapurna.CAREER_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Annapurna Finance run fails closed when homepage or missing public careers routes change', async () => {
  const annapurna = await loadAnnapurnaModule()

  await assert.rejects(
    annapurna.createAnnapurnaFinanceScraper().run({
      fetchPage: async (url) => {
        if (url === annapurna.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }

        throw new Error(`Unexpected Annapurna URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    annapurna.createAnnapurnaFinanceScraper().run({
      fetchPage: async (url) => {
        if (url === annapurna.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (annapurna.CAREER_ROUTE_URLS.includes(url)) {
          return { status: 200, url, html: '<html><body><h1>Current Openings</h1><a href="/apply">Apply now</a></body></html>' }
        }

        throw new Error(`Unexpected Annapurna URL: ${url}`)
      },
    }),
    /career route changed materially or now exposes public jobs/i,
  )
})
