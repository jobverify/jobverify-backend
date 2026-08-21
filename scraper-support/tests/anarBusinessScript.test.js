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
