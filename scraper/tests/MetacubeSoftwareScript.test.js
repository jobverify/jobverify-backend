import assert from 'node:assert/strict'
import test from 'node:test'

const careersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Metacube | Careers</title>
  </head>
  <body>
    <h1>Careers</h1>
    <h2>EXPERIENCED PROFESSIONALS</h2>
    <p>We are constantly on the lookout for the best talent.</p>
    <p>Open Positions General Application</p>
    <h2>STUDENTS & GRADUATES</h2>
    <p>see campus drive dates</p>
    <h3>What Makes a Metacubian? Our Hiring Philosophy</h3>
  </body>
</html>
`

const careersWithPublicRoleHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Metacube | Careers</title>
  </head>
  <body>
    <h1>Careers</h1>
    <h2>EXPERIENCED PROFESSIONALS</h2>
    <article class="job-card">
      <a href="https://metacube.com/careers/senior-java-engineer">Senior Java Engineer</a>
      <span>Jaipur</span>
      <span>Apply Now</span>
    </article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../metacubesoftware/script.js')
  } catch {
    assert.fail('Expected Metacube Software scraper module at ../metacubesoftware/script.js')
  }
}

test('Metacube Software helpers stay pinned to the verified careers shell from Saturday, July 18, 2026', async () => {
  const metacube = await loadModule()

  assert.equal(metacube.SOURCE, 'metacubesoftware')
  assert.equal(metacube.COMPANY, 'Metacube Software')
  assert.equal(metacube.CAREERS_URL, 'https://metacube.com/careers.php')
  assert.equal(metacube.VERIFIED_ON, '2026-07-18')
  assert.equal(metacube.hasOfficialCareersShellSignal(careersShellHtml), true)
  assert.equal(metacube.pageExposesTrustworthyPublicRoleCards(careersShellHtml), false)
  assert.equal(metacube.pageExposesTrustworthyPublicRoleCards(careersWithPublicRoleHtml), true)
})

test('Metacube Software returns [] only while the verified careers surface remains a generic shell', async () => {
  const metacube = await loadModule()
  const requestedUrls = []

  const jobs = await metacube.createMetacubeSoftwareScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === metacube.CAREERS_URL) return careersShellHtml
      throw new Error(`Unexpected Metacube URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [metacube.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Metacube Software fails closed when the verified careers shell drifts or starts exposing public roles', async () => {
  const metacube = await loadModule()

  await assert.rejects(
    metacube.createMetacubeSoftwareScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified metacube software careers shell/i,
  )

  await assert.rejects(
    metacube.createMetacubeSoftwareScraper().run({
      fetchText: async () => careersWithPublicRoleHtml,
    }),
    /surface now appears to expose trustworthy public role cards/i,
  )
})
