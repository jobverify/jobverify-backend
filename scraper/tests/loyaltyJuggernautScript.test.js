import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'loyaltyjuggernaut',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const HOMEPAGE_HTML = readFixture('homepage.html')
const ABOUT_HTML = readFixture('about-us.html')
const MISSING_ROUTE_HTML = readFixture('missing-route-404.html')

const loadModule = async () => {
  try {
    return await import('../loyaltyjuggernaut/script.js')
  } catch {
    assert.fail('Expected Loyalty Juggernaut scraper module at ../loyaltyjuggernaut/script.js')
  }
}

test('Loyalty Juggernaut scraper recognizes the verified homepage, about page, and missing-route careers surfaces', async () => {
  const loyaltyJuggernaut = await loadModule()

  assert.equal(loyaltyJuggernaut.SOURCE, 'loyaltyjuggernaut')
  assert.equal(loyaltyJuggernaut.COMPANY, 'Loyalty Juggernaut')
  assert.equal(loyaltyJuggernaut.HOMEPAGE_URL, 'https://www.lji.io/')
  assert.equal(loyaltyJuggernaut.ABOUT_URL, 'https://www.lji.io/about-us')
  assert.deepEqual(loyaltyJuggernaut.CAREERS_ROUTE_URLS, [
    'https://www.lji.io/careers',
    'https://www.lji.io/careers/',
    'https://www.lji.io/jobs',
    'https://www.lji.io/join-us',
  ])
  assert.equal(loyaltyJuggernaut.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(loyaltyJuggernaut.hasOfficialAboutSignal(ABOUT_HTML), true)
  assert.equal(loyaltyJuggernaut.hasFirstPartyCareerLikeLink(HOMEPAGE_HTML), false)
  assert.equal(loyaltyJuggernaut.hasFirstPartyCareerLikeLink(ABOUT_HTML), false)
  assert.equal(loyaltyJuggernaut.hasPublicJobsSignal(HOMEPAGE_HTML), false)
  assert.equal(loyaltyJuggernaut.hasPublicJobsSignal(ABOUT_HTML), false)
  assert.equal(
    loyaltyJuggernaut.isVerifiedMissingCareersRoute({
      status: 404,
      html: MISSING_ROUTE_HTML,
    }),
    true,
  )
  assert.equal(
    loyaltyJuggernaut.isVerifiedMissingCareersRoute({
      status: 200,
      html: MISSING_ROUTE_HTML,
    }),
    false,
  )
})

test('Loyalty Juggernaut returns no jobs only while the verified homepage, about page, and missing careers routes remain unchanged', async () => {
  const loyaltyJuggernaut = await loadModule()
  const requestedUrls = []

  const jobs = await loyaltyJuggernaut.createLoyaltyJuggernautScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === loyaltyJuggernaut.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: HOMEPAGE_HTML,
        }
      }

      if (url === loyaltyJuggernaut.ABOUT_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: ABOUT_HTML,
        }
      }

      if (loyaltyJuggernaut.CAREERS_ROUTE_URLS.includes(url)) {
        return {
          status: 404,
          url,
          headers: {},
          html: MISSING_ROUTE_HTML,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    loyaltyJuggernaut.HOMEPAGE_URL,
    loyaltyJuggernaut.ABOUT_URL,
    ...loyaltyJuggernaut.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Loyalty Juggernaut fails closed when the verified homepage, about page, or careers routes drift', async () => {
  const loyaltyJuggernaut = await loadModule()

  await assert.rejects(
    loyaltyJuggernaut.createLoyaltyJuggernautScraper().run({
      fetchPage: async (url) => {
        if (url === loyaltyJuggernaut.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><head><title>Unexpected</title></head><body>No LJI markers</body></html>',
          }
        }

        if (url === loyaltyJuggernaut.ABOUT_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: ABOUT_HTML,
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: MISSING_ROUTE_HTML,
        }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    loyaltyJuggernaut.createLoyaltyJuggernautScraper().run({
      fetchPage: async (url) => {
        if (url === loyaltyJuggernaut.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: HOMEPAGE_HTML,
          }
        }

        if (url === loyaltyJuggernaut.ABOUT_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><head><title>About Us</title></head><body>Broken</body></html>',
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: MISSING_ROUTE_HTML,
        }
      },
    }),
    /verified about page/i,
  )

  await assert.rejects(
    loyaltyJuggernaut.createLoyaltyJuggernautScraper().run({
      fetchPage: async (url) => {
        if (url === loyaltyJuggernaut.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: HOMEPAGE_HTML,
          }
        }

        if (url === loyaltyJuggernaut.ABOUT_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: ABOUT_HTML,
          }
        }

        if (url === loyaltyJuggernaut.CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><body><h1>Careers</h1><a href="/jobs/platform-engineer">Apply now</a></body></html>',
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: MISSING_ROUTE_HTML,
        }
      },
    }),
    /careers routes changed materially or now expose public jobs/i,
  )
})
