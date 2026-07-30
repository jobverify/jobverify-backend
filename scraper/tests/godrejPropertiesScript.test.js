import assert from 'node:assert/strict'
import test from 'node:test'

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Godrej Properties</h1>
      <p>Crafting spaces that spark joy, one community, one family, one home at a time.</p>
      <a href="https://careers.godrejindustries.com/in/en/godrejproperties">Work with us</a>
      <p>Copyright © 2026. Godrej Properties</p>
    </main>
  </body>
</html>
`

const CURRENT_HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Godrej Properties</h1>
      <p>Crafting spaces that spark joy, one community, one family, one home at a time.</p>
      <a href="https://careers.godrejindustries.com/in/en/godrejproperties">Work with us</a>
      <p>Copyright © 2026 . Godrej Properties</p>
    </main>
  </body>
</html>
`

const ABOUT_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>About Godrej Properties</h1>
      <p>At Godrej Properties, we are driven by a singular purpose, Crafting Joy.</p>
      <p>As part of the Godrej Industries Group, we combine a 129-year legacy of trust and excellence with a forward-looking vision to shape the future of urban India.</p>
      <p>At the heart of our journey is our team a diverse, driven collective united by purpose and ambition.</p>
      <a href="https://careers.godrejindustries.com/in/en/godrejproperties">Work with Us</a>
    </main>
  </body>
</html>
`

const SHARED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Work with us</h1>
      <h2>Work with Godrej Properties</h2>
      <p>Discover exciting roles across 8 dynamic business units</p>
      <h3>Connect with us</h3>
      <p>© Godrej Industries Limited 2026. All rights reserved.</p>
    </main>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current openings</h1>
    <a href="https://careeropportunities.godrejindustries.com/CareerWEB/vacancy-details?SRNO=31354">Rental Sales Bangalore</a>
    <a href="https://careeropportunities.godrejindustries.com/CareerWEB/vacancy-details?SRNO=31354&apply=true">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../godrejproperties/script.js')
  } catch {
    assert.fail('Expected Godrej Properties scraper module at ../godrejproperties/script.js')
  }
}

test('Godrej Properties sentinel helpers stay pinned to the verified first-party handoff and shared-parent shell', async () => {
  const godrejProperties = await loadModule()

  assert.equal(godrejProperties.SOURCE, 'godrejproperties')
  assert.equal(godrejProperties.COMPANY, 'Godrej Properties')
  assert.equal(godrejProperties.OFFICIAL_BRAND_NAME, 'Godrej Properties')
  assert.equal(godrejProperties.VERIFIED_ON, '2026-07-17')
  assert.equal(godrejProperties.HOMEPAGE_URL, 'https://www.godrejproperties.com/')
  assert.equal(godrejProperties.ABOUT_US_URL, 'https://www.godrejproperties.com/know-us/about')
  assert.equal(
    godrejProperties.SHARED_CAREERS_URL,
    'https://careers.godrejindustries.com/in/en/godrejproperties',
  )
  assert.match(godrejProperties.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(godrejProperties.extractWorkWithUsUrl(HOMEPAGE_HTML), godrejProperties.SHARED_CAREERS_URL)
  assert.equal(godrejProperties.extractWorkWithUsUrl(ABOUT_HTML), godrejProperties.SHARED_CAREERS_URL)
  assert.equal(godrejProperties.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(godrejProperties.hasOfficialHomepageSignal(CURRENT_HOMEPAGE_HTML), true)
  assert.equal(godrejProperties.hasAboutUsSignal(ABOUT_HTML), true)
  assert.equal(godrejProperties.hasSharedCareersShellSignal(SHARED_CAREERS_HTML), true)
  assert.equal(godrejProperties.pageExposesPublicJobListings(HOMEPAGE_HTML), false)
  assert.equal(godrejProperties.pageExposesPublicJobListings(SHARED_CAREERS_HTML), false)
  assert.equal(godrejProperties.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
})

test('Godrej Properties returns [] only while the verified first-party handoff and shared-parent shell remain unchanged', async () => {
  const godrejProperties = await loadModule()
  const requestedUrls = []

  const jobs = await godrejProperties.createGodrejPropertiesScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === godrejProperties.HOMEPAGE_URL) {
        return { status: 200, url, html: HOMEPAGE_HTML }
      }

      if (url === godrejProperties.ABOUT_US_URL) {
        return { status: 200, url, html: ABOUT_HTML }
      }

      if (url === godrejProperties.SHARED_CAREERS_URL) {
        return { status: 200, url, html: SHARED_CAREERS_HTML }
      }

      throw new Error(`Unexpected Godrej Properties URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    godrejProperties.HOMEPAGE_URL,
    godrejProperties.ABOUT_US_URL,
    godrejProperties.SHARED_CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Godrej Properties fails closed when the first-party handoff or shared-parent shell drifts into a public jobs surface', async () => {
  const godrejProperties = await loadModule()

  await assert.rejects(
    godrejProperties.createGodrejPropertiesScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified first-party homepage|verified first-party about page|shared Godrej Properties careers shell/i,
  )

  await assert.rejects(
    godrejProperties.createGodrejPropertiesScraper().run({
      fetchPage: async (url) => {
        if (url === godrejProperties.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === godrejProperties.ABOUT_US_URL) {
          return { status: 200, url, html: ABOUT_HTML }
        }

        return { status: 200, url, html: PUBLIC_JOBS_HTML }
      },
    }),
    /public jobs surface|shared Godrej Properties careers shell/i,
  )
})
