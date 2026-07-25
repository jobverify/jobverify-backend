import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => import('./script.js')

const officialHomepageHtml = `
  <html>
    <head><title>Sipal - Advanced engineering services</title></head>
    <body>
      <a href="https://www.linkedin.com/company/sipal-s-p-a-">Lk.</a>
      <nav>
        <a href="/">Home</a>
        <a href="/azienda/">Azienda</a>
        <a href="/capabilities/">Capabilities</a>
      </nav>
      <main>
        <h1>SIPAL</h1>
        <p>Secure Environments, System Integration, Advanced Manufacturing, Space & Dual Use.</p>
      </main>
    </body>
  </html>
`

const staleOfficialRouteHtml = `
  <html>
    <head><title>Pagina non trovata - Sipal</title></head>
    <body>
      <h1>Pagina non trovata</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/azienda/">Azienda</a>
        <a href="/capabilities/">Capabilities</a>
      </nav>
    </body>
  </html>
`

const publicJobsHtml = `
  <html>
    <head><script type="application/ld+json">{"@type":"JobPosting"}</script></head>
    <body>
      <h1>Careers</h1>
      <a href="/jobs/software-engineer">Apply Now</a>
      <p>Open positions in India.</p>
    </body>
  </html>
`

test('SIPAL sentinel constants stay pinned to the verified official no-public-jobs surface', async () => {
  const sipal = await loadModule()

  assert.equal(sipal.SOURCE, 'sipaltechnologiesindiaprivatelimited')
  assert.equal(sipal.COMPANY, 'SIPAL Technologies India Private Limited')
  assert.equal(sipal.HOMEPAGE_URL, 'https://sipal.it/')
  assert.deepEqual(sipal.NO_TRUST_PUBLIC_JOB_ROUTE_URLS, [
    'https://sipal.it/sipal-india-en/',
    'https://sipal.it/sipal-india/',
    'https://sipal.it/careers/',
    'https://sipal.it/jobs/',
    'https://sipal.it/lavora-con-noi/',
    'https://sipal.it/en/careers/',
  ])
  assert.equal(sipal.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(sipal.isVerifiedNoTrustPublicJobRoute({ status: 404, html: staleOfficialRouteHtml }), true)
  assert.equal(sipal.pageShowsPublicJobs(publicJobsHtml), true)
  assert.equal(sipal.pageShowsPublicJobs(staleOfficialRouteHtml), false)
})

test('run returns [] only while SIPAL official routes expose no public jobs', async () => {
  const sipal = await loadModule()
  const requestedUrls = []

  const jobs = await sipal.createSipalTechnologiesIndiaPrivateLimitedScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === sipal.HOMEPAGE_URL) {
        return { status: 200, url, html: officialHomepageHtml }
      }

      if (sipal.NO_TRUST_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: staleOfficialRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    sipal.HOMEPAGE_URL,
    ...sipal.NO_TRUST_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('run fails closed when a SIPAL public jobs surface emerges', async () => {
  const sipal = await loadModule()

  await assert.rejects(
    sipal.createSipalTechnologiesIndiaPrivateLimitedScraper().run({
      fetchPage: async (url) => {
        if (url === sipal.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        return { status: 200, url, html: publicJobsHtml }
      },
    }),
    /public jobs surface emerged/i,
  )
})

test('run fails closed when the verified SIPAL official homepage drifts', async () => {
  const sipal = await loadModule()

  await assert.rejects(
    sipal.createSipalTechnologiesIndiaPrivateLimitedScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: '<html><title>Different</title></html>' }),
    }),
    /official homepage/i,
  )
})
