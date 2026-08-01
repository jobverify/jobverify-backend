import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Zen3</title>
  </head>
  <body>
    <h1>Who are we?</h1>
    <p>zen3 is a customer focussed travel solutions company powered by Human and Artificial Intelligence.</p>
    <p>London, United kingdom</p>
    <p>hyderabad, india</p>
  </body>
</html>
`

const missingRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>404 Not Found</title>
  </head>
  <body>
    <h1>Not Found</h1>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/zen3infosolutions/script.js')
  } catch {
    assert.fail('Expected Zen3 Info Solutions scraper module at ../../scraper/zen3infosolutions/script.js')
  }
}

test('Zen3 Info Solutions validates the homepage and missing careers routes before returning no jobs', async () => {
  const zen3 = await loadModule()

  assert.equal(zen3.SOURCE, 'zen3infosolutions')
  assert.equal(zen3.COMPANY, 'Zen3 Info Solutions')
  assert.equal(zen3.HOMEPAGE_URL, 'https://zen3.com/')
  assert.equal(zen3.VERIFIED_ON, '2026-07-18')
  assert.equal(zen3.hasOfficialHomepageSignal(homepageHtml), true)

  const jobs = await zen3.createZen3InfoSolutionsScraper().run({
    fetchPage: async (url) => ({
      status: url === zen3.HOMEPAGE_URL ? 200 : 404,
      url,
      html: url === zen3.HOMEPAGE_URL ? homepageHtml : missingRouteHtml,
    }),
  })

  assert.deepEqual(jobs, [])
})

test('Zen3 Info Solutions fails closed if a first-party careers route starts returning a live jobs page', async () => {
  const zen3 = await loadModule()

  await assert.rejects(
    zen3.createZen3InfoSolutionsScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: url === zen3.HOMEPAGE_URL
          ? homepageHtml
          : '<html><body><h1>Careers</h1><a href="/careers/software-engineer">Software Engineer</a></body></html>',
      }),
    }),
    /verified no-public-careers surface changed/i,
  )
})
