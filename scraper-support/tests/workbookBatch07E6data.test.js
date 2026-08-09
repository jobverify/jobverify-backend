import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_HOMEPAGE_HTML = `
  <html>
    <head>
      <title>e6data: 10x Faster Lakehouse Queries at 60% Lower Cost | SQL &amp; AI Engine</title>
    </head>
    <body>
      <nav>
        <a href="/products">Products</a>
        <a href="/customers">Customers</a>
        <a href="/about">About Us</a>
      </nav>
      <h1>Compute Engine for Iceberg, Delta Lake, Hudi: Query | ETL | Ingestion</h1>
      <p>The only engine built for the Agentic AI era</p>
      <p>Cloud, On Premise, Hybrid. AI-native lakehouse compute engine.</p>
      <a href="https://wellfound.com/company/evix">Company profile</a>
    </body>
  </html>
`

const MISSING_ROUTE_HTML = `
  <html>
    <head>
      <title>Not Found</title>
    </head>
    <body>
      <h1>Page not found</h1>
      <p>The page you are looking for doesn't exist or has been moved.</p>
      <a href="/">Go to Homepage</a>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/e6data/script.js')
  } catch {
    assert.fail('Expected e6data scraper module at ../../scraper/e6data/script.js')
  }
}

test('e6data accepts the current official encoded homepage title and returns [] while careers routes remain missing', async () => {
  const e6data = await loadModule()
  const seenUrls = []

  const jobs = await e6data.createE6DataScraper().run({
    fetchPage: async (url) => {
      seenUrls.push(url)

      if (url === e6data.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          html: OFFICIAL_HOMEPAGE_HTML,
        }
      }

      return {
        status: 404,
        url,
        html: MISSING_ROUTE_HTML,
      }
    },
  })

  assert.deepEqual(jobs, [])
  assert.deepEqual(seenUrls, [
    e6data.HOMEPAGE_URL,
    e6data.CAREERS_ROUTE_URL,
    e6data.CAREER_ROUTE_URL,
    e6data.JOBS_ROUTE_URL,
  ])
  assert.equal(e6data.hasOfficialHomepageSignal(OFFICIAL_HOMEPAGE_HTML), true)
})

test('e6data rejects when the homepage now exposes a public careers surface', async () => {
  const e6data = await loadModule()

  await assert.rejects(
    e6data.createE6DataScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: url === e6data.HOMEPAGE_URL
          ? `
            ${OFFICIAL_HOMEPAGE_HTML}
            <a href="/careers">Careers</a>
            <p>We are hiring now.</p>
          `
          : MISSING_ROUTE_HTML,
      }),
    }),
    /public careers surface/i,
  )
})
