import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Careers</h1>
    <a href="https://lexmark.wd1.myworkdayjobs.com/Lexmark">Search all jobs</a>
  </body>
</html>
`

const WORKDAY_OUTAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="https://community.workday.com/outage-page/40755" />
  </head>
  <body>
    <h1>Workday is not available</h1>
  </body>
</html>
`

const WORKDAY_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <a href="https://lexmark.wd1.myworkdayjobs.com/Lexmark/job/Kolkata/Application-Security-Test-Analyst_12345">Application Security Test Analyst</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/lexmarkinternational/script.js')
  } catch {
    assert.fail('Expected Lexmark International scraper module at ../../scraper/lexmarkinternational/script.js')
  }
}

test('Lexmark International exposes the verified careers handoff and Workday outage sentinel helpers', async () => {
  const lexmark = await loadModule()

  assert.equal(lexmark.SOURCE, 'lexmarkinternational')
  assert.equal(lexmark.COMPANY, 'Lexmark International')
  assert.equal(lexmark.OFFICIAL_BRAND_NAME, 'Lexmark')
  assert.equal(lexmark.VERIFIED_ON, '2026-07-18')
  assert.equal(lexmark.CAREERS_URL, 'https://www.lexmark.com/en_us/about-us/careers.html')
  assert.equal(lexmark.WORKDAY_BASE_URL, 'https://lexmark.wd1.myworkdayjobs.com/Lexmark')
  assert.equal(lexmark.WORKDAY_OUTAGE_URL, 'https://community.workday.com/outage-page/40755')
  assert.equal(lexmark.hasOfficialCareersSignal(CAREERS_PAGE_HTML), true)
  assert.equal(
    lexmark.extractVerifiedWorkdayHandoffUrl(CAREERS_PAGE_HTML),
    lexmark.WORKDAY_BASE_URL,
  )
  assert.equal(lexmark.hasWorkdayOutageSignal(WORKDAY_OUTAGE_HTML), true)
  assert.equal(lexmark.hasPublicJobsSignal(WORKDAY_JOBS_HTML), true)
})

test('Lexmark International returns [] only while the verified Workday handoff still resolves to the outage page', async () => {
  const lexmark = await loadModule()
  const requestedUrls = []

  const jobs = await lexmark.createLexmarkInternationalScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === lexmark.CAREERS_URL) return CAREERS_PAGE_HTML
      if (url === lexmark.WORKDAY_BASE_URL) return WORKDAY_OUTAGE_HTML
      throw new Error(`Unexpected Lexmark International URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [lexmark.CAREERS_URL, lexmark.WORKDAY_BASE_URL])
  assert.deepEqual(jobs, [])
})

test('Lexmark International fails closed when the careers handoff drifts or the public Workday board comes back', async () => {
  const lexmark = await loadModule()

  await assert.rejects(
    lexmark.createLexmarkInternationalScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    lexmark.createLexmarkInternationalScraper().run({
      fetchText: async (url) => {
        if (url === lexmark.CAREERS_URL) return CAREERS_PAGE_HTML
        return WORKDAY_JOBS_HTML
      },
    }),
    /surface now appears to expose public jobs/i,
  )
})
