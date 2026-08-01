import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>ionic</title>
  </head>
  <body>
    <nav>
      <a href="/about">About</a>
      <a href="https://dev.api.ionic.trade/">View Documentation</a>
      <a href="/demo">Live Demo</a>
      <a href="https://t.me/ionictrade">Contact Us</a>
    </nav>
    <p>Solana Trading Infrastructure</p>
    <h1>Real-time Trading Data for Solana</h1>
    <p>
      Access live market data, historical charts, holder analytics, and trader insights through our
      high-performance API.
    </p>
  </body>
</html>
`

const loadIonicTradingModule = async () => {
  try {
    return await import('../../scraper/ionictrading/script.js')
  } catch {
    assert.fail('Expected Ionic Trading scraper module at ../../scraper/ionictrading/script.js')
  }
}

test('Ionic Trading scraper helpers stay pinned to the verified homepage-only first-party surface', async () => {
  const ionicTrading = await loadIonicTradingModule()

  assert.equal(ionicTrading.SOURCE, 'ionictrading')
  assert.equal(ionicTrading.COMPANY, 'Ionic Trading')
  assert.equal(ionicTrading.COMPANY_DOMAIN, 'ionic.trade')
  assert.equal(ionicTrading.HOMEPAGE_URL, 'https://ionic.trade/')
  assert.equal(ionicTrading.DOCUMENTATION_URL, 'https://dev.api.ionic.trade/')
  assert.equal(ionicTrading.VERIFIED_AT, '2026-07-17')
  assert.deepEqual(ionicTrading.ADJACENT_ROUTE_URLS, [
    'https://ionic.trade/about',
    'https://ionic.trade/careers',
    'https://ionic.trade/jobs',
    'https://ionic.trade/contact',
  ])
  assert.equal(ionicTrading.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(ionicTrading.hasLinkedPublicJobsSurface(homepageHtml), false)
  assert.equal(
    ionicTrading.isExpectedUnavailableSurface({ errorKind: 'dns', status: null, html: null }),
    true,
  )
  assert.equal(
    ionicTrading.isUnexpectedReachableSurface({
      status: 200,
      html: '<html><body><h1>Careers</h1><a href="/apply">Apply now</a></body></html>',
    }),
    true,
  )
})

test('Ionic Trading run returns [] while the verified homepage stays intact and no public jobs routes are verified', async () => {
  const ionicTrading = await loadIonicTradingModule()
  const requestedUrls = []

  const jobs = await ionicTrading.createIonicTradingScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === ionicTrading.HOMEPAGE_URL) return homepageHtml
      throw new Error(`Unexpected homepage URL: ${url}`)
    },
    probeUrl: async (url) => ({
      url,
      finalUrl: url,
      status: null,
      html: null,
      errorKind: 'dns',
    }),
  })

  assert.deepEqual(requestedUrls, [ionicTrading.HOMEPAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Ionic Trading fails closed when the homepage drifts, links a jobs surface, or an adjacent careers route becomes reachable', async () => {
  const ionicTrading = await loadIonicTradingModule()

  await assert.rejects(
    ionicTrading.createIonicTradingScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
      probeUrl: async () => ({
        status: null,
        html: null,
        errorKind: 'dns',
      }),
    }),
    /verified homepage/i,
  )

  await assert.rejects(
    ionicTrading.createIonicTradingScraper().run({
      fetchText: async () =>
        homepageHtml.replace(
          '</nav>',
          '<a href="https://ionic.trade/careers">Careers</a></nav>',
        ),
      probeUrl: async () => ({
        status: null,
        html: null,
        errorKind: 'dns',
      }),
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    ionicTrading.createIonicTradingScraper().run({
      fetchText: async () => homepageHtml,
      probeUrl: async (url) => {
        if (url === 'https://ionic.trade/careers') {
          return {
            url,
            finalUrl: url,
            status: 200,
            html: '<html><body><h1>Current Openings</h1><a href="/apply">Apply now</a></body></html>',
            errorKind: null,
          }
        }

        return {
          url,
          finalUrl: url,
          status: null,
          html: null,
          errorKind: 'dns',
        }
      },
    }),
    /public jobs surface/i,
  )
})
