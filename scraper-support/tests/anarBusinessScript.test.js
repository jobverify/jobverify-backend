import assert from 'node:assert/strict'
import test from 'node:test'

const loadAnarBusinessModule = async () => {
  try {
    return await import('../../scraper/anarbusiness/script.js')
  } catch {
    assert.fail('Expected Anar Business scraper module at ../../scraper/anarbusiness/script.js')
  }
}

const repurposedDomainHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Myra Gems: Buy Certified Gemstone Rings for Men &amp; Women</title>
    <link rel="canonical" href="https://myragems.com/" />
  </head>
  <body>
    <h1>Myra Gems: Buy Certified Gemstone Rings for Men &amp; Women</h1>
    <p>20+ Years Expertise in Gemstone Jewellery</p>
    <p>100% Certified Natural Gemstones</p>
  </body>
</html>
`

const shutdownHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Anar Business App: A Journey Concluded</title>
  </head>
  <body>
    <h1>Anar Business App: A Journey Concluded</h1>
    <h2>Why We Shut Down</h2>
    <p>Anar Business App is no longer operating.</p>
  </body>
</html>
`

const currentShutdownHtml = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="https://anar.biz/">
    <title>Anar — Thank you for being part of our journey</title>
  </head>
  <body>
    <h1>Anar has shut down.</h1>
    <p>Our journey came to an end in November 2023.</p>
    <h2>Our story, in two chapters</h2>
    <a href="/agents">The Anar archive — our story, sources &amp; data</a>
  </body>
</html>
`

test('Anar Business accepts the current first-party shutdown page and retired 410 careers routes', async () => {
  const anarBusiness = await loadAnarBusinessModule()
  assert.equal(anarBusiness.hasShutdownExplainerSignal(currentShutdownHtml), true)
  assert.equal(anarBusiness.isVerifiedMissingCareersRoute({
    status: 410,
    url: 'https://www.anar.biz/careers',
    html: currentShutdownHtml,
  }, 'https://www.anar.biz/careers'), true)

  const requested = []
  const jobs = await anarBusiness.createAnarBusinessScraper().run({
    fetchPage: async (url) => {
      requested.push(url)
      return { status: url === anarBusiness.HOMEPAGE_URL ? 200 : 410, url, html: currentShutdownHtml }
    },
  })
  assert.deepEqual(jobs, [])
  assert.equal(requested.length, 1 + anarBusiness.NO_PUBLIC_JOB_ROUTE_URLS.length)
})

test('Anar Business validators accept both the historical shutdown explainer and the current repurposed-domain redirect', async () => {
  const anarBusiness = await loadAnarBusinessModule()

  assert.equal(anarBusiness.hasShutdownExplainerSignal(shutdownHtml), true)
  assert.equal(anarBusiness.hasRepurposedDomainSignal(repurposedDomainHtml), true)
  assert.equal(
    anarBusiness.isVerifiedRepurposedDomainRedirect({
      status: 200,
      url: 'https://myragems.com/',
      html: repurposedDomainHtml,
    }),
    true,
  )
})

test('Anar Business run returns an empty result when the former domain now consistently redirects to the verified repurposed site', async () => {
  const anarBusiness = await loadAnarBusinessModule()

  const jobs = await anarBusiness.createAnarBusinessScraper().run({
    fetchPage: async () => ({
      status: 200,
      url: 'https://myragems.com/',
      html: repurposedDomainHtml,
    }),
  })

  assert.deepEqual(jobs, [])
})
