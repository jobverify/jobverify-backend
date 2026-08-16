import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => import('./script.js')

const challengeHtml = `
<!doctype html>
<html>
  <head>
    <title>You are being redirected...</title>
  </head>
  <body>
    <p>You are being redirected...</p>
    <p>Javascript is required. Please enable javascript before you are allowed to see this page.</p>
  </body>
</html>
`

const happiestMindsHtml = `
<!doctype html>
<html>
  <head>
    <title>Happiest Minds | AI First Customer-Centric Digital Engineering and Mindful IT Company</title>
  </head>
  <body>
    <h1>Experience The Culture Of Happiness At Happiest Minds</h1>
    <a href="https://careers.happiestminds.com/">JOIN US</a>
  </body>
</html>
`

test('PureSoftware accepts both the Happiest Minds handoff and the current JavaScript challenge page as verified no-jobs surfaces', async () => {
  const puresoftware = await loadModule()

  assert.equal(
    puresoftware.isVerifiedJavascriptChallengePage({
      status: 307,
      url: 'https://www.puresoftware.com/',
      html: challengeHtml,
    }, 'https://www.puresoftware.com/'),
    true,
  )

  assert.equal(
    puresoftware.isVerifiedHappiestMindsHomepageHandoffPage({
      status: 200,
      url: 'https://www.happiestminds.com/',
      html: happiestMindsHtml,
    }),
    true,
  )
})

test('PureSoftware still returns an empty list for the verified JavaScript challenge surface', async () => {
  const puresoftware = await loadModule()

  const jobs = await puresoftware.createPureSoftwareScraper().run({
    fetchPage: async (url) => ({
      status: 307,
      url,
      html: challengeHtml,
      headers: {},
    }),
  })

  assert.deepEqual(jobs, [])
})
