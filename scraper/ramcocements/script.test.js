import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>The Ramco Cements Limited</title>
  </head>
  <body>
    <main>
      <h1>The Ramco Cements Limited</h1>
      <a href="/about/life-at-ramco">Life at Ramco</a>
      <a href="https://in.linkedin.com/company/theramcocementsltd">LinkedIn</a>
      <p>Fake Job Disclaimer</p>
    </main>
  </body>
</html>
`

const lifePageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Life at Ramco</title>
  </head>
  <body>
    <main>
      <h1>Life at Ramco</h1>
      <p>People and culture</p>
      <p>Ramco Cements</p>
    </main>
  </body>
</html>
`

const notFoundHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>404</title>
  </head>
  <body>
    <main>
      <h1>404</h1>
      <p>Page not found</p>
    </main>
  </body>
</html>
`

test('The Ramco Cements Limited validates the verified homepage, life page, and missing careers routes', async () => {
  const ramcoCements = await loadModule()
  assert.ok(ramcoCements, 'The Ramco Cements Limited scraper module should load')

  assert.equal(ramcoCements.SOURCE, 'ramcocements')
  assert.equal(ramcoCements.COMPANY, 'The Ramco Cements Limited')
  assert.equal(ramcoCements.HOMEPAGE_URL, 'https://www.ramcocements.in/')
  assert.equal(ramcoCements.LIFE_AT_RAMCO_URL, 'https://www.ramcocements.in/about/life-at-ramco')
  assert.deepEqual(ramcoCements.CAREERS_ROUTE_URLS, [
    'https://www.ramcocements.in/careers',
    'https://www.ramcocements.in/career',
    'https://www.ramcocements.in/jobs',
    'https://www.ramcocements.in/job',
    'https://www.ramcocements.in/apply',
  ])
  assert.equal(ramcoCements.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(ramcoCements.hasLifeAtRamcoSignal(lifePageHtml), true)
  assert.equal(ramcoCements.hasMissingRouteSignal({ status: 404, html: notFoundHtml }), true)
})

test('The Ramco Cements Limited returns no jobs only when the verified homepage, life page, and missing routes remain unchanged', async () => {
  const ramcoCements = await loadModule()
  assert.ok(ramcoCements, 'The Ramco Cements Limited scraper module should load')

  const requestedUrls = []
  const jobs = await ramcoCements.createRamcoCementsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === ramcoCements.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === ramcoCements.LIFE_AT_RAMCO_URL) return { status: 200, url, html: lifePageHtml }
      if (ramcoCements.CAREERS_ROUTE_URLS.includes(url)) return { status: 404, url, html: notFoundHtml }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ramcoCements.HOMEPAGE_URL,
    ramcoCements.LIFE_AT_RAMCO_URL,
    ...ramcoCements.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('The Ramco Cements Limited fails closed when the homepage, life page, or missing-route contract changes', async () => {
  const ramcoCements = await loadModule()
  assert.ok(ramcoCements, 'The Ramco Cements Limited scraper module should load')

  await assert.rejects(
    ramcoCements.createRamcoCementsScraper().run({
      fetchPage: async (url) => {
        if (url === ramcoCements.HOMEPAGE_URL) return { status: 200, url, html: '<html><body>Unexpected</body></html>' }
        if (url === ramcoCements.LIFE_AT_RAMCO_URL) return { status: 200, url, html: lifePageHtml }
        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    ramcoCements.createRamcoCementsScraper().run({
      fetchPage: async (url) => {
        if (url === ramcoCements.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === ramcoCements.LIFE_AT_RAMCO_URL) return { status: 200, url, html: '<html><body><h1>Life</h1></body></html>' }
        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /life at ramco/i,
  )

  await assert.rejects(
    ramcoCements.createRamcoCementsScraper().run({
      fetchPage: async (url) => {
        if (url === ramcoCements.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === ramcoCements.LIFE_AT_RAMCO_URL) return { status: 200, url, html: lifePageHtml }
        if (url === ramcoCements.CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><a href="/jobs/engineer">Apply now</a></body></html>',
          }
        }
        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /public careers surface changed/i,
  )
})
