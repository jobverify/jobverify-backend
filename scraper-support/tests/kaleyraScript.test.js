import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'kaleyra',
)

const readHtmlFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readHtmlFixture('homepage.html')
const verifiedCareersHtml = readHtmlFixture('careers-portal.html')
const currentHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Tata Communications Kaleyra Transforming Total Experience</title>
    <link rel="canonical" href="https://www.tatacommunications.com/kaleyra">
  </head>
  <body>
    <nav>
      <a href="https://jobs.tatacommunications.com/home">Careers</a>
      <a href="https://kaleyra.io/">Kaleyra.io Login</a>
    </nav>
    <main>
      <a href="https://www.tatacommunications.com/kaleyra">Go To Home</a>
      <h2>Customer Experience Platform (Kaleyra.ai)</h2>
      <p>Our Interaction Fabric helps your teams work better together.</p>
    </main>
  </body>
</html>
`
const currentCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <base href="/">
    <meta property="og:site_name" content="Career Portal">
    <meta property="og:title" content="Career Opportunities">
    <meta property="og:description" content="Explore exciting career opportunities">
    <title>Career Portal</title>
  </head>
  <body>
    <script src="flutter_bootstrap.js" async></script>
  </body>
</html>
`

const loadKaleyraModule = async () => {
  try {
    return await import('../../scraper/kaleyra/script.js')
  } catch {
    assert.fail('Expected Kaleyra scraper module at ../../scraper/kaleyra/script.js')
  }
}

test('Kaleyra sentinel recognizes the verified homepage handoff and shared Tata careers portal shell', async () => {
  const kaleyra = await loadKaleyraModule()

  assert.equal(kaleyra.SOURCE, 'kaleyra')
  assert.equal(kaleyra.COMPANY, 'Kaleyra')
  assert.equal(kaleyra.HOMEPAGE_URL, 'https://www.kaleyra.com/')
  assert.equal(kaleyra.VERIFIED_HOME_URL, 'https://www.tatacommunications.com/kaleyra')
  assert.equal(kaleyra.CAREERS_URL, 'https://jobs.tatacommunications.com/')
  assert.equal(kaleyra.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(kaleyra.hasVerifiedSharedCareersPortalSignal(verifiedCareersHtml), true)
  assert.equal(kaleyra.hasKaleyraSpecificJobsSignal(verifiedCareersHtml), false)
  assert.equal(kaleyra.hasOfficialHomepageSignal(currentHomepageHtml), true)
  assert.equal(kaleyra.hasVerifiedSharedCareersPortalSignal(currentCareersHtml), true)
})

test('Kaleyra returns no jobs only while the verified first-party shared-parent careers handoff remains unchanged', async () => {
  const kaleyra = await loadKaleyraModule()
  const requestedUrls = []

  const jobs = await kaleyra.createKaleyraScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === kaleyra.HOMEPAGE_URL) {
        return {
          status: 200,
          url: kaleyra.VERIFIED_HOME_URL,
          headers: {},
          html: verifiedHomepageHtml,
        }
      }

      if (url === kaleyra.CAREERS_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedCareersHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [kaleyra.HOMEPAGE_URL, kaleyra.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Kaleyra fails closed when the homepage drifts or the shared careers portal becomes Kaleyra-specific', async () => {
  const kaleyra = await loadKaleyraModule()

  await assert.rejects(
    kaleyra.createKaleyraScraper().run({
      fetchPage: async (url) => {
        if (url === kaleyra.HOMEPAGE_URL) {
          return { status: 200, url, headers: {}, html: '<html><title>Unexpected</title></html>' }
        }

        return { status: 200, url, headers: {}, html: verifiedCareersHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    kaleyra.createKaleyraScraper().run({
      fetchPage: async (url) => {
        if (url === kaleyra.HOMEPAGE_URL) {
          return {
            status: 200,
            url: kaleyra.VERIFIED_HOME_URL,
            headers: {},
            html: verifiedHomepageHtml,
          }
        }

        return {
          status: 200,
          url,
          headers: {},
          html: verifiedCareersHtml.replace(
            '</body>',
            '<section><h2>Kaleyra Jobs</h2><a href="/jobs/kaleyra-solutions-engineer">Solutions Engineer</a></section></body>',
          ),
        }
      },
    }),
    /shared careers portal changed materially or now exposes Kaleyra-specific public jobs/i,
  )

  await assert.rejects(
    kaleyra.createKaleyraScraper().run({
      fetchPage: async (url) => {
        if (url === kaleyra.HOMEPAGE_URL) {
          return {
            status: 200,
            url: 'https://www.kaleyra.com/',
            headers: {},
            html: verifiedHomepageHtml,
          }
        }

        return { status: 200, url, headers: {}, html: verifiedCareersHtml }
      },
    }),
    /homepage handoff no longer resolves to the verified tata communications Kaleyra surface/i,
  )
})
