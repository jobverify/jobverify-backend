import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <head>
    <title>Careers at SmartQ</title>
  </head>
  <body>
    <h1>Great food experiences start with great people.</h1>
    <a href="https://careers.thesmartq.com">Explore Opportunities</a>
    <p>Great food experiences start with great people.</p>
    <p>Bottle Lab Technologies Pvt Ltd</p>
    <p>Grow with us.</p>
  </body>
</html>
`

const structuredBoardHtml = `
<!doctype html>
<html>
  <body>
    <a href="https://careers.thesmartq.com/jobs/software-engineer">Software Engineer</a>
    <a href="https://careers.thesmartq.com/jobs/product-manager">Product Manager</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../smartqbottlelabtechnologies/script.js')
  } catch {
    assert.fail('Expected SmartQ - Bottle Lab Technologies scraper module at ../smartqbottlelabtechnologies/script.js')
  }
}

test('SmartQ - Bottle Lab Technologies returns [] only while the verified careers shell remains a board handoff', async () => {
  const smartQ = await loadModule()

  assert.equal(smartQ.hasVerifiedCareersShellSignal(careersHtml), true)
  assert.equal(smartQ.pageExposesStructuredJobListings(careersHtml), false)

  const jobs = await smartQ.createSmartQBottleLabTechnologiesScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})

test('SmartQ - Bottle Lab Technologies fails closed when structured public jobs appear on the careers shell', async () => {
  const smartQ = await loadModule()

  await assert.rejects(
    smartQ.createSmartQBottleLabTechnologiesScraper().run({
      fetchText: async () => structuredBoardHtml,
    }),
    /structured public job listings/i,
  )
})

test('SmartQ - Bottle Lab Technologies fails closed when the verified careers shell identity drifts', async () => {
  const smartQ = await loadModule()

  await assert.rejects(
    smartQ.createSmartQBottleLabTechnologiesScraper().run({
      fetchText: async () => '<html><body>Unknown</body></html>',
    }),
    /official careers shell changed/i,
  )
})
