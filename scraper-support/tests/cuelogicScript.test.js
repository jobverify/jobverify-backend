import assert from 'node:assert/strict'
import test from 'node:test'

const searchHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>LTIMindtree Careers</title>
  </head>
  <body>
    <h1>Search jobs</h1>
    <div>LTIMindtree</div>
    <div>Results <b>0</b> of <b>0</b></div>
    <p>There are currently no open positions matching "Cuelogic".</p>
  </body>
</html>
`

const currentSearchHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Cuelogic - LTM Jobs</title>
  </head>
  <body>
    <div>LTIMindtree</div>
    <h1>Search results for "Cuelogic".</h1>
    <p>There are currently no open positions matching " Cuelogic ".</p>
    <p>The 0 most recent jobs posted by LTM are listed below for your convenience.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/cuelogic/script.js')
  } catch {
    assert.fail('Expected Cuelogic scraper module at ../../scraper/cuelogic/script.js')
  }
}

test('Cuelogic sentinel pins the verified LTIMindtree search query and current TLS outage wording', async () => {
  const cuelogic = await loadModule()

  assert.equal(cuelogic.SOURCE, 'cuelogic')
  assert.equal(cuelogic.COMPANY, 'Cuelogic')
  assert.equal(cuelogic.VERIFIED_ON, '2026-08-04')
  assert.equal(cuelogic.HOMEPAGE_URL, 'https://www.ltm.com/careers')
  assert.equal(cuelogic.CAREERS_URL, 'https://careers.ltimindtree.com/search/')
  assert.equal(
    cuelogic.VERIFIED_JOBS_MICROSITE_URL,
    'https://careers.ltimindtree.com/Microsite/content/View-Jobs/',
  )
  assert.equal(cuelogic.BROKEN_REDIRECT_HOST, 'careers.ltimindtree.com')
  assert.equal(cuelogic.BROKEN_REDIRECT_CERTIFICATE_HOST, 'certificate-not-found.jobs2web.com')
  assert.match(cuelogic.VERIFIED_SURFACE_SUMMARY, /Tuesday, August 4, 2026/i)
  assert.match(cuelogic.VERIFIED_SURFACE_SUMMARY, /careers\.ltimindtree\.com/i)
  assert.match(cuelogic.VERIFIED_SURFACE_SUMMARY, /certificate-not-found\.jobs2web\.com/i)
  assert.equal(
    cuelogic.buildSearchUrl(),
    'https://careers.ltimindtree.com/search/?createNewAlert=false&q=Cuelogic&optionsFacetsDD_country=&optionsFacetsDD_location=&locationsearch=',
  )
  assert.equal(cuelogic.isTrustedSearchRoute(cuelogic.buildSearchUrl()), true)
  assert.equal(
    cuelogic.isTrustedSearchRoute('https://careers.ltm.com/search/?createNewAlert=false&q=Cuelogic&optionsFacetsDD_country=&optionsFacetsDD_location=&locationsearch='),
    false,
  )
  assert.equal(cuelogic.hasVerifiedEmptySearchSignal(searchHtml), true)
  assert.equal(cuelogic.hasVerifiedEmptySearchSignal(currentSearchHtml), true)
  assert.equal(cuelogic.pageExposesOpenJobs(searchHtml), false)
})

test('Cuelogic sentinel returns no jobs while the verified parent board still shows an empty result set', async () => {
  const cuelogic = await loadModule()
  const requestedUrls = []

  const jobs = await cuelogic.createCuelogicScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return {
        status: 200,
        url,
        html: searchHtml,
      }
    },
  })

  assert.deepEqual(requestedUrls, [cuelogic.buildSearchUrl()])
  assert.deepEqual(jobs, [])
})

test('Cuelogic sentinel fails closed when the LTIMindtree search route redirects to a different careers host', async () => {
  const cuelogic = await loadModule()

  await assert.rejects(
    cuelogic.createCuelogicScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://careers.ltm.com/search/?createNewAlert=false&q=Cuelogic&optionsFacetsDD_country=&optionsFacetsDD_location=&locationsearch=',
        html: searchHtml,
      }),
    }),
    /redirected away from the trusted careers surface/i,
  )
})

test('Cuelogic sentinel returns [] when the verified careers.ltimindtree.com certificate mismatch is still active', async () => {
  const cuelogic = await loadModule()

  const tlsError = new TypeError('fetch failed')
  tlsError.cause = {
    code: 'ERR_TLS_CERT_ALTNAME_INVALID',
    message:
      "Hostname/IP does not match certificate's altnames: Host: careers.ltimindtree.com. is not in the cert's altnames: DNS:certificate-not-found.jobs2web.com",
  }
  assert.equal(cuelogic.isKnownBrokenCareersRedirectTlsFailure(tlsError), true)

  const jobs = await cuelogic.createCuelogicScraper().run({
    fetchPage: async () => {
      throw tlsError
    },
  })

  assert.deepEqual(jobs, [])
})

test('Cuelogic sentinel recognizes wrapped retry errors for the verified careers.ltimindtree.com TLS outage', async () => {
  const cuelogic = await loadModule()

  const tlsError = new TypeError('fetch failed')
  tlsError.cause = {
    code: 'ERR_TLS_CERT_ALTNAME_INVALID',
    message:
      "Hostname/IP does not match certificate's altnames: Host: careers.ltimindtree.com. is not in the cert's altnames: DNS:certificate-not-found.jobs2web.com",
  }
  const wrappedRetryError = new Error(
    "[cuelogic] All 3 attempts failed. Last error: fetch failed | Hostname/IP does not match certificate's altnames: Host: careers.ltimindtree.com. is not in the cert's altnames: DNS:certificate-not-found.jobs2web.com",
    { cause: tlsError },
  )

  assert.equal(cuelogic.isKnownBrokenCareersRedirectTlsFailure(wrappedRetryError), true)

  const jobs = await cuelogic.createCuelogicScraper().run({
    fetchPage: async () => {
      throw wrappedRetryError
    },
  })

  assert.deepEqual(jobs, [])
})

test('Cuelogic sentinel fails closed if the parent board no longer exposes the verified empty-state', async () => {
  const cuelogic = await loadModule()

  await assert.rejects(
    cuelogic.createCuelogicScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>Search jobs</h1><div>LTIMindtree</div></body></html>',
      }),
    }),
    /verified LTIMindtree empty-search surface/i,
  )
})
