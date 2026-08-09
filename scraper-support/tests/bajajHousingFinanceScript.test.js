import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Bajaj Housing Finance - Leading Non-Banking Financial Company in India</title>
    <link rel="canonical" href="https://www.bajajhousingfinance.in/" />
  </head>
  <body>
    <main>
      <h1>Bajaj Housing Finance</h1>
      <p>Bajaj Housing Finance Limited offers home loans and mortgage products.</p>
    </main>
  </body>
</html>
`

const sitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.bajajhousingfinance.in/</loc></url>
  <url><loc>https://www.bajajhousingfinance.in/home-loans</loc></url>
  <url><loc>https://www.bajajhousingfinance.in/contact-us</loc></url>
</urlset>
`

const loadBajajHousingFinanceModule = async () => {
  try {
    return await import('../../scraper/bajajhousingfinance/script.js')
  } catch {
    assert.fail('Expected Bajaj Housing Finance scraper module at ../../scraper/bajajhousingfinance/script.js')
  }
}

test('Bajaj Housing Finance verifies the homepage and sitemap while keeping common careers routes absent', async () => {
  const bhf = await loadBajajHousingFinanceModule()

  assert.equal(bhf.HOMEPAGE_URL, 'https://www.bajajhousingfinance.in/')
  assert.equal(bhf.SITEMAP_URL, 'https://www.bajajhousingfinance.in/sitemap.xml')
  assert.deepEqual(bhf.CAREER_PATHS, [
    '/career',
    '/careers',
    '/jobs',
    '/join-us',
    '/work-with-us',
  ])
  assert.equal(bhf.isVerifiedHomepage(homepageHtml), true)
  assert.equal(bhf.sitemapHasCareerRoutes(sitemapXml), false)
})

test('Bajaj Housing Finance returns an honest zero-job result while no public careers surface is exposed', async () => {
  const bhf = await loadBajajHousingFinanceModule()
  const requests = []

  const jobs = await bhf.createBajajHousingFinanceScraper().run({
    fetchText: async (url) => {
      requests.push({ type: 'text', url })
      if (url === bhf.HOMEPAGE_URL) return homepageHtml
      if (url === bhf.SITEMAP_URL) return sitemapXml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchStatus: async (url) => {
      requests.push({ type: 'status', url })
      return 404
    },
  })

  assert.equal(jobs.length, 0)
  assert.equal(requests.length, 7)
})

test('Bajaj Housing Finance fails closed if the sitemap starts exposing a careers route', async () => {
  const bhf = await loadBajajHousingFinanceModule()

  await assert.rejects(
    bhf.createBajajHousingFinanceScraper().run({
      fetchText: async (url) => {
        if (url === bhf.HOMEPAGE_URL) return homepageHtml
        return `${sitemapXml}<url><loc>https://www.bajajhousingfinance.in/careers</loc></url>`
      },
      fetchStatus: async () => 404,
    }),
    /public sitemap now exposes a careers-like route/i,
  )
})
