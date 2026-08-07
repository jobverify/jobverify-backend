import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CONTACT_URL,
  HOMEPAGE_URL,
  createLakshmiElectricalControlSystemsScraper,
  hasOfficialContactSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const HOMEPAGE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Control Panel Manufacturers | Smart meter Manufacturers - LECS Ltd</title>
</head>
<body>
  <h1>Lakshmi Electrical Control Systems Limited (LECS)</h1>
  <section>Control Panels</section>
  <section>Engineering Plastic Components</section>
  <section>Smart Meters</section>
  <section>Industries We Serve</section>
  <section>Factory Address Lakshmi Electrical Control Systems Limited</section>
  <section>Arasur, Coimbatore - 641 407 Tamilnadu, India</section>
  <section>info@lecsindia.com</section>
</body>
</html>`

const CONTACT_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Circuit breaker Manufacturers | Plastic parts Manufacturers - Contact Us</title>
</head>
<body>
  <h1>Contact Us</h1>
  <section>Get in touch</section>
  <section>Factory Address</section>
  <section>Arasur, Coimbatore - 641 407 Tamilnadu, India</section>
  <section>Phone: +91-422-6616500</section>
  <section>info@lecsindia.com</section>
</body>
</html>`

test('Lakshmi Electrical Control Systems verifies the official homepage and contact shells', () => {
  assert.equal(hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(hasOfficialContactSignal(CONTACT_HTML), true)
})

test('Lakshmi Electrical Control Systems falls back to browser fetch on timeout errors', async () => {
  const requestedByBrowser = []

  const scraper = createLakshmiElectricalControlSystemsScraper()
  const jobs = await scraper.run({
    fetchText: async () => {
      throw new Error('The operation was aborted due to timeout')
    },
    fetchBrowserText: async (url) => {
      requestedByBrowser.push(url)
      if (url === HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === CONTACT_URL) return CONTACT_HTML
      throw new Error(`Unexpected browser fetch for ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
  assert.deepEqual(requestedByBrowser, [HOMEPAGE_URL, CONTACT_URL])
})
