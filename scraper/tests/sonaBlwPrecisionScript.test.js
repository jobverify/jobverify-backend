import assert from 'node:assert/strict'
import test from 'node:test'

const CAREER_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sona Comstar - Career</title>
  </head>
  <body>
    <main>
      <h2>Explore A career with sona comstar</h2>
      <p>We are always eager to meet fresh talent.</p>
      <p>Career</p>
      <p>Job</p>
      <h4>OPENING</h4>
      <p>Apply at</p>
      <h4>SONA COMSTAR</h4>
      <button type="button">Upload Resume</button>
      <p>Email : enquiry@sonacomstar.com</p>
    </main>
  </body>
</html>
`

const ABOUT_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sona Comstar - India's leading Auto Components Manufacturer</title>
  </head>
  <body>
    <footer>
      <p>Sona BLW Precision Forgings Limited</p>
      <p>CIN: L27300HR1995PLC083037</p>
      <p>Email : enquiry@sonacomstar.com</p>
      <a href="https://api.procuzy.com/sonacomstar/public/pdf/cautionary_notice_against_fake_employment_or_offers_etc.pdf">
        Cautionary Notice against fake employment or offers etc.
      </a>
    </footer>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"EV Engineer"}
    </script>
    <a href="https://jobs.example.com/sona/ev-engineer">Apply now</a>
  </body>
</html>
`

const TIMEOUT_ERROR = Object.assign(new TypeError('fetch failed'), {
  cause: {
    code: 'UND_ERR_CONNECT_TIMEOUT',
    message: 'Connect Timeout Error',
  },
})

const loadScriptModule = async () => {
  try {
    return await import('../sonablwprecision/script.js')
  } catch {
    assert.fail('Expected Sona BLW Precision scraper module at ../sonablwprecision/script.js')
  }
}

test('Sona BLW Precision helpers stay pinned to the verified resume-upload page and legal-entity footer', async () => {
  const sonaBlwPrecision = await loadScriptModule()

  assert.equal(sonaBlwPrecision.SOURCE, 'sonablwprecision')
  assert.equal(sonaBlwPrecision.COMPANY_NAME, 'Sona BLW Precision')
  assert.equal(
    sonaBlwPrecision.OFFICIAL_BRAND_NAME,
    'Sona BLW Precision Forgings Limited (Sona Comstar)',
  )
  assert.equal(sonaBlwPrecision.VERIFIED_ON, '2026-07-17')
  assert.equal(sonaBlwPrecision.CAREER_PAGE_URL, 'https://sonacomstar.com/career')
  assert.equal(sonaBlwPrecision.ABOUT_PAGE_URL, 'https://sonacomstar.com/pages/about-us')
  assert.equal(
    sonaBlwPrecision.CAUTION_NOTICE_URL,
    'https://api.procuzy.com/sonacomstar/public/pdf/cautionary_notice_against_fake_employment_or_offers_etc.pdf',
  )
  assert.equal(sonaBlwPrecision.hasOfficialCareerPageSignal(CAREER_PAGE_HTML), true)
  assert.equal(sonaBlwPrecision.hasOfficialAboutPageSignal(ABOUT_PAGE_HTML), true)
  assert.equal(
    sonaBlwPrecision.extractCautionNoticeUrl(ABOUT_PAGE_HTML),
    'https://api.procuzy.com/sonacomstar/public/pdf/cautionary_notice_against_fake_employment_or_offers_etc.pdf',
  )
  assert.equal(sonaBlwPrecision.pageExposesPublicJobListings(CAREER_PAGE_HTML), false)
  assert.equal(sonaBlwPrecision.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
  assert.equal(sonaBlwPrecision.isExpectedTimeoutError(TIMEOUT_ERROR), true)
})

test('Sona BLW Precision returns [] while the verified first-party surface remains a resume-upload page with no public jobs', async () => {
  const sonaBlwPrecision = await loadScriptModule()
  const requestedUrls = []

  const jobs = await sonaBlwPrecision.createSonaBlwPrecisionScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === sonaBlwPrecision.CAREER_PAGE_URL) return CAREER_PAGE_HTML
      if (url === sonaBlwPrecision.ABOUT_PAGE_URL) return ABOUT_PAGE_HTML
      throw new Error(`Unexpected Sona BLW Precision URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    sonaBlwPrecision.CAREER_PAGE_URL,
    sonaBlwPrecision.ABOUT_PAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Sona BLW Precision also returns [] on the verified timeout path and fails closed if public jobs appear', async () => {
  const sonaBlwPrecision = await loadScriptModule()

  const jobs = await sonaBlwPrecision.createSonaBlwPrecisionScraper().run({
    fetchText: async () => {
      throw TIMEOUT_ERROR
    },
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    sonaBlwPrecision.createSonaBlwPrecisionScraper().run({
      fetchText: async (url) => {
        if (url === sonaBlwPrecision.CAREER_PAGE_URL) return PUBLIC_JOBS_HTML
        throw new Error(`Unexpected Sona BLW Precision URL: ${url}`)
      },
    }),
    /career page now appears to expose public jobs/i,
  )
})
