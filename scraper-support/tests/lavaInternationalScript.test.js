import assert from 'node:assert/strict'
import test from 'node:test'

const aboutPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About LAVA– Indian Mobile Phone Company, Smartphone Manufacturer in India</title>
  </head>
  <body>
    <h1>About Lava</h1>
    <h2>Our Culture and Philosophy</h2>
    <p>A strong culture is what separates great companies from those that perish sooner or later.</p>
    <p>The greater its contribution to others, the greater is the power that is bestowed upon it.</p>
    <footer>Copyright © Lava International Limited</footer>
  </body>
</html>
`

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Lava Mobiles - Career Opportunities in Telecom</title>
  </head>
  <body>
    <h1>Join Us</h1>
    <p>It is not just a career. It’s an opportunity that lets you create possibilities.</p>
    <p>At Lava, it's more than just a career—it's an opportunity to shape the future.</p>
    <a href="https://www.lavamobiles.com/career/joblist">Apply Now</a>
  </body>
</html>
`

const jobListPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <script id="__NEXT_DATA__" type="application/json">
      {"props":{"pageProps":{}},"page":"/career/joblist","query":{}}
    </script>
  </head>
  <body>
    <p>Clear Filter</p>
    <label>Job Title :</label>
    <p>Upload Resume</p>
    <footer>Copyright © Lava International Limited</footer>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Open Positions</h1>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Software Engineer"}
    </script>
  </body>
</html>
`

const emptyOpenPositionsPayload = []
const nonEmptyOpenPositionsPayload = [{ id: 101, designation: 'general' }]

const loadModule = async () => {
  try {
    return await import('../../scraper/lavainternational/script.js')
  } catch {
    assert.fail('Expected Lava International scraper module at ../../scraper/lavainternational/script.js')
  }
}

test('Lava International scraper exports the verified empty-openposition API contract', async () => {
  const lavainternational = await loadModule()

  assert.equal(lavainternational.COMPANY, 'Lava International')
  assert.equal(lavainternational.OFFICIAL_BRAND_NAME, 'Lava International Limited')
  assert.equal(lavainternational.VERIFIED_ON, '2026-08-17')
  assert.equal(lavainternational.HOMEPAGE_URL, 'https://www.lavamobiles.com/')
  assert.equal(lavainternational.ABOUT_PAGE_URL, 'https://www.lavamobiles.com/aboutus')
  assert.equal(lavainternational.CAREERS_URL, 'https://www.lavamobiles.com/career')
  assert.equal(lavainternational.APPLICATION_URL, 'https://www.lavamobiles.com/career/joblist')
  assert.equal(
    lavainternational.OPEN_POSITION_LIST_API_URL,
    'https://www.lavamobiles.com/api/openpositionlist',
  )
  assert.equal(lavainternational.hasOfficialAboutPageSignal(aboutPageHtml), true)
  assert.equal(lavainternational.hasCareersLandingSignal(careersPageHtml), true)
  assert.equal(lavainternational.hasJobListPageSignal(jobListPageHtml), true)
  assert.equal(lavainternational.hasEmptyOpenPositionListPayload(emptyOpenPositionsPayload), true)
  assert.equal(lavainternational.hasEmptyOpenPositionListPayload(nonEmptyOpenPositionsPayload), false)
  assert.equal(lavainternational.pageExposesPublicJobListings(aboutPageHtml), false)
  assert.equal(lavainternational.pageExposesPublicJobListings(careersPageHtml), false)
  assert.equal(lavainternational.pageExposesPublicJobListings(jobListPageHtml), false)
  assert.equal(lavainternational.pageExposesPublicJobListings(publicJobsHtml), true)
})

test('Lava International returns [] while the live corporate pages stay stable and the open-position API is empty', async () => {
  const lavainternational = await loadModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await lavainternational.createLavaInternationalScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === lavainternational.ABOUT_PAGE_URL) {
        return { ok: true, status: 200, url, text: aboutPageHtml }
      }

      if (url === lavainternational.CAREERS_URL) {
        return { ok: true, status: 200, url, text: careersPageHtml }
      }

      if (url === lavainternational.APPLICATION_URL) {
        return { ok: true, status: 200, url, text: jobListPageHtml }
      }

      throw new Error(`Unexpected Lava International page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === lavainternational.OPEN_POSITION_LIST_API_URL) return emptyOpenPositionsPayload
      throw new Error(`Unexpected Lava International JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    lavainternational.ABOUT_PAGE_URL,
    lavainternational.CAREERS_URL,
    lavainternational.APPLICATION_URL,
  ])
  assert.deepEqual(requestedJson, [lavainternational.OPEN_POSITION_LIST_API_URL])
  assert.deepEqual(jobs, [])
})

test('Lava International returns [] when the verified pages stay stable and the current open-position API temporarily responds with the known first-party 500', async () => {
  const lavainternational = await loadModule()

  const jobs = await lavainternational.createLavaInternationalScraper().run({
    fetchPage: async (url) => {
      if (url === lavainternational.ABOUT_PAGE_URL) {
        return { ok: true, status: 200, url, text: aboutPageHtml }
      }

      if (url === lavainternational.CAREERS_URL) {
        return { ok: true, status: 200, url, text: careersPageHtml }
      }

      if (url === lavainternational.APPLICATION_URL) {
        return { ok: true, status: 200, url, text: jobListPageHtml }
      }

      throw new Error(`Unexpected Lava International page URL: ${url}`)
    },
    fetchJson: async () => {
      throw new Error(`HTTP 500 for ${lavainternational.OPEN_POSITION_LIST_API_URL}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Lava International fails closed when the live corporate pages or open-position API drift', async () => {
  const lavainternational = await loadModule()

  await assert.rejects(
    lavainternational.createLavaInternationalScraper().run({
      fetchPage: async (url) => {
        if (url === lavainternational.ABOUT_PAGE_URL) {
          return { ok: true, status: 200, url, text: '<html><body>Unexpected</body></html>' }
        }
        throw new Error(`Unexpected Lava International page URL: ${url}`)
      },
    }),
    /verified official about page/i,
  )

  await assert.rejects(
    lavainternational.createLavaInternationalScraper().run({
      fetchPage: async (url) => {
        if (url === lavainternational.ABOUT_PAGE_URL) {
          return { ok: true, status: 200, url, text: aboutPageHtml }
        }
        if (url === lavainternational.CAREERS_URL) {
          return { ok: true, status: 200, url, text: publicJobsHtml }
        }
        throw new Error(`Unexpected Lava International page URL: ${url}`)
      },
    }),
    /verified careers landing page/i,
  )

  await assert.rejects(
    lavainternational.createLavaInternationalScraper().run({
      fetchPage: async (url) => {
        if (url === lavainternational.ABOUT_PAGE_URL) {
          return { ok: true, status: 200, url, text: aboutPageHtml }
        }
        if (url === lavainternational.CAREERS_URL) {
          return { ok: true, status: 200, url, text: careersPageHtml }
        }
        if (url === lavainternational.APPLICATION_URL) {
          return { ok: true, status: 200, url, text: publicJobsHtml }
        }
        throw new Error(`Unexpected Lava International page URL: ${url}`)
      },
    }),
    /verified job-list page/i,
  )

  await assert.rejects(
    lavainternational.createLavaInternationalScraper().run({
      fetchPage: async (url) => {
        if (url === lavainternational.ABOUT_PAGE_URL) {
          return { ok: true, status: 200, url, text: aboutPageHtml }
        }
        if (url === lavainternational.CAREERS_URL) {
          return { ok: true, status: 200, url, text: careersPageHtml }
        }
        if (url === lavainternational.APPLICATION_URL) {
          return { ok: true, status: 200, url, text: jobListPageHtml }
        }
        throw new Error(`Unexpected Lava International page URL: ${url}`)
      },
      fetchJson: async () => nonEmptyOpenPositionsPayload,
    }),
    /verified open-position api changed materially/i,
  )
})
