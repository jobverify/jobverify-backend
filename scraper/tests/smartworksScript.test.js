import assert from 'node:assert/strict'
import test from 'node:test'

const loadSmartworksModule = async () => {
  try {
    return await import('../smartworks/script.js')
  } catch {
    assert.fail('Expected Smartworks scraper module at ../smartworks/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Smartworks</title>
  </head>
  <body>
    <main>
      <h1>Careers at Smartworks</h1>
      <p>Build the future of managed workspaces with us.</p>
      <a href="https://www.smartworksoffice.com/careers/smartworks-latest-jobs-opening">View Open Positions</a>
      <a href="mailto:careers@sworks.co.in">careers@sworks.co.in</a>
    </main>
  </body>
</html>
`

test('extractSearchResults returns no jobs when Smartworks only exposes a generic careers CTA and email apply flow', async () => {
  const smartworks = await loadSmartworksModule()

  assert.equal(smartworks.CAREERS_URL, 'https://www.smartworksoffice.com/careers/')
  assert.equal(smartworks.JOBS_URL, 'https://www.smartworksoffice.com/careers/smartworks-latest-jobs-opening')
  assert.equal(smartworks.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(smartworks.hasPublicJobBoardSignal(careersHtml), false)
  assert.deepEqual(smartworks.extractSearchResults(careersHtml), [])
})

test('run validates the verified Smartworks careers surface and returns an empty result set', async () => {
  const smartworks = await loadSmartworksModule()
  const requestedUrls = []

  const jobs = await smartworks.createSmartworksScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === smartworks.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected Smartworks fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [smartworks.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
