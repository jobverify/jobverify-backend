import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedChallengeHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Just a moment...</title>
    <meta name="robots" content="noindex,nofollow" />
  </head>
  <body>
    <div class="main-content">
      <noscript>
        <div class="h2">
          <span id="challenge-error-text">Enable JavaScript and cookies to continue</span>
        </div>
      </noscript>
    </div>
    <script>
      window._cf_chl_opt = {
        cZone: 'www.pramata.com',
        cUPMDTk: '/careers/?ki-cf-botcl=1',
      }
    </script>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../pramataknowledgesolutions/script.js')
  } catch {
    assert.fail('Expected Pramata Knowledge Solutions scraper module at ../pramataknowledgesolutions/script.js')
  }
}

test('Pramata Knowledge Solutions recognizes the verified Cloudflare challenge on the official careers surface', async () => {
  const pramata = await loadModule()

  assert.equal(pramata.SOURCE, 'pramataknowledgesolutions')
  assert.equal(pramata.COMPANY_NAME, 'Pramata Knowledge Solutions')
  assert.equal(pramata.OFFICIAL_BRAND_NAME, 'Pramata')
  assert.equal(pramata.CAREERS_URL, 'https://www.pramata.com/careers/')
  assert.equal(pramata.VERIFIED_ON, '2026-07-17')
  assert.equal(pramata.hasVerifiedCloudflareChallengeSignal(verifiedChallengeHtml), true)
  assert.equal(pramata.exposesStructuredPublicJobs(verifiedChallengeHtml), false)
  assert.equal(
    pramata.exposesStructuredPublicJobs(
      `${verifiedChallengeHtml}<article class="job-card"><h2>Solution Architect - Contract AI</h2></article>`,
    ),
    true,
  )
})

test('Pramata Knowledge Solutions returns an honest empty list while the official careers surface is bot-gated', async () => {
  const pramata = await loadModule()
  const requestedUrls = []

  const jobs = await pramata.createPramataKnowledgeSolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return verifiedChallengeHtml
    },
  })

  assert.deepEqual(requestedUrls, [pramata.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Pramata Knowledge Solutions fails closed when the challenge contract drifts or a scraper-visible jobs surface appears', async () => {
  const pramata = await loadModule()

  await assert.rejects(
    pramata.createPramataKnowledgeSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified pramata knowledge solutions careers surface/i,
  )

  await assert.rejects(
    pramata.createPramataKnowledgeSolutionsScraper().run({
      fetchText: async () =>
        `${verifiedChallengeHtml}<article class="job-card"><h2>Solution Architect - Contract AI</h2></article>`,
    }),
    /scraper-visible public jobs/i,
  )
})
