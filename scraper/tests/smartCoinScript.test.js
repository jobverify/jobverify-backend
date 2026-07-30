import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_ABOUT_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Our Journey From a Lending App to a Financial Management Partner</h1>
      <a href="https://smartcoin.keka.com/careers">Jobs</a>
      <footer>
        <p>SmartCoin Financials Pvt. Ltd.</p>
        <p>help@smartcoin.co.in</p>
      </footer>
    </main>
  </body>
</html>
`

const EMPTY_KEKA_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body></body>
</html>
`

const BOOTSTRAP_KEKA_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <meta name="robots" content="noindex">
    <script>
      window.isCareersPage = true;
    </script>
  </head>
  <body>
    <div id="content-container"></div>
    <script>
      fetch('/ats/documents/a6d6f744-09bc-4a25-8a31-edb4868b09bc/careerportal/50951899fde2472ba9b69ebb60f3938e.html')
    </script>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <a href="https://smartcoin.keka.com/careers/jobdetails/72002">Legal Associate Collection</a>
    <a href="https://smartcoin.keka.com/careers/applyjob/72002">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../smartcoin/script.js')
  } catch {
    assert.fail('Expected SmartCoin scraper module at ../smartcoin/script.js')
  }
}

test('SmartCoin sentinel helpers stay pinned to the verified Olyv page, Keka handoff, and portal identity', async () => {
  const smartcoin = await loadModule()

  assert.equal(smartcoin.SOURCE, 'smartcoin')
  assert.equal(smartcoin.COMPANY, 'SmartCoin')
  assert.equal(smartcoin.OFFICIAL_BRAND_NAME, 'SmartCoin Financials Pvt. Ltd.')
  assert.equal(smartcoin.VERIFIED_ON, '2026-07-17')
  assert.equal(smartcoin.CAREERS_PAGE_URL, 'https://www.olyv.co.in/about-us')
  assert.equal(smartcoin.OFFICIAL_CAREERS_HANDOFF_URL, 'https://smartcoin.keka.com/careers')
  assert.match(smartcoin.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(smartcoin.hasOfficialCareersSignal(OFFICIAL_ABOUT_HTML), true)
  assert.equal(
    smartcoin.extractOfficialKekaHandoffUrl(OFFICIAL_ABOUT_HTML),
    'https://smartcoin.keka.com/careers',
  )
  assert.equal(smartcoin.pageExposesPublicJobListings(OFFICIAL_ABOUT_HTML), false)
  assert.equal(smartcoin.pageExposesPublicJobListings(EMPTY_KEKA_SHELL_HTML), false)
  assert.equal(smartcoin.pageExposesPublicJobListings(BOOTSTRAP_KEKA_SHELL_HTML), false)
  assert.equal(smartcoin.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
  assert.equal(
    smartcoin.matchesVerifiedOpaqueKekaState({
      status: 200,
      url: smartcoin.OFFICIAL_CAREERS_HANDOFF_URL,
      html: EMPTY_KEKA_SHELL_HTML,
    }),
    true,
  )
  assert.equal(
    smartcoin.matchesVerifiedOpaqueKekaState({
      status: 200,
      url: smartcoin.OFFICIAL_CAREERS_HANDOFF_URL,
      html: BOOTSTRAP_KEKA_SHELL_HTML,
    }),
    true,
  )
})

test('SmartCoin returns [] only while the verified Olyv page still hands off to an opaque Keka shell', async () => {
  const smartcoin = await loadModule()
  const requestedPages = []

  const jobs = await smartcoin.createSmartCoinScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === smartcoin.CAREERS_PAGE_URL) {
        return { status: 200, url, html: OFFICIAL_ABOUT_HTML }
      }

      if (url === smartcoin.OFFICIAL_CAREERS_HANDOFF_URL) {
        return { status: 200, url, html: EMPTY_KEKA_SHELL_HTML }
      }

      throw new Error(`Unexpected SmartCoin page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    smartcoin.CAREERS_PAGE_URL,
    smartcoin.OFFICIAL_CAREERS_HANDOFF_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('SmartCoin fails closed when the verified Olyv page or Keka root drift materially', async () => {
  const smartcoin = await loadModule()

  await assert.rejects(
    smartcoin.createSmartCoinScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified smartcoin\/olyv about page/i,
  )

  await assert.rejects(
    smartcoin.createSmartCoinScraper().run({
      fetchPage: async (url) => {
        if (url === smartcoin.CAREERS_PAGE_URL) {
          return { status: 200, url, html: OFFICIAL_ABOUT_HTML }
        }

        return { status: 200, url, html: PUBLIC_JOBS_HTML }
      },
    }),
    /keka handoff state changed materially|appears to expose public jobs/i,
  )
})
