import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers at Spaulding Ridge | Join Our Team</title>
    </head>
    <body>
      <main>
        <span>about us</span>
        <h1>Careers</h1>
        <p>Join Spaulding Ridge for a transformative experience in your career journey</p>
        <a href="https://spauldingridge.com/about-us/open-positions">View Open Roles</a>
      </main>
    </body>
  </html>
`

const openPositionsShellHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Open Positions | Join Spaulding Ridge Careers</title>
    </head>
    <body>
      <main>
        <h1>Become Part of the Band</h1>
        <p>Join our award-winning global team. Take a look at our open positions below.</p>
        <p>Learn more about our hiring process and get tips on how to apply and prepare for your dream role.</p>
      </main>
    </body>
  </html>
`

test('Spaulding Ridge scraper recognizes the verified official careers handoff and empty open-positions shell', async () => {
  const spauldingRidge = await loadModule()
  assert.ok(spauldingRidge, 'Spaulding Ridge scraper module should load')

  assert.equal(
    spauldingRidge.CAREERS_URL,
    'https://spauldingridge.com/about-us/careers',
  )
  assert.equal(
    spauldingRidge.OPEN_POSITIONS_URL,
    'https://spauldingridge.com/about-us/open-positions',
  )
  assert.equal(spauldingRidge.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    spauldingRidge.extractOpenPositionsUrl(careersHtml),
    'https://spauldingridge.com/about-us/open-positions',
  )
  assert.equal(spauldingRidge.hasOpenPositionsShellSignal(openPositionsShellHtml), true)
  assert.equal(spauldingRidge.pageExposesPublicJobListings(openPositionsShellHtml), false)
})

test('Spaulding Ridge scraper returns no jobs while the official open-positions page exposes no public job board', async () => {
  const spauldingRidge = await loadModule()
  assert.ok(spauldingRidge, 'Spaulding Ridge scraper module should load')

  const requestedUrls = []
  const jobs = await spauldingRidge.createSpauldingRidgeScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === spauldingRidge.CAREERS_URL) return careersHtml
      if (url === spauldingRidge.OPEN_POSITIONS_URL) return openPositionsShellHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    spauldingRidge.CAREERS_URL,
    spauldingRidge.OPEN_POSITIONS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Spaulding Ridge scraper fails closed when the official careers handoff changes or public job links appear', async () => {
  const spauldingRidge = await loadModule()
  assert.ok(spauldingRidge, 'Spaulding Ridge scraper module should load')

  await assert.rejects(
    spauldingRidge.createSpauldingRidgeScraper().run({
      fetchText: async (url) => {
        if (url === spauldingRidge.CAREERS_URL) {
          return careersHtml.replace(
            'https://spauldingridge.com/about-us/open-positions',
            'https://spauldingridge.com/about-us/careers/open-role/123',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified open positions surface/i,
  )

  await assert.rejects(
    spauldingRidge.createSpauldingRidgeScraper().run({
      fetchText: async (url) => {
        if (url === spauldingRidge.CAREERS_URL) return careersHtml
        if (url === spauldingRidge.OPEN_POSITIONS_URL) {
          return `
            <html lang="en">
              <head>
                <title>Open Positions | Join Spaulding Ridge Careers</title>
              </head>
              <body>
                <main>
                  <h1>Become Part of the Band</h1>
                  <p>Join our award-winning global team. Take a look at our open positions below.</p>
                  <p>Learn more about our hiring process and get tips on how to apply and prepare for your dream role.</p>
                  <a href="https://jobs.lever.co/spauldingridge/senior-consultant">Senior Consultant</a>
                </main>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public job board/i,
  )
})
