import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>SplashLearn Overview</h1>
      <p>We are the world's first scientifically-designed, game-based curriculum spanning pre-kindergarten to Grade 5.</p>
      <h2>Culture at SplashLearn</h2>
      <p>At SplashLearn, we dig individuality.</p>
      <p>Arpit Jain - CEO and a Co-founder, SplashLearn.</p>
      <p>help@splashlearn.com</p>
      <footer>StudyPad &amp; SplashLearn are registered Trademarks of StudyPad, Inc.</footer>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../splashlearn/script.js')
  } catch {
    assert.fail('Expected SplashLearn scraper module at ../splashlearn/script.js')
  }
}

test('SplashLearn default careers-page fetch is bounded by an AbortSignal', async () => {
  const splashlearn = await loadModule()
  const originalFetch = globalThis.fetch
  const fetchCalls = []

  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options })

    return {
      status: 200,
      url,
      text: async () => officialCareersHtml,
    }
  }

  try {
    const jobs = await splashlearn.createSplashLearnScraper().run()

    assert.deepEqual(jobs, [])
    assert.deepEqual(fetchCalls.map((call) => call.url), [splashlearn.CAREERS_PAGE_URL])
    assert.ok(fetchCalls[0].options.signal instanceof AbortSignal)
    assert.equal(fetchCalls[0].options.signal.aborted, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
