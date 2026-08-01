import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Simplify3x - AI-Driven Technology Solutions for Enterprise Transformation</title>
  </head>
  <body>
    <main>
      <h1>Turning complex problems into simple solutions</h1>
      <p>Explore Hire3x</p>
      <p>info@simplify3x.com</p>
    </main>
  </body>
</html>
`

const lifeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Life at Simplify3x - Where Innovation Meets People</title>
  </head>
  <body>
    <main>
      <h1>Life at Simplify3x</h1>
      <h2>Driven by Innovation, United by Purpose</h2>
      <p>Hear From Our People</p>
      <p>Tanvi</p>
    </main>
  </body>
</html>
`

const missingJobsHtml = `
<!doctype html>
<html lang="en">
  <head><title>404 Not Found</title></head>
  <body><h1>Not Found</h1></body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <article><a href="/jobs/software-engineer">Software Engineer</a></article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/simplify3xsoftware/script.js')
  } catch {
    assert.fail('Expected Simplify3x Software scraper module at ../../scraper/simplify3xsoftware/script.js')
  }
}

test('Simplify3x Software sentinel pins the verified homepage, life page, and missing job routes', async () => {
  const simplify3x = await loadModule()

  assert.equal(simplify3x.SOURCE, 'simplify3xsoftware')
  assert.equal(simplify3x.COMPANY, 'Simplify3x Software')
  assert.equal(simplify3x.HOMEPAGE_URL, 'https://simplify3x.com/')
  assert.equal(simplify3x.LIFE_PAGE_URL, 'https://simplify3x.com/life.html')
  assert.equal(simplify3x.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(simplify3x.hasOfficialLifePageSignal(lifeHtml), true)
  assert.equal(simplify3x.hasPublicJobSignal(lifeHtml), false)
  assert.equal(simplify3x.hasPublicJobSignal(publicJobsHtml), true)
  assert.equal(simplify3x.isVerifiedMissingJobRoute({ status: 404, html: missingJobsHtml }), true)
})

test('Simplify3x Software sentinel returns [] only while the verified no-jobs surface remains unchanged', async () => {
  const simplify3x = await loadModule()
  const requestedUrls = []

  const jobs = await simplify3x.createSimplify3xSoftwareScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === simplify3x.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === simplify3x.LIFE_PAGE_URL) return { status: 200, url, html: lifeHtml }
      if (simplify3x.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingJobsHtml }
      }
      throw new Error(`Unexpected Simplify3x URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    simplify3x.HOMEPAGE_URL,
    simplify3x.LIFE_PAGE_URL,
    ...simplify3x.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Simplify3x Software sentinel fails closed when a public jobs surface appears', async () => {
  const simplify3x = await loadModule()

  await assert.rejects(
    simplify3x.createSimplify3xSoftwareScraper().run({
      fetchPage: async (url) => {
        if (url === simplify3x.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === simplify3x.LIFE_PAGE_URL) return { status: 200, url, html: publicJobsHtml }
        throw new Error(`Unexpected Simplify3x URL: ${url}`)
      },
    }),
    /life page now exposes a public jobs surface/i,
  )
})
