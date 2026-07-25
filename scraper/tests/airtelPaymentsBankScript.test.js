import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Airtel Payments Bank: The Safe Second Account for Daily Transactions</title>
  </head>
  <body>
    <nav>
      <span>Company</span>
      <a href="https://www.airtelpayments.bank.in/static/about-us">About Us</a>
      <a href="https://www.airtelpayments.bank.in/static/leadership-team">Leadership Team</a>
      <a href="https://www.airtelpayments.bank.in/static/in-the-news">Awards, News &amp; Blogs</a>
    </nav>
    <h1>Keep Your Main Account Safe</h1>
    <p>Open a Safe Second Account with Airtel Payments Bank</p>
    <p>Empowering Indians, Everywhere.</p>
    <p>News, Blogs &amp; Awards</p>
  </body>
</html>
`

const aboutPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us | Airtel Payments Bank</title>
  </head>
  <body>
    <h1>About Airtel Payments Bank</h1>
    <h2>Bharti Airtel's Banking Venture</h2>
    <p>As India’s first Payments Bank, we aim to give every Indian access to an equal, effective, and trustworthy banking experience.</p>
    <p>Airtel Payments Bank was launched in January 2017, by Bharti Airtel, India’s largest telecom provider.</p>
    <p>Meet our board of directors</p>
  </body>
</html>
`

const careersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="description" content="Airtel Careers"/>
    <title>Airtel Careers</title>
    <script defer="defer" src="/static/js/main.57023176.js"></script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`

const verifiedBundleText = `
!function(){var e={145:function(e){"use strict";e.exports=JSON.parse('{"baseURL":"","darwinboxURL":"https://airtel.darwinbox.in/ms/candidatev2/main/careers/allJobs","imagePath":"/images/UploadFile/","apiUrl":"https://careersapi.airtel.com/"}')}};var productTile={title:"Airtel Payments Bank",description:"Pioneers of Digital Transformations"};}();
`

const bundleWithDistinctBankRoute = `
!function(){var e={145:function(e){"use strict";e.exports=JSON.parse('{"baseURL":"","darwinboxURL":"https://airtel.darwinbox.in/ms/candidatev2/main/careers/allJobs","imagePath":"/images/UploadFile/","apiUrl":"https://careersapi.airtel.com/"}')}};var careersRoute="https://www.airtelpayments.bank.in/careers";var productTile={title:"Airtel Payments Bank"};}();
`

const darwinboxShellHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <base href="/ms/candidatev2/">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
    <script type="module" src="/ms/dboxuilibrary/assets/dboxuilib_dist/www/build/db-components.esm.js"></script>
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`

const loadAirtelPaymentsBankModule = async () => {
  try {
    return await import('../airtelpaymentsbank/script.js')
  } catch {
    assert.fail('Expected Airtel Payments Bank scraper module at ../airtelpaymentsbank/script.js')
  }
}

test('Airtel Payments Bank validates the branded bank pages plus the shared Airtel careers shell, bundle, and Darwinbox handoff', async () => {
  const airtelPaymentsBank = await loadAirtelPaymentsBankModule()

  assert.equal(airtelPaymentsBank.SOURCE, 'airtelpaymentsbank')
  assert.equal(airtelPaymentsBank.COMPANY, 'Airtel Payments Bank')
  assert.equal(airtelPaymentsBank.OFFICIAL_BRAND_NAME, 'Airtel Payments Bank')
  assert.equal(airtelPaymentsBank.VERIFIED_AT, '2026-07-15')
  assert.equal(airtelPaymentsBank.HOMEPAGE_URL, 'https://www.airtelpayments.bank.in/')
  assert.equal(
    airtelPaymentsBank.ABOUT_PAGE_URL,
    'https://www.airtelpayments.bank.in/static/about-us',
  )
  assert.equal(airtelPaymentsBank.PARENT_CAREERS_URL, 'https://careers.airtel.com/')
  assert.equal(
    airtelPaymentsBank.SHARED_CAREERS_BUNDLE_URL,
    'https://careers.airtel.com/static/js/main.57023176.js',
  )
  assert.equal(
    airtelPaymentsBank.SHARED_DARWINBOX_URL,
    'https://airtel.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    airtelPaymentsBank.SHARED_CAREERS_API_URL,
    'https://careersapi.airtel.com/',
  )
  assert.equal(
    airtelPaymentsBank.extractMainBundleUrl(careersShellHtml),
    airtelPaymentsBank.SHARED_CAREERS_BUNDLE_URL,
  )
  assert.equal(airtelPaymentsBank.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(airtelPaymentsBank.hasOfficialAboutPageSignal(aboutPageHtml), true)
  assert.equal(airtelPaymentsBank.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(
    airtelPaymentsBank.hasPublicJobsSignal('<a href="https://jobs.lever.co/airtel">Current openings</a>'),
    true,
  )
  assert.equal(airtelPaymentsBank.hasCareersHandoffLink(homepageHtml), false)
  assert.equal(
    airtelPaymentsBank.hasCareersHandoffLink('<a href="https://careers.airtel.com/">Careers</a>'),
    true,
  )
  assert.equal(airtelPaymentsBank.hasSharedAirtelCareersShellSignal(careersShellHtml), true)
  assert.equal(
    airtelPaymentsBank.hasAirtelPaymentsBankBundleReference(verifiedBundleText),
    true,
  )
  assert.equal(
    airtelPaymentsBank.hasDistinctAirtelPaymentsBankCareerRoute(verifiedBundleText),
    false,
  )
  assert.equal(
    airtelPaymentsBank.hasDistinctAirtelPaymentsBankCareerRoute(bundleWithDistinctBankRoute),
    true,
  )
  assert.equal(
    airtelPaymentsBank.hasVerifiedSharedBundleSignal(verifiedBundleText),
    true,
  )
  assert.equal(
    airtelPaymentsBank.hasSharedDarwinboxShellSignal(darwinboxShellHtml),
    true,
  )
})

test('Airtel Payments Bank returns no jobs while the verified public surface remains branded bank pages plus the shared Airtel careers board', async () => {
  const airtelPaymentsBank = await loadAirtelPaymentsBankModule()
  const requestedUrls = []

  const jobs = await airtelPaymentsBank.createAirtelPaymentsBankScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === airtelPaymentsBank.HOMEPAGE_URL) {
        return homepageHtml
      }

      if (url === airtelPaymentsBank.ABOUT_PAGE_URL) {
        return aboutPageHtml
      }

      if (url === airtelPaymentsBank.PARENT_CAREERS_URL) {
        return careersShellHtml
      }

      if (url === airtelPaymentsBank.SHARED_CAREERS_BUNDLE_URL) {
        return verifiedBundleText
      }

      if (url === airtelPaymentsBank.SHARED_DARWINBOX_URL) {
        return darwinboxShellHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    airtelPaymentsBank.HOMEPAGE_URL,
    airtelPaymentsBank.ABOUT_PAGE_URL,
    airtelPaymentsBank.PARENT_CAREERS_URL,
    airtelPaymentsBank.SHARED_CAREERS_BUNDLE_URL,
    airtelPaymentsBank.SHARED_DARWINBOX_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Airtel Payments Bank fails closed when the branded bank site gains careers links or the shared Airtel bundle becomes bank-specific', async () => {
  const airtelPaymentsBank = await loadAirtelPaymentsBankModule()

  await assert.rejects(
    airtelPaymentsBank.createAirtelPaymentsBankScraper().run({
      fetchText: async (url) => {
        if (url === airtelPaymentsBank.HOMEPAGE_URL) {
          return `${homepageHtml}<a href="https://careers.airtel.com/">Careers</a>`
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage now exposes a careers handoff/i,
  )

  await assert.rejects(
    airtelPaymentsBank.createAirtelPaymentsBankScraper().run({
      fetchText: async (url) => {
        if (url === airtelPaymentsBank.HOMEPAGE_URL) {
          return homepageHtml
        }

        if (url === airtelPaymentsBank.ABOUT_PAGE_URL) {
          return `${aboutPageHtml}<a href="https://www.airtelpayments.bank.in/careers">Careers</a>`
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /about page now exposes a careers handoff/i,
  )

  await assert.rejects(
    airtelPaymentsBank.createAirtelPaymentsBankScraper().run({
      fetchText: async (url) => {
        if (url === airtelPaymentsBank.HOMEPAGE_URL) {
          return homepageHtml
        }

        if (url === airtelPaymentsBank.ABOUT_PAGE_URL) {
          return aboutPageHtml
        }

        if (url === airtelPaymentsBank.PARENT_CAREERS_URL) {
          return careersShellHtml
        }

        if (url === airtelPaymentsBank.SHARED_CAREERS_BUNDLE_URL) {
          return bundleWithDistinctBankRoute
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /distinct Airtel Payments Bank public jobs route/i,
  )

  await assert.rejects(
    airtelPaymentsBank.createAirtelPaymentsBankScraper().run({
      fetchText: async (url) => {
        if (url === airtelPaymentsBank.HOMEPAGE_URL) {
          return homepageHtml
        }

        if (url === airtelPaymentsBank.ABOUT_PAGE_URL) {
          return aboutPageHtml
        }

        if (url === airtelPaymentsBank.PARENT_CAREERS_URL) {
          return careersShellHtml
        }

        if (url === airtelPaymentsBank.SHARED_CAREERS_BUNDLE_URL) {
          return verifiedBundleText
        }

        if (url === airtelPaymentsBank.SHARED_DARWINBOX_URL) {
          return '<html><body>unexpected shell</body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /shared Darwinbox shell/i,
  )
})
