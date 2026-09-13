import assert from 'node:assert/strict'
import test from 'node:test'

const careersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title> Agentic AI, Cybersecurity & Intelligent Enterprise Solutions | CBNITS</title>
    <script type="module" crossorigin src="/assets/index-BOK9jS_3.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const careersBundle = 'const API_BASE_URL="https://api.cbnits.com"; const endpoints={GET_CAREER_POST:"getAllCareerPost"}; function Career(){return "Join The CBNITS Team Current career opportunities at CBNITS";} const routes=[{path:"/career",element:Career}];'

const loadModule = async () => {
  try {
    return await import('../../scraper/cbnits/script.js')
  } catch {
    assert.fail('Expected CBNITS scraper module at ../../scraper/cbnits/script.js')
  }
}

test('CBNITS sentinel helpers stay pinned to the verified SPA careers shell', async () => {
  const cbnits = await loadModule()

  assert.equal(cbnits.SOURCE, 'cbnits')
  assert.equal(cbnits.COMPANY, 'CBNITS')
  assert.equal(cbnits.CAREERS_URL, 'https://cbnits.com/')
  assert.equal(cbnits.VERIFIED_ON, '2026-09-13')
  assert.equal(cbnits.hasOfficialCareersShellSignal(careersShellHtml), true)
  assert.equal(cbnits.hasServerRenderedJobsSignal(careersShellHtml), false)
  assert.equal(cbnits.extractBundleUrl(careersShellHtml), 'https://cbnits.com/assets/index-BOK9jS_3.js')
  assert.equal(cbnits.hasOfficialCareersBundleSignal(careersBundle), true)
})

test('CBNITS returns [] only while the verified first-party careers page remains a raw SPA shell', async () => {
  const cbnits = await loadModule()
  const requestedUrls = []

  const jobs = await cbnits.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === cbnits.CAREERS_URL) return careersShellHtml
      if (url === 'https://cbnits.com/assets/index-BOK9jS_3.js') return careersBundle
      throw new Error(`Unexpected CBNITS URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    cbnits.CAREERS_URL,
    'https://cbnits.com/assets/index-BOK9jS_3.js',
  ])
  assert.deepEqual(jobs, [])
})

test('CBNITS fails closed when server-rendered public jobs appear or the shell changes materially', async () => {
  const cbnits = await loadModule()

  await assert.rejects(
    cbnits.run({
      fetchText: async () => careersShellHtml.replace('<div id="root"></div>', '<h2>Current Openings</h2><a href="/apply">Apply Now</a>'),
    }),
    /server-rendered public jobs/i,
  )

  await assert.rejects(
    cbnits.run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified first-party careers shell/i,
  )

  await assert.rejects(
    cbnits.run({
      fetchText: async (url) => url === cbnits.CAREERS_URL
        ? careersShellHtml
        : 'const routes=[]',
    }),
    /careers route bundle/i,
  )
})
