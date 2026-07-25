import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const parkedPageHtml = `
  <html lang="en">
    <head>
      <title>tutrhyperloop.com</title>
    </head>
    <body>
      <main>
        <h1>tutrhyperloop.com</h1>
        <p>This domain may be for sale.</p>
        <p>Sponsored Listings</p>
      </main>
    </body>
  </html>
`

const activeCareersPageHtml = `
  <html>
    <head>
      <title>Careers | TuTr Hyperloop</title>
    </head>
    <body>
      <main>
        <h1>Join TuTr Hyperloop</h1>
      </main>
    </body>
  </html>
`

test('verified surface helpers recognize the parked Tutr Hyperloop domain shape', async () => {
  const tutrHyperloop = await loadModule()
  assert.ok(tutrHyperloop, 'Expected Tutr Hyperloop scraper module at ./script.js')

  const {
    CAREER_URLS,
    HOMEPAGE_URL,
    hasParkedDomainTitle,
    hasParkedDomainSignals,
  } = tutrHyperloop

  assert.equal(HOMEPAGE_URL, 'https://tutrhyperloop.com/')
  assert.deepEqual(CAREER_URLS, [
    'https://tutrhyperloop.com/careers',
    'https://tutrhyperloop.com/career',
    'https://tutrhyperloop.com/jobs',
    'https://tutrhyperloop.com/join-us',
  ])
  assert.equal(hasParkedDomainTitle(parkedPageHtml), true)
  assert.equal(hasParkedDomainSignals(parkedPageHtml), true)
  assert.equal(hasParkedDomainSignals(activeCareersPageHtml), false)
})

test('run returns no jobs only while the verified Tutr Hyperloop domain stays parked across the checked first-party routes', async () => {
  const tutrHyperloop = await loadModule()
  assert.ok(tutrHyperloop, 'Expected Tutr Hyperloop scraper module at ./script.js')

  const { CAREER_URLS, HOMEPAGE_URL, createTutrHyperloopScraper } = tutrHyperloop
  const requestedUrls = []

  const jobs = await createTutrHyperloopScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return {
        status: 200,
        url,
        html: parkedPageHtml,
      }
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, ...CAREER_URLS])
  assert.deepEqual(jobs, [])
})

test('Tutr Hyperloop default fetch is bounded by a timeout signal', async () => {
  const tutrHyperloop = await loadModule()
  assert.ok(tutrHyperloop, 'Expected Tutr Hyperloop scraper module at ./script.js')

  let capturedInit = null
  const page = await tutrHyperloop.defaultFetchPage(tutrHyperloop.HOMEPAGE_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        status: 200,
        url,
        text: async () => parkedPageHtml,
      }
    },
  })

  assert.equal(page.status, 200)
  assert.equal(page.url, tutrHyperloop.HOMEPAGE_URL)
  assert.equal(page.html, parkedPageHtml)
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('run fails closed when any checked first-party route stops matching the verified parked-domain surface', async () => {
  const tutrHyperloop = await loadModule()
  assert.ok(tutrHyperloop, 'Expected Tutr Hyperloop scraper module at ./script.js')

  const { CAREER_URLS, HOMEPAGE_URL, createTutrHyperloopScraper } = tutrHyperloop

  await assert.rejects(
    createTutrHyperloopScraper().run({
      fetchPage: async (url) => {
        if (url === HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: parkedPageHtml,
          }
        }

        if (url === CAREER_URLS[0]) {
          return {
            status: 200,
            url,
            html: activeCareersPageHtml,
          }
        }

        return {
          status: 200,
          url,
          html: parkedPageHtml,
        }
      },
    }),
    /Tutr Hyperloop verified first-party surface no longer matches the parked-domain sentinel/i,
  )
})
