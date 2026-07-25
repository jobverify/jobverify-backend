import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ABOUT_URL,
  CAREERS_ROUTE_URLS,
  COMPANY,
  CONTACT_URL,
  HOMEPAGE_URL,
  SOURCE,
  createEaglexSasMakersScraper,
  hasOfficialPageSignal,
  hasPublicJobsSignal,
  isVerifiedMissingCareersRoute,
} from './script.js'

const buildOfficialPageHtml = ({
  body = '',
  includeCareerLink = false,
} = {}) => `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Eagle X | We Engineer Dominance</title>
      <meta name="description" content="Eagle X is a high-performance software engineering studio that builds production-ready digital products in 7 days." />
      <link rel="canonical" href="https://eagle-x.in" />
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "name": "Eagle X",
              "alternateName": ["EagleX", "Eagle X Systems"],
              "url": "https://eagle-x.in",
              "contactPoint": [
                {
                  "@type": "ContactPoint",
                  "email": "eaglexdevelopment@gmail.com"
                }
              ]
            }
          ]
        }
      </script>
    </head>
    <body>
      <nav>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        ${includeCareerLink ? '<a href="/careers">Careers</a>' : ''}
      </nav>
      <main>
        <h1>Eagle X Systems</h1>
        <p>We Engineer Dominance</p>
        <p>production-ready digital products in 7 days</p>
        <p>Launch Initiative 2026</p>
        <p>eaglexdevelopment@gmail.com</p>
        <p>Indore, Madhya Pradesh, India</p>
        ${body}
      </main>
      <footer>© 2026 Eagle X Systems. All rights reserved.</footer>
    </body>
  </html>
`

const buildMissingCareersRouteHtml = () => `
  ${buildOfficialPageHtml({
    body: `
      <title>404: This page could not be found.</title>
      <div>This page could not be found.</div>
    `,
  })}
`

test('exports the verified first-party surface metadata for Eaglex SAS Makers Pvt Ltd', () => {
  assert.equal(SOURCE, 'eaglexsasmakerspvtltd')
  assert.equal(COMPANY, 'Eaglex SAS Makers Pvt Ltd')
  assert.equal(HOMEPAGE_URL, 'https://eaglex.co.in/')
  assert.equal(ABOUT_URL, 'https://eagle-x.in/about')
  assert.equal(CONTACT_URL, 'https://eagle-x.in/contact')
  assert.deepEqual(CAREERS_ROUTE_URLS, [
    'https://eagle-x.in/careers',
    'https://eagle-x.in/careers/',
    'https://eagle-x.in/jobs',
    'https://eagle-x.in/jobs/',
    'https://eagle-x.in/work-with-us',
    'https://eagle-x.in/work-with-us/',
  ])
})

test('distinguishes the verified marketing surface from a public jobs surface', () => {
  assert.equal(hasOfficialPageSignal(buildOfficialPageHtml()), true)
  assert.equal(hasPublicJobsSignal(buildOfficialPageHtml()), false)
  assert.equal(
    hasPublicJobsSignal(`
      <html>
        <body>
          <h1>Open Positions</h1>
          <script type="application/ld+json">{"@type":"JobPosting"}</script>
        </body>
      </html>
    `),
    true,
  )
})

test('recognizes the verified missing careers routes', () => {
  assert.equal(
    isVerifiedMissingCareersRoute({
      status: 200,
      html: buildMissingCareersRouteHtml(),
    }),
    true,
  )

  assert.equal(
    isVerifiedMissingCareersRoute({
      status: 200,
      html: buildOfficialPageHtml({
        body: '<h2>Current Openings</h2><p>Join our team</p>',
      }),
    }),
    false,
  )
})

test('run returns [] only while the verified first-party marketing surface and missing careers routes still match', async () => {
  const responses = new Map([
    [HOMEPAGE_URL, { status: 200, html: buildOfficialPageHtml() }],
    [ABOUT_URL, { status: 200, html: buildOfficialPageHtml({ body: '<h2>About</h2>' }) }],
    [CONTACT_URL, { status: 200, html: buildOfficialPageHtml({ body: '<h2>Contact</h2>' }) }],
    ...CAREERS_ROUTE_URLS.map((url) => [url, { status: 200, html: buildMissingCareersRouteHtml() }]),
  ])

  const scraper = createEaglexSasMakersScraper()
  const jobs = await scraper.run({
    fetchPage: async (url) => {
      const response = responses.get(url)
      assert.ok(response, `Unexpected URL: ${url}`)
      return { ...response, url }
    },
  })

  assert.deepEqual(jobs, [])
})

test('run fails closed when the verified surface starts exposing a public jobs board', async () => {
  const scraper = createEaglexSasMakersScraper()

  await assert.rejects(
    scraper.run({
      fetchPage: async (url) => {
        if (url === 'https://eagle-x.in/jobs') {
          return {
            status: 200,
            url,
            html: buildOfficialPageHtml({
              body: '<h2>Current Openings</h2><script type="application/ld+json">{"@type":"JobPosting"}</script>',
            }),
          }
        }

        if (url === HOMEPAGE_URL || url === ABOUT_URL || url === CONTACT_URL) {
          return { status: 200, url, html: buildOfficialPageHtml() }
        }

        return { status: 200, url, html: buildMissingCareersRouteHtml() }
      },
    }),
    /public careers surface/i,
  )
})
