import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Civica</title>
  </head>
  <body>
    <h1>Make your future part of ours</h1>
    <p>Join the Civica team today.</p>
    <a href="https://apply.workable.com/civica/">Our vacancies</a>
  </body>
</html>
`

const cloudflareChallengeHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Just a moment...</title>
    <meta name="robots" content="noindex,nofollow">
    <meta http-equiv="content-security-policy" content="default-src 'none'; script-src https://challenges.cloudflare.com;">
  </head>
  <body>
    <main>
      <h1>Just a moment...</h1>
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>
    </main>
  </body>
</html>
`

const workableLlmsText = `
# Civica Careers
## Open Positions
- All open roles (GET \`https://apply.workable.com/civica/jobs.md\`): 0 current openings
## Optional
- [Careers page](https://apply.workable.com/civica/): Main careers page
`

const loadCivicaModule = async () => {
  try {
    return await import('../../scraper/civicaindia/script.js')
  } catch {
    assert.fail('Expected Civica India scraper module at ../../scraper/civicaindia/script.js')
  }
}

test('Civica India recognizes both the official careers page and the verified Cloudflare challenge shell', async () => {
  const civica = await loadCivicaModule()

  assert.equal(civica.SOURCE, 'civicaindia')
  assert.equal(civica.COMPANY, 'Civica India')
  assert.equal(civica.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(civica.isVerifiedCloudflareChallengePage(cloudflareChallengeHtml), true)
  assert.equal(civica.hasZeroOpeningsSignal(workableLlmsText), true)
})

test('Civica India returns [] when the careers page is Cloudflare-protected but the Workable llms feed still reports zero openings', async () => {
  const civica = await loadCivicaModule()
  const requestedUrls = []

  const jobs = await civica.createCivicaIndiaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === civica.CAREERS_URL) return cloudflareChallengeHtml
      if (url === civica.WORKABLE_LLMS_URL) return workableLlmsText

      throw new Error(`Unexpected Civica URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    civica.CAREERS_URL,
    civica.WORKABLE_LLMS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Civica India still fails closed when neither the official page nor the verified challenge shell is present', async () => {
  const civica = await loadCivicaModule()

  await assert.rejects(
    civica.createCivicaIndiaScraper().run({
      fetchText: async (url) => {
        if (url === civica.CAREERS_URL) return '<html><body>Unexpected</body></html>'
        if (url === civica.WORKABLE_LLMS_URL) return workableLlmsText
        throw new Error(`Unexpected Civica URL: ${url}`)
      },
    }),
    /expected official handoff/i,
  )
})
