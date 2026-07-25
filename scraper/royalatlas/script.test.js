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
    <title>Royal Atlas General Contracting</title>
  </head>
  <body>
    <main>
      <h1>Royal Atlas General Contracting</h1>
      <nav>
        <a href="/careers/">Careers</a>
        <a href="/contact-us/">Contact Us</a>
      </nav>
      <p>Integrated infrastructure and contracting services in the UAE.</p>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Royal Atlas</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Please send your resume and cover letter to info@royal-atlas.com.</p>
      <p>We are always looking for experienced professionals.</p>
    </main>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Contact Us | Royal Atlas</title>
  </head>
  <body>
    <main>
      <h1>Contact Us</h1>
      <p>Royal Atlas General Contracting</p>
      <p>info@royal-atlas.com</p>
      <p>United Arab Emirates</p>
    </main>
  </body>
</html>
`

test('Royal Atlas scraper validates the verified homepage, email-only careers page, and contact page', async () => {
  const royalAtlas = await loadModule()
  assert.ok(royalAtlas, 'Royal Atlas scraper module should load')

  assert.equal(royalAtlas.SOURCE, 'royalatlas')
  assert.equal(royalAtlas.COMPANY, 'Royal Atlas')
  assert.equal(royalAtlas.HOMEPAGE_URL, 'https://royal-atlas.com/')
  assert.equal(royalAtlas.CAREERS_URL, 'https://royal-atlas.com/careers/')
  assert.equal(royalAtlas.CONTACT_URL, 'https://royal-atlas.com/contact-us/')
  assert.equal(royalAtlas.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(royalAtlas.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(royalAtlas.hasOfficialContactSignal(contactHtml), true)
  assert.equal(royalAtlas.extractApplicationEmail(careersHtml), 'info@royal-atlas.com')
  assert.equal(royalAtlas.hasUnexpectedPublicJobsSignal(careersHtml), false)
})

test('Royal Atlas scraper returns no jobs while the verified careers surface remains email-only', async () => {
  const royalAtlas = await loadModule()
  assert.ok(royalAtlas, 'Royal Atlas scraper module should load')

  const requestedUrls = []
  const jobs = await royalAtlas.createRoyalAtlasScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === royalAtlas.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === royalAtlas.CAREERS_URL) return { status: 200, url, html: careersHtml }
      if (url === royalAtlas.CONTACT_URL) return { status: 200, url, html: contactHtml }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    royalAtlas.HOMEPAGE_URL,
    royalAtlas.CAREERS_URL,
    royalAtlas.CONTACT_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Royal Atlas scraper fails closed when the homepage, careers page, or contact page drifts', async () => {
  const royalAtlas = await loadModule()
  assert.ok(royalAtlas, 'Royal Atlas scraper module should load')

  await assert.rejects(
    royalAtlas.createRoyalAtlasScraper().run({
      fetchPage: async () => ({ status: 200, url: royalAtlas.HOMEPAGE_URL, html: '<html><body>Unexpected</body></html>' }),
    }),
    /official homepage/i,
  )

  await assert.rejects(
    royalAtlas.createRoyalAtlasScraper().run({
      fetchPage: async (url) => {
        if (url === royalAtlas.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === royalAtlas.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace(
              '</main>',
              '<a href="https://jobs.lever.co/royalatlas/site-engineer">Current Openings</a></main>',
            ),
          }
        }
        if (url === royalAtlas.CONTACT_URL) return { status: 200, url, html: contactHtml }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers page now exposes public jobs/i,
  )

  await assert.rejects(
    royalAtlas.createRoyalAtlasScraper().run({
      fetchPage: async (url) => {
        if (url === royalAtlas.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === royalAtlas.CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === royalAtlas.CONTACT_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Placeholder contact</h1></body></html>',
          }
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /contact page/i,
  )
})
