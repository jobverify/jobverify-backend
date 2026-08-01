import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Solverminds — The Maritime Enterprise System</title>
  </head>
  <body>
    <nav>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
    <h1>The maritime enterprise system.</h1>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About · Solverminds</title>
  </head>
  <body>
    <h1>Built for maritime.</h1>
    <h2>Careers</h2>
    <p>Build the future of maritime.</p>
    <p>See open roles</p>
  </body>
</html>
`

const candidatePortalHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Solverminds Solutions & Technologies Pvt. Ltd - Candidate Portal</title>
  </head>
  <body>
    <h1>Candidate Portal</h1>
    <p>Enter the time-based one-time password (TOTP) generated from your Authenticator app to proceed.</p>
    <p>Do not have an account? Create an account</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/solvermindssolutionsandtechnologies/script.js')
  } catch {
    assert.fail('Expected Solverminds Solutions and Technologies scraper module at ../../scraper/solvermindssolutionsandtechnologies/script.js')
  }
}

test('Solverminds Solutions and Technologies validates the verified homepage, about page, and login-gated candidate portal', async () => {
  const solverminds = await loadModule()

  assert.equal(solverminds.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(solverminds.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(solverminds.hasLoginGatedCandidatePortalSignal(candidatePortalHtml), true)
})

test('Solverminds Solutions and Technologies run returns no jobs while the verified login-gated candidate portal remains unchanged', async () => {
  const solverminds = await loadModule()
  const requestedUrls = []

  const jobs = await solverminds.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === solverminds.HOMEPAGE_URL) return homepageHtml
      if (url === solverminds.ABOUT_URL) return aboutHtml
      if (url === solverminds.CANDIDATE_PORTAL_URL) return candidatePortalHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    solverminds.HOMEPAGE_URL,
    solverminds.ABOUT_URL,
    solverminds.CANDIDATE_PORTAL_URL,
  ])
  assert.deepEqual(jobs, [])
})
