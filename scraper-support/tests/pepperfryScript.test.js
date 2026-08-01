import assert from 'node:assert/strict'
import test from 'node:test'

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Buy Furniture & Home Decor Online – Up to 65% Off at Best Prices in India | Pepperfry</title>
  </head>
  <body>
    <h1>Buy Furniture Online at Pepperfry- India's All-in-One Furniture Solution for Your Needs</h1>
    <div>Corporate Governance</div>
    <div>Pepperfry in the News</div>
    <footer>
      <a href="https://www.pepperfry.com/pages/careers.html?type=footer">Careers</a>
    </footer>
  </body>
</html>
`

const MISSING_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Online Furniture Shopping Store: Shop Online in India for Furniture, Home Decor, Homeware Products @ Pepperfry</title>
  </head>
  <body>
    <h1>404-Soul Not Found</h1>
    <p>Page Also Not Found</p>
    <a href="/customer/needhelp/contactus">Contact Us</a>
    <button>GO BACK & RETRY</button>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Open Positions</h1>
    <a href="https://boards.greenhouse.io/pepperfry">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/pepperfry/script.js')
  } catch {
    assert.fail('Expected Pepperfry scraper module at ../../scraper/pepperfry/script.js')
  }
}

test('Pepperfry sentinel helpers stay pinned to the verified homepage footer link and missing careers page', async () => {
  const pepperfry = await loadModule()

  assert.equal(pepperfry.COMPANY, 'Pepperfry')
  assert.equal(pepperfry.OFFICIAL_BRAND_NAME, 'Pepperfry')
  assert.equal(pepperfry.VERIFIED_ON, '2026-07-17')
  assert.equal(pepperfry.HOMEPAGE_URL, 'https://www.pepperfry.com/')
  assert.equal(
    pepperfry.CAREERS_PAGE_URL,
    'https://www.pepperfry.com/pages/careers.html?type=footer',
  )
  assert.equal(pepperfry.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(
    pepperfry.extractVerifiedCareersPageUrl(HOMEPAGE_HTML),
    'https://www.pepperfry.com/pages/careers.html?type=footer',
  )
  assert.equal(pepperfry.hasMissingCareersSurfaceSignal(MISSING_CAREERS_HTML), true)
  assert.equal(pepperfry.pageExposesPublicJobListings(HOMEPAGE_HTML), false)
  assert.equal(pepperfry.pageExposesPublicJobListings(MISSING_CAREERS_HTML), false)
  assert.equal(pepperfry.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
})

test('Pepperfry returns [] when the verified homepage points to the first-party missing careers page', async () => {
  const pepperfry = await loadModule()
  const requestedUrls = []

  const jobs = await pepperfry.createPepperfryScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === pepperfry.HOMEPAGE_URL) {
        return { status: 200, url, html: HOMEPAGE_HTML }
      }

      if (url === pepperfry.CAREERS_PAGE_URL) {
        return { status: 200, url, html: MISSING_CAREERS_HTML }
      }

      throw new Error(`Unexpected Pepperfry URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    pepperfry.HOMEPAGE_URL,
    pepperfry.CAREERS_PAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Pepperfry fails closed when the verified homepage link or careers surface changes into a public jobs board', async () => {
  const pepperfry = await loadModule()

  await assert.rejects(
    pepperfry.createPepperfryScraper().run({
      fetchPage: async (url) => {
        if (url === pepperfry.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }

        throw new Error(`Unexpected Pepperfry URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    pepperfry.createPepperfryScraper().run({
      fetchPage: async (url) => {
        if (url === pepperfry.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: HOMEPAGE_HTML.replace(
              'https://www.pepperfry.com/pages/careers.html?type=footer',
              'https://www.pepperfry.com/pages/jobs.html',
            ),
          }
        }

        throw new Error(`Unexpected Pepperfry URL: ${url}`)
      },
    }),
    /verified homepage careers handoff/i,
  )

  await assert.rejects(
    pepperfry.createPepperfryScraper().run({
      fetchPage: async (url) => {
        if (url === pepperfry.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === pepperfry.CAREERS_PAGE_URL) {
          return { status: 200, url, html: PUBLIC_JOBS_HTML }
        }

        throw new Error(`Unexpected Pepperfry URL: ${url}`)
      },
    }),
    /careers surface now appears to expose public jobs/i,
  )

  await assert.rejects(
    pepperfry.createPepperfryScraper().run({
      fetchPage: async (url) => {
        if (url === pepperfry.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === pepperfry.CAREERS_PAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Careers</h1></body></html>' }
        }

        throw new Error(`Unexpected Pepperfry URL: ${url}`)
      },
    }),
    /verified missing careers surface changed materially/i,
  )
})
