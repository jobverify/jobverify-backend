import assert from 'node:assert/strict'
import test from 'node:test'

const APP_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="icon" type="image/png" href="/media/images/favicon.png" />
    <script type="module" crossorigin src="/assets/index-chbzrSRS.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const CAREERS_BUNDLE = `
const headline = "Career Opportunities at ACME Solar";
const body = "Careers at ACME Solar";
const apply = "/career_form";
const contact = "hr@acme.in";
`

const loadAcmeSolarModule = async () => {
  try {
    return await import('../../scraper/acmesolar/script.js')
  } catch {
    assert.fail('Expected ACME Solar scraper module at ../../scraper/acmesolar/script.js')
  }
}

test('ACME Solar pins the verified official SPA careers and career form surface', async () => {
  const acmeSolar = await loadAcmeSolarModule()

  assert.equal(acmeSolar.SOURCE, 'acmesolar')
  assert.equal(acmeSolar.COMPANY, 'ACME Solar')
  assert.equal(acmeSolar.COMPANY_DOMAIN, 'acmesolar.in')
  assert.equal(acmeSolar.VERIFIED_AT, '2026-07-19')
  assert.equal(acmeSolar.HOMEPAGE_URL, 'https://www.acmesolar.in/')
  assert.equal(acmeSolar.CAREERS_URL, 'https://www.acmesolar.in/career')
  assert.equal(acmeSolar.CAREER_FORM_URL, 'https://www.acmesolar.in/career_form')
  assert.equal(acmeSolar.APPLY_EMAIL, 'hr@acme.in')
  assert.equal(acmeSolar.hasOfficialAppShellSignal(APP_SHELL_HTML), true)
  assert.equal(acmeSolar.hasOfficialCareersBundleSignal(CAREERS_BUNDLE), true)
  assert.equal(acmeSolar.hasPublicJobListingsSignal(CAREERS_BUNDLE), false)
  assert.deepEqual(acmeSolar.extractScriptAssetUrls(APP_SHELL_HTML, acmeSolar.CAREERS_URL), [
    'https://www.acmesolar.in/assets/index-chbzrSRS.js',
  ])
})

test('ACME Solar run verifies the live official no-public-jobs SPA before returning []', async () => {
  const acmeSolar = await loadAcmeSolarModule()
  const requestedUrls = []

  const jobs = await acmeSolar.createAcmeSolarScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (
        url === acmeSolar.HOMEPAGE_URL
        || url === acmeSolar.CAREERS_URL
        || url === acmeSolar.CAREER_FORM_URL
      ) {
        return APP_SHELL_HTML
      }

      if (url === 'https://www.acmesolar.in/assets/index-chbzrSRS.js') {
        return CAREERS_BUNDLE
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    acmeSolar.HOMEPAGE_URL,
    acmeSolar.CAREERS_URL,
    acmeSolar.CAREER_FORM_URL,
    'https://www.acmesolar.in/assets/index-chbzrSRS.js',
  ])
  assert.deepEqual(jobs, [])
})

test('ACME Solar fails closed when the verified no-jobs SPA shape changes or jobs appear', async () => {
  const acmeSolar = await loadAcmeSolarModule()

  await assert.rejects(
    acmeSolar.createAcmeSolarScraper().run({
      fetchText: async (url) => {
        if (url === acmeSolar.HOMEPAGE_URL) return '<html><body>Different site</body></html>'
        return APP_SHELL_HTML
      },
    }),
    /official ACME Solar web app shell/i,
  )

  await assert.rejects(
    acmeSolar.createAcmeSolarScraper().run({
      fetchText: async (url) => {
        if (
          url === acmeSolar.HOMEPAGE_URL
          || url === acmeSolar.CAREERS_URL
          || url === acmeSolar.CAREER_FORM_URL
        ) {
          return APP_SHELL_HTML
        }

        if (url === 'https://www.acmesolar.in/assets/index-chbzrSRS.js') {
          return 'const headline = "Career Opportunities at Another Company";'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers bundle no longer matches/i,
  )

  await assert.rejects(
    acmeSolar.createAcmeSolarScraper().run({
      fetchText: async (url) => {
        if (
          url === acmeSolar.HOMEPAGE_URL
          || url === acmeSolar.CAREERS_URL
          || url === acmeSolar.CAREER_FORM_URL
        ) {
          return APP_SHELL_HTML
        }

        if (url === 'https://www.acmesolar.in/assets/index-chbzrSRS.js') {
          return `${CAREERS_BUNDLE}; const api = "/api/jobs"; const label = "Current Openings";`
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public jobs surface/i,
  )
})
