import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_BLOCKED_HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>403 Forbidden</title>
  </head>
  <body>
    <h1>403 Forbidden</h1>
    <p>Access to this resource on the server is denied!</p>
  </body>
</html>
`

const VERIFIED_404_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>This Page Does Not Exist</title>
  </head>
  <body>
    <h1>This Page Does Not Exist</h1>
    <p>Sorry, the page you are looking for could not be found.</p>
    <p>It's just an accident that was not intentional.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/primesoftenterprise/script.js')
  } catch {
    assert.fail('Expected Primesoft Enterprise scraper module at ../../scraper/primesoftenterprise/script.js')
  }
}

test('Primesoft Enterprise accepts the current blocked homepage and missing careers routes', async () => {
  const primesoft = await loadModule()

  assert.equal(
    primesoft.isVerifiedBlockedHomepage({
      status: 403,
      headers: {
        server: 'hcdn',
        platform: 'hostinger',
        panel: 'hpanel',
      },
      html: VERIFIED_BLOCKED_HOMEPAGE_HTML,
    }),
    true,
  )

  assert.equal(
    primesoft.isVerifiedAbsentCareersRoute({
      status: 404,
      html: VERIFIED_404_HTML,
    }),
    true,
  )
})

test('Primesoft Enterprise run returns [] while the blocked homepage and absent careers routes remain unchanged', async () => {
  const primesoft = await loadModule()

  const jobs = await primesoft.createPrimesoftEnterpriseScraper().run({
    fetchPage: async (url) => {
      if (url === primesoft.HOMEPAGE_URL) {
        return {
          status: 403,
          url,
          headers: {
            server: 'hcdn',
            platform: 'hostinger',
            panel: 'hpanel',
          },
          html: VERIFIED_BLOCKED_HOMEPAGE_HTML,
        }
      }

      return {
        status: 404,
        url,
        headers: {},
        html: VERIFIED_404_HTML,
      }
    },
  })

  assert.deepEqual(jobs, [])
})
