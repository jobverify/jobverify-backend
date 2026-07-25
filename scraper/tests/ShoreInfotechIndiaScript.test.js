import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Managed Data Services & AI-Powered Operations for SMBs | Shore Group</title>
  </head>
  <body>
    <header>Shore Group</header>
    <main>
      <h1>Managed Data Services That Simplify Your Operations</h1>
      <p>Designed for Small and Medium-Sized Businesses.</p>
      <a href="https://www.shoregrp.com/get-started">Get Started</a>
    </main>
    <footer>© 2024 Shore Group Associates LLC</footer>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Get Started — Shore Group Associates</title>
  </head>
  <body>
    <h1>Let’s Connect</h1>
    <p>Innovative Services for Modern Businesses</p>
    <p>We’re just an email away.</p>
  </body>
</html>
`

const missingRouteHtml = `
<!doctype html>
<html lang="en">
  <head><title>Not Found</title></head>
  <body><div>404</div></body>
</html>
`

const loadShoreModule = async () => {
  try {
    return await import('../shoreinfotechindia/script.js')
  } catch {
    assert.fail('Expected Shore Infotech India scraper module at ../shoreinfotechindia/script.js')
  }
}

test('Shore Infotech India sentinel returns [] only while the verified first-party surface exposes no public careers board', async () => {
  const shore = await loadShoreModule()
  const requestedUrls = []

  assert.equal(shore.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(shore.hasOfficialContactSignal(contactHtml), true)
  assert.equal(shore.hasPublicJobsSignal(homepageHtml), false)

  const jobs = await shore.createShoreInfotechIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === shore.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === shore.CONTACT_URL) return { status: 200, url, html: contactHtml }
      if (shore.CAREERS_ROUTE_URLS.includes(url)) return { status: 404, url, html: missingRouteHtml }

      throw new Error(`Unexpected Shore URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    shore.HOMEPAGE_URL,
    shore.CONTACT_URL,
    ...shore.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Shore Infotech India sentinel fails closed when a first-party careers route appears', async () => {
  const shore = await loadShoreModule()

  await assert.rejects(
    shore.createShoreInfotechIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === shore.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === shore.CONTACT_URL) return { status: 200, url, html: contactHtml }
        if (url === shore.CAREERS_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body><h1>Careers</h1><a href="/apply">Apply Now</a></body></html>' }
        }
        return { status: 404, url, html: missingRouteHtml }
      },
    }),
    /careers route changed materially or now exposes public jobs/i,
  )
})

test('Shore Infotech India sentinel fails closed when homepage identity drifts', async () => {
  const shore = await loadShoreModule()

  await assert.rejects(
    shore.createShoreInfotechIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === shore.HOMEPAGE_URL) return { status: 200, url, html: '<html><body>Unknown</body></html>' }
        throw new Error(`Unexpected Shore URL: ${url}`)
      },
    }),
    /homepage surface no longer matches/i,
  )
})
