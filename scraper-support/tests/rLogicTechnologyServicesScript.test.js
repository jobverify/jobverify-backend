import assert from 'node:assert/strict'
import test from 'node:test'

const careersCultureHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers &amp; Culture - R-Logic</title>
  </head>
  <body>
    <h5>Join Our Team</h5>
    <h2>Build What Matters. Create What's Next.</h2>
    <a class="elementor-button elementor-button-link elementor-size-sm" href="https://www.r-logic.com/contact-us/">
      <span class="elementor-button-text">Get Started</span>
    </a>
    <p>Employee Stories</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/rlogictechnologyservices/script.js')
  } catch {
    assert.fail('Expected R-Logic Technology Services scraper module at ../../scraper/rlogictechnologyservices/script.js')
  }
}

test('R-Logic Technology Services validates the first-party careers-culture contact handoff surface', async () => {
  const rlogic = await loadModule()

  assert.equal(rlogic.SOURCE, 'rlogictechnologyservices')
  assert.equal(rlogic.COMPANY, 'R-Logic Technology Services')
  assert.equal(rlogic.CAREERS_CULTURE_URL, 'https://www.r-logic.com/careers-culture/')
  assert.equal(rlogic.CONTACT_URL, 'https://www.r-logic.com/contact-us/')
  assert.equal(rlogic.VERIFIED_ON, '2026-07-18')
  assert.equal(rlogic.hasOfficialCareersCultureSignal(careersCultureHtml), true)
})

test('R-Logic Technology Services returns no jobs when the verified page only hands candidates to contact-us', async () => {
  const rlogic = await loadModule()

  const jobs = await rlogic.createRLogicTechnologyServicesScraper().run({
    fetchText: async () => careersCultureHtml,
  })

  assert.deepEqual(jobs, [])
})

test('R-Logic Technology Services fails closed if the page starts exposing direct openings', async () => {
  const rlogic = await loadModule()

  await assert.rejects(
    rlogic.createRLogicTechnologyServicesScraper().run({
      fetchText: async () =>
        `${careersCultureHtml}<a href="https://www.r-logic.com/careers-culture/senior-engineer">Apply Now</a>`,
    }),
    /public jobs surface/i,
  )
})
