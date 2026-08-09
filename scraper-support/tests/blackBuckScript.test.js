import assert from 'node:assert/strict'
import test from 'node:test'

const loadBlackBuckModule = async () => {
  try {
    return await import('../../scraper/blackbuck/script.js')
  } catch {
    assert.fail('Expected BlackBuck scraper module at ../../scraper/blackbuck/script.js')
  }
}

const homepageHtml = `
  <html>
    <head>
      <title>Home - BlackBuck</title>
    </head>
    <body>
      <header><a href="https://blackbuck.com/team-blackbuck.html">Team BlackBuck</a></header>
      <main>
        <h1>INDIA'S LARGEST</h1>
        <p>BlackBuck is a digital trucking platform for logistics.</p>
      </main>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head>
      <title>Life@BlackBuck - BlackBuck</title>
    </head>
    <body>
      <h1>Fueling Great Minds</h1>
      <p>Life at BlackBuck is built around ownership and logistics impact.</p>
      <p>Email us at careers@blackbuck.com</p>
      <a href="mailto:careers@blackbuck.com">careers@blackbuck.com</a>
    </body>
  </html>
`

test('BlackBuck recognizes the verified homepage, team page, and broken alternate careers routes', async () => {
  const blackbuck = await loadBlackBuckModule()

  assert.equal(blackbuck.SOURCE, 'blackbuck')
  assert.equal(blackbuck.COMPANY, 'BlackBuck')
  assert.equal(blackbuck.HOMEPAGE_URL, 'https://blackbuck.com/')
  assert.equal(blackbuck.CAREERS_URL, 'https://blackbuck.com/team-blackbuck.html')
  assert.deepEqual(blackbuck.BROKEN_ROUTE_URLS, [
    'https://blackbuck.com/careers',
    'https://blackbuck.com/jobs',
  ])
  assert.equal(blackbuck.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(blackbuck.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(blackbuck.hasEmailOnlyCareersSignal(careersHtml), true)
  assert.equal(blackbuck.isVerifiedBrokenRoute({ status: 502 }), true)
})

test('BlackBuck returns no jobs only while the verified email-only team page remains unchanged', async () => {
  const blackbuck = await loadBlackBuckModule()
  const requestedUrls = []

  const jobs = await blackbuck.createBlackBuckScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === blackbuck.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === blackbuck.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      return {
        status: 502,
        url,
        html: '<html><body><h1>Bad Gateway</h1></body></html>',
      }
    },
  })

  assert.deepEqual(
    requestedUrls,
    [blackbuck.HOMEPAGE_URL, blackbuck.CAREERS_URL, ...blackbuck.BROKEN_ROUTE_URLS],
  )
  assert.deepEqual(jobs, [])
})

test('BlackBuck fails closed when the team page drifts into a public jobs surface', async () => {
  const blackbuck = await loadBlackBuckModule()

  await assert.rejects(
    blackbuck.createBlackBuckScraper().run({
      fetchPage: async (url) => {
        if (url === blackbuck.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === blackbuck.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace('</body>', '<a href="/jobs/analyst">Apply now</a></body>'),
          }
        }

        return { status: 502, url, html: '<html><body>Bad Gateway</body></html>' }
      },
    }),
    /public jobs surface|email-only careers surface/i,
  )
})
