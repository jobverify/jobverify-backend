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
    <title>Nativeorange | AI Insurance Products</title>
  </head>
  <body>
    <main>
      <h1>Nativeorange</h1>
      <p>AI insurance products for modern teams.</p>
      <p>Reach us at sales@nativeorange.ai.</p>
      <section>
        <h2>San Francisco</h2>
        <p>Official first-party product studio.</p>
      </section>
      <a href="/about/">About</a>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Nativeorange</title>
  </head>
  <body>
    <main>
      <h1>About Nativeorange</h1>
      <section>
        <h2>Join Our Team</h2>
        <p>We are actively looking for candidates who want to build insurance AI.</p>
        <a href="/contact/">Apply Now</a>
      </section>
    </main>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Contact Nativeorange</title>
  </head>
  <body>
    <main>
      <h1>Contact Us</h1>
      <p>Talk to our team about products and opportunities.</p>
      <p>Email: sales@nativeorange.ai</p>
      <p>San Francisco</p>
    </main>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Nativeorange Jobs</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://jobs.lever.co/nativeorange/full-stack-engineer">Apply now</a>
    </main>
  </body>
</html>
`

test('Native orange sentinel validates the verified homepage, about-page careers handoff, and contact surface', async () => {
  const nativeorange = await loadModule()
  assert.ok(nativeorange, 'Native orange scraper module should load')

  assert.equal(nativeorange.SOURCE, 'nativeorange')
  assert.equal(nativeorange.COMPANY, 'Native orange')
  assert.equal(nativeorange.HOMEPAGE_URL, 'https://nativeorange.ai/')
  assert.equal(nativeorange.ABOUT_URL, 'https://nativeorange.ai/about/')
  assert.equal(nativeorange.CONTACT_URL, 'https://nativeorange.ai/contact/')
  assert.equal(nativeorange.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(nativeorange.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(nativeorange.hasOfficialContactSignal(contactHtml), true)
  assert.equal(nativeorange.extractApplyHandoffUrl(aboutHtml), 'https://nativeorange.ai/contact/')
  assert.equal(nativeorange.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(nativeorange.hasPublicJobsSignal(aboutHtml), false)
})

test('Native orange run returns no jobs only while the verified about-to-contact handoff remains intact', async () => {
  const nativeorange = await loadModule()
  assert.ok(nativeorange, 'Native orange scraper module should load')

  const requestedUrls = []
  const jobs = await nativeorange.createNativeOrangeScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === nativeorange.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === nativeorange.ABOUT_URL) return { status: 200, url, html: aboutHtml }
      if (url === nativeorange.CONTACT_URL) return { status: 200, url, html: contactHtml }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    nativeorange.HOMEPAGE_URL,
    nativeorange.ABOUT_URL,
    nativeorange.CONTACT_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Native orange fails closed when the homepage, about page, or contact page drifts or starts exposing direct jobs', async () => {
  const nativeorange = await loadModule()
  assert.ok(nativeorange, 'Native orange scraper module should load')

  await assert.rejects(
    nativeorange.createNativeOrangeScraper().run({
      fetchPage: async () => ({ status: 200, url: nativeorange.HOMEPAGE_URL, html: '<html><body>Unexpected</body></html>' }),
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    nativeorange.createNativeOrangeScraper().run({
      fetchPage: async (url) => {
        if (url === nativeorange.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === nativeorange.ABOUT_URL) {
          return {
            status: 200,
            url,
            html: aboutHtml.replace('/contact/', '/contact-sales/'),
          }
        }
        if (url === nativeorange.CONTACT_URL) return { status: 200, url, html: contactHtml }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /about page no longer hands candidates to the verified contact surface/i,
  )

  await assert.rejects(
    nativeorange.createNativeOrangeScraper().run({
      fetchPage: async (url) => {
        if (url === nativeorange.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === nativeorange.ABOUT_URL) {
          return {
            status: 200,
            url,
            html: aboutHtml.replace(
              '</main>',
              '<a href="https://jobs.lever.co/nativeorange/full-stack-engineer">Current Openings</a></main>',
            ),
          }
        }
        if (url === nativeorange.CONTACT_URL) return { status: 200, url, html: contactHtml }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /about page now exposes public jobs/i,
  )

  await assert.rejects(
    nativeorange.createNativeOrangeScraper().run({
      fetchPage: async (url) => {
        if (url === nativeorange.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === nativeorange.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === nativeorange.CONTACT_URL) {
          return {
            status: 200,
            url,
            html: contactHtml.replace(
              '</main>',
              '<a href="https://boards.greenhouse.io/nativeorange">Current Openings</a></main>',
            ),
          }
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /contact page now exposes public jobs/i,
  )
})
