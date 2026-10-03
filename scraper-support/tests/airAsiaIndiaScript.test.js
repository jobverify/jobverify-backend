import assert from 'node:assert/strict'
import test from 'node:test'

const airAsiaMoveHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>AirAsia MOVE | Discover deals on flights, hotels, rides &amp; more</title>
  </head>
  <body>
    <h1>AirAsia MOVE</h1>
    <p>Discover deals on flights, hotels, rides &amp; more</p>
    <nav>
      <a href="/flights">Flights</a>
      <a href="/hotels">Hotels</a>
      <a href="/rides">Rides</a>
    </nav>
  </body>
</html>
`

const aixConnectComingSoonHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta name="robots" content="noindex">
    <title>Coming Soon</title>
  </head>
  <body>
    <h1>Coming Soon</h1>
  </body>
</html>
`

const airIndiaExpressCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Air India Express | Career Opportunities | Current Vacancies</title>
  </head>
  <body>
    <h1>Air India Express</h1>
    <h2>Career Opportunities</h2>
    <h3>Current Vacancies</h3>
  </body>
</html>
`

const currentLegacyHomeMissingRoute = JSON.stringify({
  message: 'no Route matched with those values',
  request_id: '649b131d39e4b523d09adb4dc7ac9021',
})
const currentLegacyHomeMissingRouteHtml = '<!doctype html><html><head><title>Error</title></head><body><h1>Error</h1><p>no Route matched with those values.</p><p>request_id: 729c4d47ab906b58b32cd550e82aea55</p></body></html>'

const loadModule = async () => {
  try {
    return await import('../../scraper/airasiaindia/script.js')
  } catch {
    assert.fail('Expected AirAsia India scraper module at ../../scraper/airasiaindia/script.js')
  }
}

test('AirAsia India sentinel pins the verified legacy redirect, parked rebrand host, and merged-brand careers surface', async () => {
  const airAsiaIndia = await loadModule()

  assert.equal(airAsiaIndia.SOURCE, 'airasiaindia')
  assert.equal(airAsiaIndia.COMPANY, 'AirAsia India')
  assert.equal(airAsiaIndia.LEGACY_HOMEPAGE_URL, 'https://www.airasia.com/in/en')
  assert.equal(airAsiaIndia.LEGACY_CAREERS_URL, 'https://www.airasia.com/in/en/careers')
  assert.equal(airAsiaIndia.AIRASIA_MOVE_URL, 'https://www.airasia.com/en/gb')
  assert.equal(airAsiaIndia.AIXCONNECT_HOME_URL, 'https://aixconnect.in/')
  assert.equal(airAsiaIndia.AIXCONNECT_CAREERS_URL, 'https://aixconnect.in/careers')
  assert.equal(airAsiaIndia.AIR_INDIA_EXPRESS_HOME_URL, 'https://www.airindiaexpress.com/home')
  assert.equal(airAsiaIndia.AIR_INDIA_EXPRESS_CAREERS_URL, 'https://www.airindiaexpress.com/careers')

  assert.equal(airAsiaIndia.hasAirAsiaMoveSignal(airAsiaMoveHtml), true)
  assert.equal(airAsiaIndia.hasAixConnectParkedSignal(aixConnectComingSoonHtml), true)
  assert.equal(airAsiaIndia.hasAirIndiaExpressCareersSignal(airIndiaExpressCareersHtml), true)
  assert.equal(airAsiaIndia.isVerifiedMissingLegacyHomepageRoute({
    status: 404,
    url: airAsiaIndia.LEGACY_HOMEPAGE_URL,
    html: currentLegacyHomeMissingRoute,
  }), true)
  assert.equal(airAsiaIndia.isVerifiedMissingLegacyHomepageRoute({
    status: 404,
    url: airAsiaIndia.LEGACY_HOMEPAGE_URL,
    html: currentLegacyHomeMissingRouteHtml,
  }), true)
  assert.equal(airAsiaIndia.isVerifiedMissingLegacyHomepageRoute({
    status: 404,
    url: 'https://unrelated.example/',
    html: currentLegacyHomeMissingRoute,
  }), false)

  assert.equal(
    airAsiaIndia.isVerifiedAirAsiaMoveRedirect({
      status: 200,
      url: airAsiaIndia.AIRASIA_MOVE_URL,
      html: airAsiaMoveHtml,
    }),
    true,
  )
  assert.equal(
    airAsiaIndia.isVerifiedAixConnectParkedPage({
      status: 200,
      url: airAsiaIndia.AIXCONNECT_HOME_URL,
      html: aixConnectComingSoonHtml,
    }, airAsiaIndia.AIXCONNECT_HOME_URL),
    true,
  )
  assert.equal(
    airAsiaIndia.isVerifiedAirIndiaExpressCareersPage({
      status: 200,
      url: airAsiaIndia.AIR_INDIA_EXPRESS_CAREERS_URL,
      html: airIndiaExpressCareersHtml,
    }),
    true,
  )
})

test('AirAsia India returns no jobs only while the verified first-party legacy and merged-brand surfaces remain unchanged', async () => {
  const airAsiaIndia = await loadModule()
  const requestedUrls = []

  const jobs = await airAsiaIndia.createAirAsiaIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === airAsiaIndia.LEGACY_HOMEPAGE_URL) {
        return {
          status: 200,
          url: airAsiaIndia.AIRASIA_MOVE_URL,
          html: airAsiaMoveHtml,
        }
      }

      if (url === airAsiaIndia.LEGACY_CAREERS_URL) {
        return {
          status: 200,
          url: airAsiaIndia.AIRASIA_MOVE_URL,
          html: airAsiaMoveHtml,
        }
      }

      if (url === airAsiaIndia.AIXCONNECT_HOME_URL || url === airAsiaIndia.AIXCONNECT_CAREERS_URL) {
        return {
          status: 200,
          url,
          html: aixConnectComingSoonHtml,
        }
      }

      if (url === airAsiaIndia.AIR_INDIA_EXPRESS_CAREERS_URL) {
        return {
          status: 200,
          url,
          html: airIndiaExpressCareersHtml,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    airAsiaIndia.LEGACY_HOMEPAGE_URL,
    airAsiaIndia.LEGACY_CAREERS_URL,
    airAsiaIndia.AIXCONNECT_HOME_URL,
    airAsiaIndia.AIXCONNECT_CAREERS_URL,
    airAsiaIndia.AIR_INDIA_EXPRESS_CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('AirAsia India accepts the missing legacy home route only when the careers handoff and rebrand checks still pass', async () => {
  const airAsiaIndia = await loadModule()
  const jobs = await airAsiaIndia.createAirAsiaIndiaScraper().run({
    fetchPage: async (url) => {
      if (url === airAsiaIndia.LEGACY_HOMEPAGE_URL) {
        return { status: 404, url, html: currentLegacyHomeMissingRouteHtml }
      }
      if (url === airAsiaIndia.LEGACY_CAREERS_URL) {
        return { status: 200, url: `${airAsiaIndia.AIRASIA_MOVE_URL}/`, html: airAsiaMoveHtml }
      }
      if (url === airAsiaIndia.AIXCONNECT_HOME_URL || url === airAsiaIndia.AIXCONNECT_CAREERS_URL) {
        return { status: 200, url, html: aixConnectComingSoonHtml }
      }
      if (url === airAsiaIndia.AIR_INDIA_EXPRESS_CAREERS_URL) {
        return { status: 200, url, html: airIndiaExpressCareersHtml }
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })
  assert.deepEqual(jobs, [])
})

test('AirAsia India fails closed when the verified redirect, parked page, or merged-brand careers surface drifts', async () => {
  const airAsiaIndia = await loadModule()

  await assert.rejects(
    airAsiaIndia.createAirAsiaIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === airAsiaIndia.LEGACY_HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /legacy homepage no longer matches the verified AirAsia MOVE redirect surface/i,
  )

  await assert.rejects(
    airAsiaIndia.createAirAsiaIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === airAsiaIndia.LEGACY_HOMEPAGE_URL || url === airAsiaIndia.LEGACY_CAREERS_URL) {
          return {
            status: 200,
            url: airAsiaIndia.AIRASIA_MOVE_URL,
            html: airAsiaMoveHtml,
          }
        }

        if (url === airAsiaIndia.AIXCONNECT_HOME_URL) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Jobs</title></head><body><h1>Open roles</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /AIX Connect homepage no longer matches the verified parked rebrand surface/i,
  )

  await assert.rejects(
    airAsiaIndia.createAirAsiaIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === airAsiaIndia.LEGACY_HOMEPAGE_URL || url === airAsiaIndia.LEGACY_CAREERS_URL) {
          return {
            status: 200,
            url: airAsiaIndia.AIRASIA_MOVE_URL,
            html: airAsiaMoveHtml,
          }
        }

        if (url === airAsiaIndia.AIXCONNECT_HOME_URL || url === airAsiaIndia.AIXCONNECT_CAREERS_URL) {
          return {
            status: 200,
            url,
            html: aixConnectComingSoonHtml,
          }
        }

        if (url === airAsiaIndia.AIR_INDIA_EXPRESS_CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Air India Express | Career Opportunities | Current Vacancies</title></head><body><h1>AirAsia India</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /merged-carrier careers handoff no longer matches the verified Air India Express surface/i,
  )
})
