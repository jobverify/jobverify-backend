import assert from 'node:assert/strict'
import test from 'node:test'

const BLOCKED_PAGE_HTML = `
<!doctype html>
<html>
  <head>
    <title>Attention Required! | Cloudflare</title>
  </head>
  <body>
    <h1>Sorry, you have been blocked</h1>
    <p>Cloudflare Ray ID: abc123</p>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../softura/script.js')
  } catch {
    assert.fail('Expected Softura scraper module at ../softura/script.js')
  }
}

test('Softura recognizes the verified Cloudflare block page', async () => {
  const softura = await loadScriptModule()

  assert.equal(softura.hasCloudflareBlockSignal(BLOCKED_PAGE_HTML), true)
})

test('Softura returns [] while the careers route stays blocked by Cloudflare', async () => {
  const softura = await loadScriptModule()

  const jobs = await softura.createSofturaScraper().run({
    fetchText: async () => BLOCKED_PAGE_HTML,
  })

  assert.deepEqual(jobs, [])
})

test('Softura fails closed if the verified blocked page disappears', async () => {
  const softura = await loadScriptModule()

  await assert.rejects(
    softura.createSofturaScraper().run({
      fetchText: async () => '<html><body>unexpected</body></html>',
    }),
    /no longer matches/i,
  )
})
