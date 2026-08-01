import assert from 'node:assert/strict'
import test from 'node:test'

const loginHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SurePrep FileRoom Login</title>
  </head>
  <body>
    <h1>Welcome</h1>
    <button>Sign in with Thomson Reuters Account</button>
    <footer>Copyright 2026 SurePrep, LLC</footer>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/sureprep/script.js')
  } catch {
    assert.fail('Expected SurePrep scraper module at ../../scraper/sureprep/script.js')
  }
}

test('SurePrep scraper stays pinned to the verified exact-name login-only surface', async () => {
  const surePrep = await loadScriptModule()

  assert.equal(surePrep.SOURCE, 'sureprep')
  assert.equal(surePrep.COMPANY, 'SurePrep')
  assert.equal(surePrep.VERIFIED_ON, '2026-07-18')
  assert.equal(surePrep.LOGIN_URL, 'https://sso.sureprep.com/')
  assert.equal(surePrep.OFFICIAL_LOGIN_TITLE, 'SurePrep FileRoom Login')
  assert.equal(surePrep.OFFICIAL_LOGIN_PROVIDER, 'Thomson Reuters Account')
  assert.equal(surePrep.hasOfficialLoginSignal(loginHtml), true)
  assert.equal(surePrep.hasPublicJobsSignal(loginHtml), false)
})

test('SurePrep scraper returns [] while the verified login-only surface remains unchanged', async () => {
  const surePrep = await loadScriptModule()
  const requestedUrls = []

  const jobs = await surePrep.createSurePrepScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return { status: 200, url, html: loginHtml }
    },
  })

  assert.deepEqual(requestedUrls, [surePrep.LOGIN_URL])
  assert.deepEqual(jobs, [])
})

test('SurePrep scraper fails closed when the exact-name login surface drifts into jobs content', async () => {
  const surePrep = await loadScriptModule()

  await assert.rejects(
    surePrep.createSurePrepScraper().run({
      fetchPage: async () => ({ status: 200, url: surePrep.LOGIN_URL, html: '<title>Unexpected</title>' }),
    }),
    /trusted first-party exact-name surface/i,
  )

  await assert.rejects(
    surePrep.createSurePrepScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: surePrep.LOGIN_URL,
        html: `${loginHtml}<section><h2>Current Openings</h2><a>Apply now</a></section>`,
      }),
    }),
    /needs a real scraper/i,
  )
})
