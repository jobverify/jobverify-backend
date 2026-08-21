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

const CAREERS_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="icon" type="image/png" href="/media/images/favicon.png" />
    <script type="module" crossorigin src="/assets/index-chbzrSRS.js"></script>
  </head>
  <body>
    <div id="root">
      <main>
        <h1>Career Opportunities at ACME Solar</h1>
        <p>Careers at ACME Solar</p>
        <a href="/career_form">Join us</a>
      </main>
    </div>
  </body>
</html>
`

const CAREER_FORM_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="icon" type="image/png" href="/media/images/favicon.png" />
    <script type="module" crossorigin src="/assets/index-chbzrSRS.js"></script>
  </head>
  <body>
    <div id="root">
      <form>
        <label>Upload CV*</label>
        <label>Email ID*</label>
        <button>Send Message</button>
        <p>For career opportunities, reach out to us at hr@acme.in</p>
      </form>
    </div>
  </body>
</html>
`

const CAREERS_BUNDLE = `
const headline = "Career Opportunities at ACME Solar";
const body = "Careers at ACME Solar";
const apply = "/career_form";
const contact = "hr@acme.in";
`

const LIVE_STYLE_CAREERS_BUNDLE = `
const hero = "Career Opportunities at ACME Solar";
const nav = "/career_form";
const upload = "Upload CV*";
const email = "Enter Your Email ID*";
const send = "Send Message";
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

test('ACME Solar accepts the verified no-public-jobs careers pages even when the bundle text changes', async () => {
  const acmeSolar = await loadAcmeSolarModule()

  const jobs = await acmeSolar.createAcmeSolarScraper().run({
    fetchText: async (url) => {
      if (url === acmeSolar.HOMEPAGE_URL) return APP_SHELL_HTML
      if (url === acmeSolar.CAREERS_URL) return CAREERS_PAGE_HTML
      if (url === acmeSolar.CAREER_FORM_URL) return CAREER_FORM_PAGE_HTML
      if (url === 'https://www.acmesolar.in/assets/index-chbzrSRS.js') {
        return 'const hydrationOnly = true;'
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('ACME Solar accepts the live bundle when the official form flow remains but the legacy contact email string disappears', async () => {
  const acmeSolar = await loadAcmeSolarModule()

  const jobs = await acmeSolar.createAcmeSolarScraper().run({
    fetchText: async (url) => {
      if (
        url === acmeSolar.HOMEPAGE_URL
        || url === acmeSolar.CAREERS_URL
        || url === acmeSolar.CAREER_FORM_URL
      ) {
        return APP_SHELL_HTML
      }

      if (url === 'https://www.acmesolar.in/assets/index-chbzrSRS.js') {
        return LIVE_STYLE_CAREERS_BUNDLE
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

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
