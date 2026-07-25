import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Smartstream | Financial Technology Jobs</title>
  </head>
  <body>
    <h1>Careers</h1>
    <p>Innovate. Grow. Lead the Future of Data Automation.</p>
    <p>Send us your CV to careers@smart.stream, and we'll reach out when a suitable opportunity arises.</p>
    <p>Apply Online. Browse roles &amp; submit your CV</p>
    <p>Jaipur Ruchi - Operational Manager</p>
    <h6>View All Roles</h6>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Smartstream | Financial Technology Jobs</title>
  </head>
  <body>
    <p>Innovate. Grow. Lead the Future of Data Automation.</p>
    <p>Send us your CV to careers@smart.stream, and we'll reach out when a suitable opportunity arises.</p>
    <p>Apply Online. Browse roles &amp; submit your CV</p>
    <p>View All Roles</p>
    <p>Job Title: Senior Engineer</p>
    <a href="https://jobs.smart.stream/apply/senior-engineer">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../smartstreamtechnologies/script.js')
  } catch {
    assert.fail('Expected SmartStream Technologies scraper module at ../smartstreamtechnologies/script.js')
  }
}

test('SmartStream Technologies helpers stay pinned to the verified email-only careers surface', async () => {
  const smartstream = await loadModule()

  assert.equal(smartstream.SOURCE, 'smartstreamtechnologies')
  assert.equal(smartstream.COMPANY, 'SmartStream Technologies')
  assert.equal(smartstream.CAREERS_URL, 'https://smart.stream/careers/')
  assert.equal(smartstream.CAREERS_EMAIL, 'careers@smart.stream')
  assert.equal(smartstream.hasOfficialCareersSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(smartstream.hasPublicJobsCatalogSignal(VERIFIED_CAREERS_HTML), false)
  assert.equal(smartstream.hasPublicJobsCatalogSignal(PUBLIC_JOBS_HTML), true)
})

test('SmartStream Technologies returns [] only while the verified careers page remains email-only', async () => {
  const smartstream = await loadModule()
  const jobs = await smartstream.createSmartStreamTechnologiesScraper().run({
    fetchText: async (url) => {
      assert.equal(url, smartstream.CAREERS_URL)
      return VERIFIED_CAREERS_HTML
    },
  })

  assert.deepEqual(jobs, [])
})

test('SmartStream Technologies fails closed when the verified careers page drifts or starts exposing public job listings', async () => {
  const smartstream = await loadModule()

  await assert.rejects(
    smartstream.createSmartStreamTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified SmartStream Technologies careers page/i,
  )

  await assert.rejects(
    smartstream.createSmartStreamTechnologiesScraper().run({
      fetchText: async () => PUBLIC_JOBS_HTML,
    }),
    /public jobs catalog/i,
  )
})
