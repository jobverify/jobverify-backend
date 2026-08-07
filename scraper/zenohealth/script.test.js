import assert from 'node:assert/strict'
import test from 'node:test'

const loadZenoHealthModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Zeno Health scraper module at ./script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Helping the world is perhaps the most rewarding way to grow in your career and life</h1>
      <section>Work culture at Zeno Health</section>
      <section>Join us</section>
      <a href="https://www.linkedin.com/company/zeno-health/mycompany/?viewAsMember=true">
        View our LinkedIn page for current openings
      </a>
    </main>
  </body>
</html>
`

const jsShellHtml = `
<!doctype html>
<html lang="en">
  <head><title>Zeno Health</title></head>
  <body>--></body>
</html>
`

test('Zeno Health validates the verified fail-closed careers contract', async () => {
  const zenoHealth = await loadZenoHealthModule()

  assert.equal(zenoHealth.SOURCE, 'zenohealth')
  assert.equal(zenoHealth.CAREERS_URL, 'https://corporate.zeno.health/careers')
  assert.doesNotThrow(() => zenoHealth.assertVerifiedPublicCareersSurface(officialCareersHtml))
  assert.doesNotThrow(() => zenoHealth.assertVerifiedLinkedInOpeningsHandoff(officialCareersHtml))
  assert.doesNotThrow(() => zenoHealth.assertNoPublicJobsSurface(officialCareersHtml))
})

test('Zeno Health falls back to a browser-rendered careers page when static fetch returns a shell', async () => {
  const zenoHealth = await loadZenoHealthModule()
  const requestedStaticUrls = []
  const requestedBrowserUrls = []

  const jobs = await zenoHealth.createZenoHealthScraper().run({
    fetchHtml: async (url) => {
      requestedStaticUrls.push(url)
      return jsShellHtml
    },
    fetchBrowserHtml: async (url) => {
      requestedBrowserUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedStaticUrls, [zenoHealth.CAREERS_URL])
  assert.deepEqual(requestedBrowserUrls, [zenoHealth.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Zeno Health fails closed when the browser-rendered contract also changes', async () => {
  const zenoHealth = await loadZenoHealthModule()

  await assert.rejects(
    zenoHealth.createZenoHealthScraper().run({
      fetchHtml: async () => jsShellHtml,
      fetchBrowserHtml: async () => '<main><h1>Careers</h1></main>',
    }),
    /verified public careers surface changed/i,
  )
})
