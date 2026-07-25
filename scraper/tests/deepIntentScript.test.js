import assert from 'node:assert/strict'
import test from 'node:test'

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>DeepIntent | Healthcare Marketing Demand Side Platform</title>
  </head>
  <body>
    <nav>
      <a href="https://deepintent.com/about-us">About Us</a>
      <a href="https://deepintent.com/careers">Careers</a>
      <a href="https://deepintent.com/contact-us">Contact Us</a>
    </nav>
    <h1>the leading Healthcare Advertising Platform</h1>
    <p>Shaping the Future of Healthcare Advertising</p>
  </body>
</html>
`

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | DeepIntent</title>
  </head>
  <body>
    <nav>
      <a href="https://deepintent.com/careers">Careers</a>
      <a href="https://deepintent.com/contact-us">Contact Us</a>
    </nav>
    <h1>Careers</h1>
    <h2>Innovate at the Heart of Healthcare and Advertising with Us</h2>
    <p>Open Positions</p>
    <p>Who we are</p>
    <h2>The People Who Power the Platform</h2>
    <h2>Our Promise to All DeepIntent Employees</h2>
    <h2>Join Our Team</h2>
    <h2>Why Work at DeepIntent?</h2>
    <h2>Open Positions</h2>
    <p>Ready to join the best in the business and work on cutting-edge technology solutions that improve outcomes?</p>
    <p>updates@deepintent.com</p>
  </body>
</html>
`

const loadDeepIntentModule = async () => {
  try {
    return await import('../deepintent/script.js')
  } catch {
    assert.fail('Expected DeepIntent scraper module at ../deepintent/script.js')
  }
}

test('DeepIntent sentinel constants stay pinned to the verified homepage and careers shell', async () => {
  const deepIntent = await loadDeepIntentModule()

  assert.equal(deepIntent.SOURCE, 'deepintent')
  assert.equal(deepIntent.COMPANY, 'DeepIntent')
  assert.equal(deepIntent.HOMEPAGE_URL, 'https://deepintent.com/')
  assert.equal(deepIntent.CAREERS_URL, 'https://deepintent.com/careers')
  assert.equal(deepIntent.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(deepIntent.extractCareersUrl(HOMEPAGE_HTML), deepIntent.CAREERS_URL)
  assert.equal(deepIntent.hasVerifiedCareersShell(CAREERS_HTML), true)
  assert.equal(deepIntent.extractLikelyJobLinks(CAREERS_HTML).length, 0)
})

test('DeepIntent sentinel returns [] only while the verified careers shell stays a no-public-jobs surface', async () => {
  const deepIntent = await loadDeepIntentModule()
  const requestedUrls = []

  const jobs = await deepIntent.createDeepIntentScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === deepIntent.HOMEPAGE_URL) {
        return { status: 200, url, html: HOMEPAGE_HTML }
      }

      if (url === deepIntent.CAREERS_URL) {
        return { status: 200, url, html: CAREERS_HTML }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [deepIntent.HOMEPAGE_URL, deepIntent.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('DeepIntent sentinel fails closed when the homepage handoff or careers shell drifts into a public jobs surface', async () => {
  const deepIntent = await loadDeepIntentModule()

  await assert.rejects(
    deepIntent.createDeepIntentScraper().run({
      fetchPage: async (url) => {
        if (url === deepIntent.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Unexpected</body></html>' }
        }

        return { status: 200, url, html: CAREERS_HTML }
      },
    }),
    /homepage no longer matches/i,
  )

  await assert.rejects(
    deepIntent.createDeepIntentScraper().run({
      fetchPage: async (url) => {
        if (url === deepIntent.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        return {
          status: 200,
          url,
          html: `
            <html>
              <head><title>Careers | DeepIntent</title></head>
              <body>
                <h1>Careers</h1>
                <h2>Open Positions</h2>
                <a href="https://jobs.lever.co/deepintent/software-engineer">Software Engineer</a>
              </body>
            </html>
          `,
        }
      },
    }),
    /appears to expose public job links/i,
  )

  await assert.rejects(
    deepIntent.createDeepIntentScraper().run({
      fetchPage: async (url) => {
        if (url === deepIntent.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        return {
          status: 200,
          url,
          html: CAREERS_HTML.replace('Innovate at the Heart of Healthcare and Advertising with Us', 'Join us'),
        }
      },
    }),
    /verified first-party careers page/i,
  )
})
