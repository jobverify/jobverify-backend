import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Balaji Telefilms Limited : Television, Motion Pictures</title>
  </head>
  <body>
    <nav>
      <!--<a href="http://www.careers.balajitelefilms.com/" target="_blank">Current Openings</a>-->
      <a href="career-opportunity.php">Working at Balaji</a>
    </nav>
    <main>
      <h1>Balaji Telefilms</h1>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Balaji Telefilms Limited : Television, Motion Pictures</title>
  </head>
  <body>
    <main>
      <nav>
        <a href="career-opportunity.php">Working at Balaji</a>
      </nav>
      <!--<header>CURRENT JOB OPENINGS</header>-->
      <p>Please send your resume to <a href="mailto:careers@balajitelefilms.com">careers@balajitelefilms.com</a>.</p>
      <p>For a career with Balaji Telefilms Ltd. please send your resume to careers@balajitelefilms.com.</p>
    </main>
  </body>
</html>
`

const missingRouteHtml = `
<html>
  <head>
    <script language="Javascript">var _skz_pid = "9POBEX80W";</script>
  </head>
  <body>
    <div class="loader" id="sk-loader"></div>
  </body>
</html>
`

const loadBalajiTelefilmsModule = async () => {
  try {
    return await import('../balajitelefilms/script.js')
  } catch {
    assert.fail('Expected Balaji Telefilms scraper module at ../balajitelefilms/script.js')
  }
}

test('Balaji Telefilms verifies the official homepage, email-only careers page, and missing-route guardrails', async () => {
  const balaji = await loadBalajiTelefilmsModule()

  assert.equal(balaji.HOMEPAGE_URL, 'https://www.balajitelefilms.com/')
  assert.equal(balaji.CAREERS_URL, 'https://www.balajitelefilms.com/career-opportunity.php')
  assert.deepEqual(balaji.MISSING_ROUTE_URLS, [
    'https://www.balajitelefilms.com/careers',
    'https://www.balajitelefilms.com/career',
  ])
  assert.equal(balaji.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(balaji.hasVerifiedCareersLink(homepageHtml), true)
  assert.equal(balaji.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(balaji.hasEmailOnlyCareersSignal(careersHtml), true)
  assert.equal(balaji.isVerifiedMissingRoute({ status: 404, html: missingRouteHtml }), true)
  assert.equal(balaji.hasUnexpectedPublicJobsSignal(careersHtml), false)
})

test('Balaji Telefilms returns an honest zero-job result while the careers surface remains email-only', async () => {
  const balaji = await loadBalajiTelefilmsModule()

  const requestedUrls = []
  const jobs = await balaji.createBalajiTelefilmsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === balaji.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === balaji.CAREERS_URL) return { status: 200, url, html: careersHtml }
      return { status: 404, url, html: missingRouteHtml }
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.balajitelefilms.com/',
    'https://www.balajitelefilms.com/career-opportunity.php',
    'https://www.balajitelefilms.com/careers',
    'https://www.balajitelefilms.com/career',
  ])
  assert.deepEqual(jobs, [])
})

test('Balaji Telefilms fails closed if the careers surface turns into a public jobs board', async () => {
  const balaji = await loadBalajiTelefilmsModule()

  const publicListingHtml = `${careersHtml}
    <article class="job-card">
      <h2>Producer</h2>
      <a href="/jobs/producer">Apply now</a>
    </article>`

  await assert.rejects(
    balaji.createBalajiTelefilmsScraper().run({
      fetchPage: async (url) => {
        if (url === balaji.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === balaji.CAREERS_URL) return { status: 200, url, html: publicListingHtml }
        return { status: 404, url, html: missingRouteHtml }
      },
    }),
    /public jobs surface/i,
  )
})

test('Balaji Telefilms can recover with browser-backed pages when direct requests fail', async () => {
  const balaji = await loadBalajiTelefilmsModule()
  const browserUrls = []

  const jobs = await balaji.createBalajiTelefilmsScraper().run({
    fetchPage: async () => {
      throw new TypeError('fetch failed')
    },
    fetchBrowserPage: async (url) => {
      browserUrls.push(url)
      if (url === balaji.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === balaji.CAREERS_URL) return { status: 200, url, html: careersHtml }
      return { status: 404, url, html: missingRouteHtml }
    },
  })

  assert.deepEqual(browserUrls, [
    balaji.HOMEPAGE_URL,
    balaji.CAREERS_URL,
    'https://www.balajitelefilms.com/careers',
    'https://www.balajitelefilms.com/career',
  ])
  assert.deepEqual(jobs, [])
})
