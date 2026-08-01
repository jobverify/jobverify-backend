import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <head><title>Attention Required! | Cloudflare</title></head>
  <body>
    <div>Please enable cookies.</div>
    <h1>Sorry, you have been blocked</h1>
    <p>Performance &amp; security by Cloudflare</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/mitratech/script.js')
  } catch {
    assert.fail('Expected Mitratech scraper module at ../../scraper/mitratech/script.js')
  }
}

test('Mitratech validator stays pinned to the verified Cloudflare interstitial from Friday, July 17, 2026', async () => {
  const mitratech = await loadModule()
  assert.equal(mitratech.hasBlockedCareersSignal(careersHtml), true)
})

test('Mitratech run validates the blocked careers route and stays fail-closed', async () => {
  const mitratech = await loadModule()
  const jobs = await mitratech.createMitratechScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})
