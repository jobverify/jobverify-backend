import assert from 'node:assert/strict'
import test from 'node:test'

const CONTACT_PAGE_HTML = `
<!doctype html>
<html>
  <head><title>Contact Us | TIBCO</title></head>
  <body>
    <h2>Find your next JOB OPPORTUNITY</h2>
    <a href="https://careers.cloud.com/" aria-label="Careers at Cloud Software Group - Opens link in a new window"><span>CAREERS</span></a>
  </body>
</html>
`

const CAREERS_HUB_HTML = `
<html>
  <body>
    TIBCO, Cloud Software Group is now one of the world’s largest cloud solution providers.
    <a href="https://careers.cloud.com/jobs/search">Search Jobs</a>
  </body>
</html>
`

const CAREERS_SEARCH_HTML = `
<html>
  <body>
    Search Jobs
    Non-TIBCO Office
    <a href="https://careers.cloud.com/jobs/lead-account-technical-strategist-remote-illinois-united-states">Lead Account Technical Strategist</a>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../tibcosoftware/script.js')
  } catch {
    assert.fail('Expected TIBCO Software scraper module at ../tibcosoftware/script.js')
  }
}

test('TIBCO Software pins the official contact-page careers link and generic cloud careers shell', async () => {
  const tibco = await loadScriptModule()

  assert.equal(tibco.hasOfficialContactPageSignal(CONTACT_PAGE_HTML), true)
  assert.equal(tibco.extractOfficialCareersHubUrl(CONTACT_PAGE_HTML), 'https://careers.cloud.com/')
  assert.equal(tibco.hasGenericCloudCareersHubSignal(CAREERS_HUB_HTML), true)
  assert.equal(tibco.hasGenericCloudCareersSearchSignal(CAREERS_SEARCH_HTML), true)
})

test('TIBCO Software returns [] while the current official handoff stays a generic multi-brand careers surface', async () => {
  const tibco = await loadScriptModule()
  const requestedUrls = []

  const jobs = await tibco.createTibcoSoftwareScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === tibco.CAREERS_URL) return CONTACT_PAGE_HTML
      if (url === tibco.CAREERS_HUB_URL) return CAREERS_HUB_HTML
      if (url === tibco.CAREERS_SEARCH_URL) return CAREERS_SEARCH_HTML
      throw new Error(`Unexpected TIBCO URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
  assert.deepEqual(requestedUrls, [
    tibco.CAREERS_URL,
    tibco.CAREERS_HUB_URL,
    tibco.CAREERS_SEARCH_URL,
  ])
})

test('TIBCO Software fails closed when the official careers handoff drifts materially', async () => {
  const tibco = await loadScriptModule()

  await assert.rejects(
    tibco.createTibcoSoftwareScraper().run({
      fetchText: async () => '<html><body>Unexpected</body></html>',
    }),
    /verified official contact page/i,
  )
})
