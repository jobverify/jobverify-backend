import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <main>
    <h1>Careers</h1>
    <p>CIMCON Software is headquartered in Westford, MA, USA with offices in London, UK and Ahmedabad, India.</p>
    <h3>Current Openings</h3>
    <p>To apply for a position, send us your CV at hr@cimcon.com. Please indicate your area of interest in the email subject line.</p>
  </main>
`

test('CIMCON verifies its official email-only careers page and returns no unpublished openings', async () => {
  const cimcon = await import('../../scraper/cimcon/script.js')
  const requests = []

  assert.equal(cimcon.CAREERS_PAGE_URL, 'https://cimcon.com/about-us/careers/')
  assert.equal(cimcon.hasEmailOnlyOpenings(careersHtml), true)

  const jobs = await cimcon.createCimconScraper().run({
    fetchText: async (url) => {
      requests.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requests, [cimcon.CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})
