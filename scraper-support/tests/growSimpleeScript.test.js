import assert from 'node:assert/strict'
import test from 'node:test'

const API_DOCS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Blitz External APIs</title>
  </head>
  <body>
    <h1>Blitz External APIs</h1>
    <h2>Getting Started</h2>
    <p>You may get started by visiting our website and get credentials by signing up in our portal</p>
    <h2>Support</h2>
    <p>For help regarding accessing the Postman API, feel free to discuss it in our Community. You can also drop in a line at tech@growsimplee.com.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/growsimplee/script.js')
  } catch {
    assert.fail('Expected GrowSimplee scraper module at ../../scraper/growsimplee/script.js')
  }
}

test('GrowSimplee pins the verified API docs surface and expected unavailable first-party route states', async () => {
  const growSimplee = await loadModule()

  assert.equal(growSimplee.SOURCE, 'growsimplee')
  assert.equal(growSimplee.COMPANY, 'GrowSimplee')
  assert.equal(growSimplee.OFFICIAL_BRAND_NAME, 'GrowSimplee')
  assert.equal(growSimplee.COMPANY_DOMAIN, 'growsimplee.com')
  assert.equal(growSimplee.VERIFIED_ON, '2026-07-17')
  assert.equal(growSimplee.HOMEPAGE_URL, 'https://growsimplee.com/')
  assert.equal(growSimplee.CAREERS_URL, 'https://growsimplee.com/careers')
  assert.equal(growSimplee.TRUSTED_API_DOCS_URL, 'https://api-docs.growsimplee.com/')
  assert.deepEqual(growSimplee.ROUTE_EXPECTATIONS, [
    { url: 'https://growsimplee.com/', errorKind: 'timeout' },
    { url: 'https://www.growsimplee.com/', errorKind: 'tls' },
    { url: 'https://growsimplee.com/careers', errorKind: 'timeout' },
    { url: 'https://www.growsimplee.com/careers', errorKind: 'tls' },
    { url: 'https://growsimplee.com/jobs', errorKind: 'timeout' },
    { url: 'https://www.growsimplee.com/jobs', errorKind: 'tls' },
    { url: 'https://growsimplee.com/about', errorKind: 'timeout' },
    { url: 'https://www.growsimplee.com/about', errorKind: 'tls' },
  ])
  assert.equal(growSimplee.hasVerifiedApiDocsSignal(API_DOCS_HTML), true)
  assert.equal(growSimplee.hasVerifiedApiDocsSignal('<html><body><h1>GrowSimplee</h1></body></html>'), false)
  assert.equal(
    growSimplee.isExpectedUnavailableSurface(
      { status: null, html: null, errorKind: 'timeout' },
      'timeout',
    ),
    true,
  )
  assert.equal(
    growSimplee.isExpectedUnavailableSurface(
      { status: null, html: null, errorKind: 'tls' },
      'timeout',
    ),
    false,
  )
  assert.equal(
    growSimplee.isUnexpectedReachableSurface({
      status: 200,
      html: '<html><body><h1>Careers</h1><a href="/apply">Apply now</a></body></html>',
    }),
    true,
  )
})

test('GrowSimplee run verifies the trusted docs surface and exact-name route failures before returning []', async () => {
  const growSimplee = await loadModule()
  const requestedPages = []
  const requestedProbes = []

  const jobs = await growSimplee.createGrowSimpleeScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === growSimplee.TRUSTED_API_DOCS_URL) {
        return {
          status: 200,
          url,
          html: API_DOCS_HTML,
        }
      }

      throw new Error(`Unexpected GrowSimplee page URL: ${url}`)
    },
    probeUrl: async (url) => {
      requestedProbes.push(url)
      const expectation = growSimplee.ROUTE_EXPECTATIONS.find((item) => item.url === url)

      if (!expectation) {
        throw new Error(`Unexpected GrowSimplee probe URL: ${url}`)
      }

      return {
        url,
        finalUrl: url,
        status: null,
        html: null,
        errorKind: expectation.errorKind,
      }
    },
  })

  assert.deepEqual(requestedPages, [growSimplee.TRUSTED_API_DOCS_URL])
  assert.deepEqual(
    requestedProbes,
    growSimplee.ROUTE_EXPECTATIONS.map((item) => item.url),
  )
  assert.deepEqual(jobs, [])
})

test('GrowSimplee fails closed when the trusted docs page drifts or a first-party route becomes reachable', async () => {
  const growSimplee = await loadModule()

  await assert.rejects(
    growSimplee.createGrowSimpleeScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: growSimplee.TRUSTED_API_DOCS_URL,
        html: API_DOCS_HTML.replace('tech@growsimplee.com', 'ops@example.com'),
      }),
      probeUrl: async () => ({
        status: null,
        html: null,
        errorKind: 'timeout',
      }),
    }),
    /verified api docs surface/i,
  )

  await assert.rejects(
    growSimplee.createGrowSimpleeScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: growSimplee.TRUSTED_API_DOCS_URL,
        html: API_DOCS_HTML,
      }),
      probeUrl: async (url) => {
        if (url === growSimplee.CAREERS_URL) {
          return {
            url,
            finalUrl: url,
            status: 200,
            html: '<html><body><h1>Current openings</h1><a href="/apply">Apply now</a></body></html>',
            errorKind: null,
          }
        }

        const expectation = growSimplee.ROUTE_EXPECTATIONS.find((item) => item.url === url)
        return {
          url,
          finalUrl: url,
          status: null,
          html: null,
          errorKind: expectation?.errorKind ?? 'timeout',
        }
      },
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    growSimplee.createGrowSimpleeScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: growSimplee.TRUSTED_API_DOCS_URL,
        html: API_DOCS_HTML,
      }),
      probeUrl: async (url) => {
        if (url === 'https://www.growsimplee.com/') {
          return {
            url,
            finalUrl: url,
            status: null,
            html: null,
            errorKind: 'dns',
          }
        }

        const expectation = growSimplee.ROUTE_EXPECTATIONS.find((item) => item.url === url)
        return {
          url,
          finalUrl: url,
          status: null,
          html: null,
          errorKind: expectation?.errorKind ?? 'timeout',
        }
      },
    }),
    /verified first-party route state changed materially/i,
  )
})
