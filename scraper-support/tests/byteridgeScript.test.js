import assert from 'node:assert/strict'
import test from 'node:test'

const loadByteridgeModule = async () => {
  try {
    return await import('../../scraper/byteridge/script.js')
  } catch {
    return null
  }
}

const careersHtml = `
<!doctype html>
<html>
  <body>
    <section class="careers">
      <h1>Join Our Team</h1>
      <p>Upload your profile for the job areas you're interested in. You'll be notified when an opportunity becomes available.</p>
      <a href="mailto:team-hiring@staging.byteridge.com">Submit Your CV</a>
    </section>
  </body>
</html>
`

test('extractOpenings returns an empty job list when Byteridge only exposes a talent-pool CTA', async () => {
  const byteridge = await loadByteridgeModule()
  assert.ok(byteridge)

  const jobs = byteridge.extractOpenings(careersHtml)

  assert.deepEqual(jobs, [])
})

test('run fetches the Byteridge careers page and returns no jobs when no live openings are published', async () => {
  const byteridge = await loadByteridgeModule()
  assert.ok(byteridge)

  const requestedUrls = []
  const scraper = byteridge.createByteridgeScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === byteridge.CAREER_PAGE_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [byteridge.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})
