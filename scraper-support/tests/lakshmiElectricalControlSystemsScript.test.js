import assert from 'node:assert/strict'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'lakshmielectricalcontrolsystems')

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const contactHtml = readFixture('contact-us.html')
const currentContactHtml = `
  <html>
    <head>
      <title>Circuit breaker Manufacturers | Plastic parts Manufacturers - Contact Us</title>
    </head>
    <body>
      <main>
        <h1>Contact Us</h1>
      </main>
      <footer>
        <h2>Get In Touch</h2>
        <div class="address-box">
          <span>Factory Address</span>
          Lakshmi Electrical Control Systems Limited<br>
          Arasur, Coimbatore - 641 407 Tamilnadu, India
        </div>
        <ul class="c-details">
          <li>Phone: <a href="tel:+91-422-6616500">+91-422-6616500</a></li>
          <li><a href="mailto:info@lecsindia.com">info@lecsindia.com</a></li>
        </ul>
      </footer>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/lakshmielectricalcontrolsystems/script.js')
  } catch {
    assert.fail(
      'Expected Lakshmi Electrical Control Systems scraper module at ../../scraper/lakshmielectricalcontrolsystems/script.js',
    )
  }
}

test('Lakshmi Electrical Control Systems recognizes the verified official homepage and contact zero-job surfaces', async () => {
  const lecs = await loadModule()

  assert.equal(lecs.SOURCE, 'lakshmielectricalcontrolsystems')
  assert.equal(lecs.COMPANY, 'Lakshmi Electrical Control Systems')
  assert.equal(lecs.HOMEPAGE_URL, 'https://www.lecsindia.com/')
  assert.equal(lecs.CONTACT_URL, 'https://www.lecsindia.com/contact-us/')

  assert.equal(lecs.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(lecs.hasOfficialContactSignal(contactHtml), true)
  assert.equal(lecs.hasOfficialContactSignal(currentContactHtml), true)
  assert.equal(lecs.hasFirstPartyCareerLikeLink(homepageHtml), false)
  assert.equal(lecs.hasFirstPartyCareerLikeLink(contactHtml), false)
  assert.equal(lecs.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(lecs.hasPublicJobsSignal(contactHtml), false)
})

test('Lakshmi Electrical Control Systems returns no jobs while the verified first-party public surface exposes no careers or jobs path', async () => {
  const lecs = await loadModule()
  const requestedUrls = []

  const jobs = await lecs.createLakshmiElectricalControlSystemsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === lecs.HOMEPAGE_URL) return homepageHtml
      if (url === lecs.CONTACT_URL) return contactHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    lecs.HOMEPAGE_URL,
    lecs.CONTACT_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Lakshmi Electrical Control Systems falls back to a slower verified-page fetch when the first-party site times out', async () => {
  const lecs = await loadModule()
  const primaryRequests = []
  const slowRequests = []

  const jobs = await lecs.createLakshmiElectricalControlSystemsScraper().run({
    fetchText: async (url) => {
      primaryRequests.push(url)
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    },
    fetchTextWithExtendedTimeout: async (url) => {
      slowRequests.push(url)

      if (url === lecs.HOMEPAGE_URL) return homepageHtml
      if (url === lecs.CONTACT_URL) return contactHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(primaryRequests, [
    lecs.HOMEPAGE_URL,
    lecs.CONTACT_URL,
  ])
  assert.deepEqual(slowRequests, primaryRequests)
  assert.deepEqual(jobs, [])
})

test('Lakshmi Electrical Control Systems fails closed when the verified zero-job public surface drifts', async () => {
  const lecs = await loadModule()

  await assert.rejects(
    lecs.createLakshmiElectricalControlSystemsScraper().run({
      fetchText: async (url) => {
        if (url === lecs.HOMEPAGE_URL) {
          return '<html><body><h1>Placeholder</h1></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    lecs.createLakshmiElectricalControlSystemsScraper().run({
      fetchText: async (url) => {
        if (url === lecs.HOMEPAGE_URL) return homepageHtml
        if (url === lecs.CONTACT_URL) {
          return contactHtml.replace(
            '</main>',
            '<p><a href="/careers/">Careers</a></p></main>',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /contact surface now exposes a first-party careers or jobs path/i,
  )

  await assert.rejects(
    lecs.createLakshmiElectricalControlSystemsScraper().run({
      fetchText: async (url) => {
        if (url === lecs.HOMEPAGE_URL) return homepageHtml
        if (url === lecs.CONTACT_URL) {
          return contactHtml.replace(
            '</main>',
            '<section><h2>Current Openings</h2><a href="/jobs/design-engineer">Apply now</a></section></main>',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /contact surface now exposes public jobs/i,
  )
})
