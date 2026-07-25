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
      <title>FamApp by Trio</title>
    </head>
    <body>
      <main>
        <h1>FamApp by Trio (formerly FamPay)</h1>
        <p>Bengaluru, Karnataka, India</p>
        <a href="https://www.famapp.in/careers/">Careers</a>
      </main>
      <footer>
        <a href="https://www.triotech.co.in/">Tri O Tech</a>
      </footer>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers | FamApp</title>
    </head>
    <body>
      <main>
        <h1>#JoinTheFam</h1>
        <p>Build the future of money for the next generation.</p>
        <p>Our perks include learning support, ownership, and strong team culture.</p>
        <button type="button">View openings</button>
      </main>
    </body>
  </html>
`

test('FamApp sentinel validates the verified homepage and careers page without a direct public openings surface', async () => {
  const famapp = await loadModule()
  assert.ok(famapp, 'FamApp scraper module should load')

  assert.equal(famapp.SOURCE, 'famapp')
  assert.equal(famapp.COMPANY, 'FamApp by Trio')
  assert.equal(famapp.HOMEPAGE_URL, 'https://www.famapp.in/')
  assert.equal(famapp.CAREERS_URL, 'https://www.famapp.in/careers/')
  assert.equal(famapp.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(famapp.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(famapp.hasPublicJobsSignal(careersHtml), false)
})

test('FamApp run returns an empty list while the verified careers page exposes no direct public openings surface', async () => {
  const famapp = await loadModule()
  assert.ok(famapp, 'FamApp scraper module should load')

  const requestedUrls = []
  const jobs = await famapp.createFamAppScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === famapp.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }
      if (url === famapp.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }
      throw new Error(`Unexpected FamApp URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.famapp.in/',
    'https://www.famapp.in/careers/',
  ])
  assert.deepEqual(jobs, [])
})

test('FamApp fails closed when the homepage or careers page changes materially or starts exposing direct job links', async () => {
  const famapp = await loadModule()
  assert.ok(famapp, 'FamApp scraper module should load')

  await assert.rejects(
    famapp.createFamAppScraper().run({
      fetchPage: async () => ({ status: 200, url: 'https://www.famapp.in/', html: '<html><body><h1>Unexpected homepage</h1></body></html>' }),
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    famapp.createFamAppScraper().run({
      fetchPage: async (url) => {
        if (url === famapp.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        return { status: 200, url, html: '<html><body><h1>Unexpected careers page</h1></body></html>' }
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    famapp.createFamAppScraper().run({
      fetchPage: async (url) => {
        if (url === famapp.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        return {
          status: 200,
          url,
          html: careersHtml.replace(
            '</main>',
            '<a href="https://boards.greenhouse.io/famapp">View openings</a></main>',
          ),
        }
      },
    }),
    /now appears to expose a direct public jobs surface/i,
  )
})
