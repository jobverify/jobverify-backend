import assert from 'node:assert/strict'
import test from 'node:test'

const aboutPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>INDmoney About Page</title>
  </head>
  <body>
    <h1>Our Company</h1>
    <p>
      As a one stop shop personal finance application, Indians can track their finances across
      their family members, plan their goals and also get investment solutions ranging from mutual
      funds, Indian share market, US stocks, ETFs, IPO’s and more.
    </p>
    <p>Made in India</p>
    <p>India’s independent Super Finance App</p>
    <h2>Join Us</h2>
    <p>We’re looking for talented, passionate people to join us in building simple, beautiful financial products.</p>
    <a href="https://www.linkedin.com/company/indmoney/jobs/">Join Our Team</a>
    <p>INDmoney Tech Pvt. Ltd.</p>
    <p>Sector 65, Gurugram, Haryana, India - 122005</p>
    <p>All Rights Reserved | © Copyright 2026</p>
  </body>
</html>
`

const aboutPageWithFirstPartyJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>INDmoney About Page</title>
    <script type="application/ld+json">
      { "@context": "https://schema.org", "@type": "JobPosting", "title": "Software Engineer" }
    </script>
  </head>
  <body>
    <h1>Our Company</h1>
    <h2>Join Us</h2>
    <a href="/careers/software-engineer">Software Engineer</a>
    <a href="https://www.linkedin.com/company/indmoney/jobs/">Join Our Team</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../indmoney/script.js')
  } catch {
    assert.fail('Expected INDmoney scraper module at ../indmoney/script.js')
  }
}

test('INDmoney scraper exports the verified official about-page LinkedIn handoff contract', async () => {
  const indmoney = await loadModule()

  assert.equal(indmoney.COMPANY, 'INDmoney')
  assert.equal(indmoney.OFFICIAL_BRAND_NAME, 'INDmoney')
  assert.equal(indmoney.VERIFIED_ON, '2026-07-16')
  assert.equal(indmoney.HOMEPAGE_URL, 'https://www.indmoney.com/')
  assert.equal(indmoney.ABOUT_PAGE_URL, 'https://www.indmoney.com/about')
  assert.equal(indmoney.LINKEDIN_JOBS_URL, 'https://www.linkedin.com/company/indmoney/jobs/')
  assert.equal(indmoney.hasOfficialAboutPageSignal(aboutPageHtml), true)
  assert.equal(
    indmoney.extractLinkedInJobsUrl(aboutPageHtml),
    'https://www.linkedin.com/company/indmoney/jobs/',
  )
  assert.equal(indmoney.hasFirstPartyPublicJobsSignal(aboutPageHtml), false)
  assert.equal(indmoney.hasFirstPartyPublicJobsSignal(aboutPageWithFirstPartyJobsHtml), true)
})

test('INDmoney returns [] only while the verified first-party about page stays a LinkedIn handoff without public first-party jobs', async () => {
  const indmoney = await loadModule()
  const requestedUrls = []

  const jobs = await indmoney.createIndmoneyScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === indmoney.ABOUT_PAGE_URL) {
        return { status: 200, url, html: aboutPageHtml }
      }

      throw new Error(`Unexpected INDmoney URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [indmoney.ABOUT_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('INDmoney fails closed when the verified about page or LinkedIn handoff drifts into a public first-party jobs surface', async () => {
  const indmoney = await loadModule()

  await assert.rejects(
    indmoney.createIndmoneyScraper().run({
      fetchPage: async (url) => {
        if (url === indmoney.ABOUT_PAGE_URL) {
          return { status: 200, url, html: '<html><body>Unexpected</body></html>' }
        }

        throw new Error(`Unexpected INDmoney URL: ${url}`)
      },
    }),
    /verified about page/i,
  )

  await assert.rejects(
    indmoney.createIndmoneyScraper().run({
      fetchPage: async (url) => {
        if (url === indmoney.ABOUT_PAGE_URL) {
          return {
            status: 200,
            url,
            html: aboutPageHtml.replace(
              'https://www.linkedin.com/company/indmoney/jobs/',
              'https://www.linkedin.com/company/another-company/jobs/',
            ),
          }
        }

        throw new Error(`Unexpected INDmoney URL: ${url}`)
      },
    }),
    /linkedin handoff/i,
  )

  await assert.rejects(
    indmoney.createIndmoneyScraper().run({
      fetchPage: async (url) => {
        if (url === indmoney.ABOUT_PAGE_URL) {
          return { status: 200, url, html: aboutPageWithFirstPartyJobsHtml }
        }

        throw new Error(`Unexpected INDmoney URL: ${url}`)
      },
    }),
    /first-party public jobs surface/i,
  )
})
