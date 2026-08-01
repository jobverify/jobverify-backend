import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Destek Infosolutions</title>
  </head>
  <body>
    <nav>
      <a href="/about">About</a>
      <a href="/services">Services</a>
      <a href="/contact">Contact Us</a>
    </nav>
    <h1>Welcome to destek</h1>
    <p>Digital transformation agency.</p>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Destek Infosolutions Contact</title>
  </head>
  <body>
    <h1>GET IN TOUCH ANY TIME</h1>
    <p>WITH Destek Infosolutions</p>
    <p>contactus@desteksolutions.com</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/destekinfosolutions/script.js')
  } catch {
    assert.fail('Expected Destek Infosolutions scraper module at ../../scraper/destekinfosolutions/script.js')
  }
}

test('Destek Infosolutions validates the verified no-public-careers homepage, contact page, and careers route', async () => {
  const destek = await loadModule()

  assert.equal(destek.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(destek.hasPublicCareersLink(homepageHtml), false)
  assert.equal(destek.hasOfficialContactSignal(contactHtml), true)
  assert.equal(
    destek.isExpectedMissingCareersRoute({
      status: 404,
      url: 'https://desteksolutions.com/careers',
      html: '<html><body><h1>Page not found</h1></body></html>',
    }),
    true,
  )
})

test('Destek Infosolutions run returns no jobs while the verified first-party no-public-careers surface remains unchanged', async () => {
  const destek = await loadModule()
  const requestedUrls = []

  const jobs = await destek.run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === destek.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml, headers: {} }
      }
      if (url === destek.CONTACT_URL) {
        return { status: 200, url, html: contactHtml, headers: {} }
      }
      if (url === destek.CAREERS_URL) {
        return {
          status: 404,
          url,
          html: '<html><body><h1>Page not found</h1></body></html>',
          headers: {},
        }
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    destek.HOMEPAGE_URL,
    destek.CONTACT_URL,
    destek.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})
