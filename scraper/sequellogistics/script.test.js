import assert from 'node:assert/strict'
import test from 'node:test'

const loadSequelModule = async () => {
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
    <title>Sequel Logistics</title>
  </head>
  <body>
    <header>
      <a href="https://sequelglobal.com/">Home</a>
      <a href="https://sequelglobal.com/about">About</a>
      <a href="https://sequelglobal.com/sequel-office">Sequel Office</a>
      <a href="https://sequelglobal.com/contact">Contact</a>
    </header>
    <main>
      <h1>Sequel Logistics</h1>
      <p>Trusted logistics and secure delivery solutions</p>
      <p>Built for high-assurance movement and visibility</p>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Sequel Logistics</title>
  </head>
  <body>
    <main>
      <h1>About Sequel Logistics</h1>
      <p>Our Story</p>
      <p>Sequel builds secure logistics systems for enterprise operations.</p>
      <p>Operational excellence across critical delivery networks.</p>
    </main>
  </body>
</html>
`

const officeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sequel Office</title>
  </head>
  <body>
    <main>
      <h1>Sequel Office</h1>
      <p>Office network and operating hubs</p>
      <a href="https://sequel247.com/login">Login</a>
      <a href="https://sequel247.com/register">Register</a>
    </main>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Contact Sequel Logistics</title>
  </head>
  <body>
    <main>
      <h1>Contact</h1>
      <p>Get in touch with Sequel Logistics</p>
      <p>Customer support and business enquiries</p>
    </main>
  </body>
</html>
`

const missingRoutePage = {
  status: 404,
  html: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Not Found</title>
      </head>
      <body>
        <div>404</div>
        <div>Not Found</div>
      </body>
    </html>
  `,
}

const publicJobsPage = {
  status: 200,
  html: `
    <html>
      <head>
        <title>Sequel Careers</title>
      </head>
      <body>
        <h1>Current Openings</h1>
        <a href="https://jobs.lever.co/sequel/software-engineer">Apply now</a>
      </body>
    </html>
  `,
}

test('Sequel Logistics sentinel recognizes the verified homepage, about page, office page, contact page, and missing careers routes', async () => {
  const sequel = await loadSequelModule()
  assert.ok(sequel, 'Expected scraper module at ./script.js')

  assert.equal(sequel.SOURCE, 'sequellogistics')
  assert.equal(sequel.COMPANY, 'Sequel Logistics')
  assert.equal(sequel.HOMEPAGE_URL, 'https://sequelglobal.com/')
  assert.equal(sequel.ABOUT_URL, 'https://sequelglobal.com/about')
  assert.equal(sequel.OFFICE_URL, 'https://sequelglobal.com/sequel-office')
  assert.equal(sequel.CONTACT_URL, 'https://sequelglobal.com/contact')
  assert.deepEqual(sequel.VERIFIED_MISSING_ROUTE_URLS, [
    'https://sequelglobal.com/career',
    'https://sequelglobal.com/careers',
    'https://sequelglobal.com/jobs',
    'https://sequelglobal.com/apply',
    'https://sequel247.com/careers',
    'https://sequel247.com/jobs',
    'https://sequel247.com/apply',
  ])
  assert.equal(sequel.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(sequel.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(sequel.hasOfficialOfficeSignal(officeHtml), true)
  assert.equal(sequel.hasOfficialContactSignal(contactHtml), true)
  assert.equal(sequel.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(
    sequel.isVerifiedMissingCareerRoute({
      ...missingRoutePage,
      url: sequel.VERIFIED_MISSING_ROUTE_URLS[0],
    }),
    true,
  )
})

test('Sequel Logistics sentinel returns no jobs only while the verified public surface exposes no careers board', async () => {
  const sequel = await loadSequelModule()
  assert.ok(sequel, 'Expected scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await sequel.createSequelLogisticsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === sequel.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === sequel.ABOUT_URL) return { status: 200, url, html: aboutHtml }
      if (url === sequel.OFFICE_URL) return { status: 200, url, html: officeHtml }
      if (url === sequel.CONTACT_URL) return { status: 200, url, html: contactHtml }
      if (sequel.VERIFIED_MISSING_ROUTE_URLS.includes(url)) return { ...missingRoutePage, url }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    sequel.HOMEPAGE_URL,
    sequel.ABOUT_URL,
    sequel.OFFICE_URL,
    sequel.CONTACT_URL,
    ...sequel.VERIFIED_MISSING_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Sequel Logistics default fetch is bounded by a timeout signal', async () => {
  const sequel = await loadSequelModule()
  assert.ok(sequel, 'Expected scraper module at ./script.js')

  let capturedInit = null
  const page = await sequel.defaultFetchPage(sequel.HOMEPAGE_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        status: 200,
        url,
        text: async () => homepageHtml,
      }
    },
  })

  assert.equal(page.status, 200)
  assert.equal(page.url, sequel.HOMEPAGE_URL)
  assert.equal(page.html, homepageHtml)
  assert.equal(capturedInit.redirect, 'follow')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('Sequel Logistics sentinel fails closed when the verified public surface drifts', async () => {
  const sequel = await loadSequelModule()
  assert.ok(sequel, 'Expected scraper module at ./script.js')

  await assert.rejects(
    sequel.createSequelLogisticsScraper().run({
      fetchPage: async (url) => {
        if (url === sequel.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    sequel.createSequelLogisticsScraper().run({
      fetchPage: async (url) => {
        if (url === sequel.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === sequel.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === sequel.OFFICE_URL) return { status: 200, url, html: officeHtml }
        if (url === sequel.CONTACT_URL) return { status: 200, url, html: contactHtml }
        if (url === sequel.VERIFIED_MISSING_ROUTE_URLS[0]) return { ...publicJobsPage, url }
        if (sequel.VERIFIED_MISSING_ROUTE_URLS.slice(1).includes(url)) return { ...missingRoutePage, url }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified no-public-careers route changed/i,
  )

  await assert.rejects(
    sequel.createSequelLogisticsScraper().run({
      fetchPage: async (url) => {
        if (url === sequel.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: `${homepageHtml}<a href="https://sequelglobal.com/careers">Careers</a>`,
          }
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage now appears to expose a public jobs surface|homepage now exposes a first-party careers path/i,
  )
})
