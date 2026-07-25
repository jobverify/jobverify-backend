import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadLegionModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Legion Energy Products pvt ltd. scraper module at ./script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures')

const homepageHtml = fs.readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = fs.readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')
const missingRouteHtml = fs.readFileSync(path.join(fixturesDir, 'missing-route-404.html'), 'utf8')

test('Legion Energy Products pvt ltd. scraper validates the verified homepage, careers page, and missing careers routes', async () => {
  const legion = await loadLegionModule()

  assert.equal(legion.SOURCE, 'legionenergyproductspvtltd')
  assert.equal(legion.COMPANY, 'Legion Energy Products pvt ltd.')
  assert.equal(legion.HOMEPAGE_URL, 'https://legionenergy.in/')
  assert.equal(legion.CAREERS_URL, 'https://legionenergy.in/careers/')
  assert.deepEqual(legion.MISSING_ROUTE_URLS, [
    'https://legionenergy.in/career',
    'https://legionenergy.in/jobs',
    'https://legionenergy.in/join-us',
  ])
  assert.equal(legion.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(legion.hasVerifiedCareersLink(homepageHtml), true)
  assert.equal(legion.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(legion.extractCultureCardTitles(careersHtml), legion.EXPECTED_CULTURE_CARD_TITLES)
  assert.equal(legion.hasEmailOnlyCareersSignal(careersHtml), true)
  assert.equal(legion.hasSuspiciousPublicJobsSignal(careersHtml), false)
  assert.equal(
    legion.isVerifiedMissingRoute({
      status: 404,
      html: missingRouteHtml,
    }),
    true,
  )
})

test('Legion Energy Products pvt ltd. scraper returns no jobs while the verified first-party careers surface remains email-only', async () => {
  const legion = await loadLegionModule()
  const requestedUrls = []

  const jobs = await legion.createLegionEnergyProductsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === legion.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === legion.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (legion.MISSING_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    legion.HOMEPAGE_URL,
    legion.CAREERS_URL,
    ...legion.MISSING_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Legion Energy Products pvt ltd. scraper fails closed when the verified zero-job surface drifts', async () => {
  const legion = await loadLegionModule()

  await assert.rejects(
    legion.createLegionEnergyProductsScraper().run({
      fetchPage: async (url) => {
        if (url === legion.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Placeholder</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    legion.createLegionEnergyProductsScraper().run({
      fetchPage: async (url) => {
        if (url === legion.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === legion.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace(
              '</body>',
              `
                <section>
                  <h2>Current Openings</h2>
                  <a href="/careers/sales-engineer">Sales Engineer</a>
                </section>
              </body>
              `,
            ),
          }
        }

        if (legion.MISSING_ROUTE_URLS.includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public jobs surface|email-only careers surface/i,
  )

  await assert.rejects(
    legion.createLegionEnergyProductsScraper().run({
      fetchPage: async (url) => {
        if (url === legion.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === legion.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === legion.MISSING_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Jobs - Legion Energy</title></head><body><h1>Vacancies</h1></body></html>',
          }
        }

        if (legion.MISSING_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /missing careers routes changed materially/i,
  )
})
