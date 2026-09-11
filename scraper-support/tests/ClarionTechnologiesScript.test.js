import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html><head><title>Careers | Clarion Technologies</title></head>
<body>
  <p>Permanent Work From Home Opportunity</p>
  <iframe src="https://jobs.clariontechnologies.co.in:444/featured-job"></iframe>
</body></html>
`

const featuredHtml = `
<!doctype html>
<html><head><title>Careers | Clarion Technologies</title></head><body>
  <h1>Featured Jobs</h1>
  <a href="https://www.clariontech.com/open-position-detail?jobid=2674">SQL Database Developer</a>
  <a href="https://www.clariontech.com/open-position-detail?jobid=2674">Apply Now</a>
  <a href="https://www.clariontech.com/open-positions">View All Openings</a>
</body></html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/clariontechnologies/script.js')
  } catch {
    assert.fail('Expected Clarion Technologies scraper module at ../../scraper/clariontechnologies/script.js')
  }
}

test('Clarion Technologies validators stay pinned to the verified featured-jobs handoff from Friday, July 17, 2026', async () => {
  const clarion = await loadModule()
  assert.equal(clarion.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(clarion.hasFeaturedJobsSignal(featuredHtml), true)
  assert.equal(clarion.VERIFIED_ON, '2026-08-07')
})

test('Clarion Technologies default fetch page keeps verified TLS and scraper headers for the iframe host', async () => {
  const clarion = await loadModule()
  let capturedUrl = null
  let capturedOptions = null

  await clarion.defaultFetchPage(clarion.FEATURED_JOBS_URL, {
    fetchPageImpl: async (url, options) => {
      capturedUrl = url
      capturedOptions = options
      return { status: 200, url, html: featuredHtml }
    },
  })

  assert.equal(capturedUrl, clarion.FEATURED_JOBS_URL)
  assert.equal(Object.hasOwn(capturedOptions, 'allowInsecureTlsHosts'), false)
  assert.equal(capturedOptions.label, 'clariontechnologies')
  assert.match(capturedOptions.headers['User-Agent'], /Mozilla\/5\.0/)
})

test('Clarion Technologies run validates the verified page and iframe surface and stays fail-closed', async () => {
  const clarion = await loadModule()
  const jobs = await clarion.createClarionTechnologiesScraper().run({
    fetchText: async (url) => (url === clarion.CAREERS_URL ? careersHtml : featuredHtml),
  })

  assert.deepEqual(jobs, [])
})
