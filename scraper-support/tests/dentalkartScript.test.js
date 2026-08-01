import assert from 'node:assert/strict'
import test from 'node:test'

const loadDentalkartModule = async () => {
  try {
    return await import('../../scraper/dentalkart/script.js')
  } catch {
    assert.fail('Expected Dentalkart scraper module at ../../scraper/dentalkart/script.js')
  }
}

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Dentalkart - India&#x27;s Largest Online Dental Store</title>
    <meta
      name="description"
      content="Dentalkart is India&#x27;s largest online dental store that provides premium dental equipment, instruments, materials, consumables, and laboratory products. Shop now for premium dental products at the best prices with COD, EMI, credit card, and debit card options."
    />
  </head>
  <body>
    <header>
      <a aria-label="Go to homepage" href="/">Dentalkart</a>
      <span>Search over 20,000 Dental Products</span>
    </header>
  </body>
</html>
`

const officialAboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us · Dentalkart</title>
    <meta
      name="description"
      content="Dentalkart was built by dentists, for dentists. India&#x27;s largest dental supplies marketplace - 2 lakh+ clinics, 20,480 SKUs, 500+ direct brand partnerships. Listed on NSE Emerge as DENTALKART."
    />
  </head>
  <body>
    <main>
      <h1>About Us</h1>
      <p>Dentalkart was built by dentists, for dentists.</p>
      <p>Listed on NSE Emerge as DENTALKART.</p>
    </main>
  </body>
</html>
`

const officialCareersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Buy Dental Products </title>
    <script src="/_next/static/chunks/app/careers/page-7d4b0851d4e7566a.js" async=""></script>
  </head>
  <body>
    <header>
      <a aria-label="Go to homepage" href="/">Dentalkart</a>
      <span>Search over 20,000 Dental Products</span>
    </header>
  </body>
</html>
`

test('Dentalkart helpers stay pinned to the verified homepage, about page, careers shell, and missing-route contract', async () => {
  const dentalkart = await loadDentalkartModule()

  assert.equal(dentalkart.SOURCE, 'dentalkart')
  assert.equal(dentalkart.COMPANY, 'Dentalkart')
  assert.equal(dentalkart.VERIFIED_AT, '2026-07-15')
  assert.equal(dentalkart.HOMEPAGE_URL, 'https://www.dentalkart.com/')
  assert.equal(dentalkart.ABOUT_URL, 'https://www.dentalkart.com/about-us')
  assert.equal(dentalkart.CAREERS_URL, 'https://www.dentalkart.com/careers')
  assert.deepEqual(dentalkart.NO_PUBLIC_JOB_ROUTE_URLS, [
    'https://www.dentalkart.com/career',
    'https://www.dentalkart.com/jobs',
    'https://www.dentalkart.com/openings',
    'https://www.dentalkart.com/current-openings',
    'https://www.dentalkart.com/join-us',
    'https://www.dentalkart.com/work-with-us',
  ])

  assert.equal(dentalkart.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(dentalkart.hasOfficialAboutPageSignal(officialAboutHtml), true)
  assert.equal(dentalkart.hasOfficialCareersShellSignal(officialCareersShellHtml), true)
  assert.equal(dentalkart.hasPublicJobListingSignal(officialCareersShellHtml), false)
  assert.equal(
    dentalkart.hasPublicJobListingSignal('<html><body><h1>Current Openings</h1><a>Apply Now</a></body></html>'),
    true,
  )
  assert.equal(
    dentalkart.isKnownMissingJobRoute(
      { status: 404, url: dentalkart.NO_PUBLIC_JOB_ROUTE_URLS[0], html: '' },
      dentalkart.NO_PUBLIC_JOB_ROUTE_URLS[0],
    ),
    true,
  )
})

test('Dentalkart returns no jobs only while the verified first-party empty state holds', async () => {
  const dentalkart = await loadDentalkartModule()
  const requestedUrls = []

  const jobs = await dentalkart.createDentalkartScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === dentalkart.HOMEPAGE_URL) {
        return { status: 200, url, html: officialHomepageHtml }
      }

      if (url === dentalkart.ABOUT_URL) {
        return { status: 200, url, html: officialAboutHtml }
      }

      if (url === dentalkart.CAREERS_URL) {
        return { status: 200, url, html: officialCareersShellHtml }
      }

      if (dentalkart.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: '' }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    dentalkart.HOMEPAGE_URL,
    dentalkart.ABOUT_URL,
    dentalkart.CAREERS_URL,
    ...dentalkart.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Dentalkart fails closed when the verified homepage, about page, careers shell, or missing routes drift', async () => {
  const dentalkart = await loadDentalkartModule()

  await assert.rejects(
    dentalkart.createDentalkartScraper().run({
      fetchPage: async (url) => {
        if (url === dentalkart.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    dentalkart.createDentalkartScraper().run({
      fetchPage: async (url) => {
        if (url === dentalkart.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === dentalkart.ABOUT_URL) {
          return { status: 200, url, html: '<html><title>About Dentalkart</title></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified about page/i,
  )

  await assert.rejects(
    dentalkart.createDentalkartScraper().run({
      fetchPage: async (url) => {
        if (url === dentalkart.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === dentalkart.ABOUT_URL) {
          return { status: 200, url, html: officialAboutHtml }
        }

        if (url === dentalkart.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Current Openings</h1><a href="https://jobs.lever.co/dentalkart">Apply Now</a></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    dentalkart.createDentalkartScraper().run({
      fetchPage: async (url) => {
        if (url === dentalkart.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === dentalkart.ABOUT_URL) {
          return { status: 200, url, html: officialAboutHtml }
        }

        if (url === dentalkart.CAREERS_URL) {
          return { status: 200, url, html: officialCareersShellHtml }
        }

        if (url === dentalkart.NO_PUBLIC_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body>Current Openings</body></html>' }
        }

        if (dentalkart.NO_PUBLIC_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: '' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified no-public-job route changed/i,
  )
})
