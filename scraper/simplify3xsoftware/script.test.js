import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => import('./script.js')

const homepageHtml = `
  <html>
    <head>
      <title>Simplify3x - AI-Driven Technology Solutions for Enterprise Transformation</title>
    </head>
    <body>
      <p>Turning complex problems into simple solutions</p>
      <p>info@simplify3x.com</p>
    </body>
  </html>
`

const lifePageHtml = `
  <html>
    <head>
      <title>Life at Simplify3x - Where Innovation Meets People</title>
    </head>
    <body>
      <h1>Life at Simplify3x</h1>
      <p>Driven by Innovation, United by Purpose</p>
    </body>
  </html>
`

const blockedJobsRoutePage = {
  status: 403,
  url: 'https://simplify3x.com/careers',
  html: `
    <html>
      <head><title>Forbidden</title></head>
      <body><h1>Forbidden</h1></body>
    </html>
  `,
}

test('Simplify3x sentinel accepts the current blocked no-public-jobs route shape', async () => {
  const simplify3x = await loadModule()

  assert.equal(simplify3x.SOURCE, 'simplify3xsoftware')
  assert.equal(simplify3x.COMPANY, 'Simplify3x Software')
  assert.equal(simplify3x.HOMEPAGE_URL, 'https://simplify3x.com/')
  assert.equal(simplify3x.LIFE_PAGE_URL, 'https://simplify3x.com/life.html')
  assert.equal(simplify3x.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(simplify3x.hasOfficialLifePageSignal(lifePageHtml), true)
  assert.equal(simplify3x.isVerifiedMissingJobRoute(blockedJobsRoutePage), true)
})

test('Simplify3x sentinel returns no jobs when common job routes are blocked and expose no public listings', async () => {
  const simplify3x = await loadModule()
  const requestedUrls = []

  const jobs = await simplify3x.createSimplify3xSoftwareScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === simplify3x.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === simplify3x.LIFE_PAGE_URL) {
        return { status: 200, url, html: lifePageHtml }
      }

      if (simplify3x.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { ...blockedJobsRoutePage, url }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    simplify3x.HOMEPAGE_URL,
    simplify3x.LIFE_PAGE_URL,
    ...simplify3x.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})
