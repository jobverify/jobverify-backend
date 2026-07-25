import assert from 'node:assert/strict'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures')

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('career.html')

const missingEmploymentPage = {
  status: 404,
  url: 'https://www.urcindia.com/Employment.aspx',
  html: `
    <html>
      <head>
        <title>404 Not Found</title>
      </head>
      <body>
        <a href="/Default.aspx">Home</a>
        <a href="/Career.aspx">Careers</a>
        <a href="/contact-us.aspx">Contact Us</a>
      </body>
    </html>
  `,
}

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected URC Construction scraper module at ./script.js')
  }
}

test('URC Construction recognizes the verified official no-listings hiring surface', async () => {
  const urc = await loadModule()

  assert.equal(urc.SOURCE, 'urcconstruction')
  assert.equal(urc.COMPANY, 'URC Construction')
  assert.equal(urc.HOMEPAGE_URL, 'https://www.urcindia.com/Default.aspx')
  assert.equal(urc.CAREERS_URL, 'https://www.urcindia.com/Career.aspx')
  assert.deepEqual(urc.NON_LISTING_ROUTE_URLS, [
    'https://www.urcindia.com/Employment.aspx',
  ])

  assert.equal(urc.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(urc.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(urc.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(urc.hasPublicJobsSignal(careersHtml), false)
  assert.equal(urc.hasOfficialAtsSignal(careersHtml), false)
  assert.equal(urc.isVerifiedMissingNonListingRoute(missingEmploymentPage), true)
})

test('URC Construction returns no jobs only while the verified first-party surface remains a resume-upload form', async () => {
  const urc = await loadModule()
  const requestedUrls = []

  const jobs = await urc.createUrcConstructionScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === urc.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === urc.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === urc.NON_LISTING_ROUTE_URLS[0]) {
        return { ...missingEmploymentPage, url }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    urc.HOMEPAGE_URL,
    urc.CAREERS_URL,
    ...urc.NON_LISTING_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('URC Construction fails closed when the official no-listings surface drifts', async () => {
  const urc = await loadModule()

  await assert.rejects(
    urc.createUrcConstructionScraper().run({
      fetchPage: async (url) => {
        if (url === urc.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Placeholder</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    urc.createUrcConstructionScraper().run({
      fetchPage: async (url) => {
        if (url === urc.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === urc.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace(
              '</body>',
              '<section><h2>Current Openings</h2><a href="/Career.aspx?job=site-engineer">Apply Now</a></section></body>',
            ),
          }
        }
        if (url === urc.NON_LISTING_ROUTE_URLS[0]) return { ...missingEmploymentPage, url }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public jobs|no-listings surface/i,
  )

  await assert.rejects(
    urc.createUrcConstructionScraper().run({
      fetchPage: async (url) => {
        if (url === urc.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === urc.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace(
              '</body>',
              '<a href="https://jobs.lever.co/urcconstruction/site-engineer">Apply via ATS</a></body>',
            ),
          }
        }
        if (url === urc.NON_LISTING_ROUTE_URLS[0]) return { ...missingEmploymentPage, url }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official ats|no-listings surface/i,
  )

  await assert.rejects(
    urc.createUrcConstructionScraper().run({
      fetchPage: async (url) => {
        if (url === urc.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === urc.CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === urc.NON_LISTING_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Employment</h1><a href="/Career.aspx?job=1">Apply Now</a></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /non-listing routes changed materially|public careers surface/i,
  )
})
