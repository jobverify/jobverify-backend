import assert from 'node:assert/strict'
import test from 'node:test'

const productPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sage Intacct: AI-Powered Accounting & Financial Management Software | Sage US</title>
  </head>
  <body>
    <h1>High-performance finance software with AI</h1>
    <p>Sage Intacct is the #1 finance AI software trusted by 30,000+ finance teams.</p>
    <h2>Discover the power of Sage</h2>
  </body>
</html>
`

const careersHubHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Vacancies & Careers | Sage US</title>
  </head>
  <body>
    <h1>Grow your future with us</h1>
    <h2>Search for your new role.</h2>
    <a href="/en-us/company/careers/career-search/">See open roles</a>
    <section>India</section>
  </body>
</html>
`

const currentCareersHubHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Vacancies &amp; Careers | Sage US</title>
  </head>
  <body>
    <h1>Grow your future with us</h1>
    <h2>Search for your new role.</h2>
    <a href="/en-us/company/careers/career-search/">See open roles</a>
    <section>India</section>
  </body>
</html>
`

const careerSearchHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Search | Sage US</title>
  </head>
  <body>
    <h1>Search open roles at Sage</h1>
    <label>Location</label>
    <label>Department</label>
    <label>Keyword search</label>
    <button>Search</button>
  </body>
</html>
`

const locationsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Locations | Careers | Sage US</title>
  </head>
  <body>
    <h1>Let's go places</h1>
    <h2>Search for careers near you.</h2>
    <section>
      <h3>India</h3>
      <p>Bangalore</p>
      <p>Mohali</p>
      <p>Pune</p>
    </section>
  </body>
</html>
`

const loadSageIntacctModule = async () => {
  try {
    return await import('../../scraper/sageintacct/script.js')
  } catch {
    assert.fail('Expected Sage Intacct scraper module at ../../scraper/sageintacct/script.js')
  }
}

test('Sage Intacct scraper exports the verified shared Sage careers-hub sentinel contract', async () => {
  const sageIntacct = await loadSageIntacctModule()

  assert.equal(sageIntacct.SOURCE, 'sageintacct')
  assert.equal(sageIntacct.COMPANY, 'Sage Intacct')
  assert.equal(sageIntacct.OFFICIAL_BRAND_NAME, 'Sage Intacct')
  assert.equal(sageIntacct.VERIFIED_ON, '2026-08-04')
  assert.equal(sageIntacct.PRODUCT_PAGE_URL, 'https://www.sage.com/en-us/sage-business-cloud/intacct/')
  assert.equal(sageIntacct.CAREERS_PAGE_URL, 'https://www.sage.com/en-us/company/careers/')
  assert.equal(
    sageIntacct.CAREER_SEARCH_URL,
    'https://www.sage.com/en-us/company/careers/career-search/',
  )
  assert.equal(
    sageIntacct.LOCATIONS_URL,
    'https://www.sage.com/en-us/company/careers/locations/',
  )
  assert.equal(typeof sageIntacct.hasVerifiedProductPageSignal, 'function')
  assert.equal(typeof sageIntacct.hasVerifiedCareersHubSignal, 'function')
  assert.equal(typeof sageIntacct.hasVerifiedCareerSearchSignal, 'function')
  assert.equal(typeof sageIntacct.hasVerifiedIndiaLocationsSignal, 'function')
  assert.equal(typeof sageIntacct.createSageIntacctScraper, 'function')
  assert.equal(sageIntacct.hasVerifiedProductPageSignal(productPageHtml), true)
  assert.equal(sageIntacct.hasVerifiedCareersHubSignal(careersHubHtml), true)
  assert.equal(sageIntacct.hasVerifiedCareerSearchSignal(careerSearchHtml), true)
  assert.equal(sageIntacct.hasVerifiedIndiaLocationsSignal(locationsHtml), true)
})

test('Sage Intacct recognizes the current live shared Sage careers hub title encoding', async () => {
  const sageIntacct = await loadSageIntacctModule()

  assert.equal(sageIntacct.hasVerifiedCareersHubSignal(currentCareersHubHtml), true)
})

test('Sage Intacct run returns [] after validating the shared Sage careers hub and India locations contract', async () => {
  const sageIntacct = await loadSageIntacctModule()
  const requests = []

  const jobs = await sageIntacct.createSageIntacctScraper().run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === sageIntacct.PRODUCT_PAGE_URL) return productPageHtml
      if (url === sageIntacct.CAREERS_PAGE_URL) return careersHubHtml
      if (url === sageIntacct.CAREER_SEARCH_URL) return careerSearchHtml
      if (url === sageIntacct.LOCATIONS_URL) return locationsHtml

      throw new Error(`Unexpected Sage Intacct URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    'https://www.sage.com/en-us/sage-business-cloud/intacct/',
    'https://www.sage.com/en-us/company/careers/',
    'https://www.sage.com/en-us/company/careers/career-search/',
    'https://www.sage.com/en-us/company/careers/locations/',
  ])
  assert.deepEqual(jobs, [])
})

test('Sage Intacct falls back to browser-backed fetches when the verified Sage surfaces return Cloudflare 403 pages', async () => {
  const sageIntacct = await loadSageIntacctModule()
  const primaryRequests = []
  const browserRequests = []

  const jobs = await sageIntacct.createSageIntacctScraper().run({
    fetchText: async (url) => {
      primaryRequests.push(url)
      throw new Error(`HTTP 403 for ${url}`)
    },
    fetchBrowserText: async (url) => {
      browserRequests.push(url)

      if (url === sageIntacct.PRODUCT_PAGE_URL) return productPageHtml
      if (url === sageIntacct.CAREERS_PAGE_URL) return careersHubHtml
      if (url === sageIntacct.CAREER_SEARCH_URL) return careerSearchHtml
      if (url === sageIntacct.LOCATIONS_URL) return locationsHtml

      throw new Error(`Unexpected Sage Intacct browser URL: ${url}`)
    },
  })

  assert.deepEqual(primaryRequests, [
    'https://www.sage.com/en-us/sage-business-cloud/intacct/',
    'https://www.sage.com/en-us/company/careers/',
    'https://www.sage.com/en-us/company/careers/career-search/',
    'https://www.sage.com/en-us/company/careers/locations/',
  ])
  assert.deepEqual(browserRequests, primaryRequests)
  assert.deepEqual(jobs, [])
})

test('Sage Intacct fails closed when the verified product page or shared Sage careers surfaces drift', async () => {
  const sageIntacct = await loadSageIntacctModule()

  await assert.rejects(
    sageIntacct.createSageIntacctScraper().run({
      fetchText: async (url) => {
        if (url === sageIntacct.PRODUCT_PAGE_URL) return '<html><body>broken</body></html>'
        if (url === sageIntacct.CAREERS_PAGE_URL) return careersHubHtml
        if (url === sageIntacct.CAREER_SEARCH_URL) return careerSearchHtml
        if (url === sageIntacct.LOCATIONS_URL) return locationsHtml
        throw new Error(`Unexpected Sage Intacct URL: ${url}`)
      },
    }),
    /verified sage intacct product page/i,
  )

  await assert.rejects(
    sageIntacct.createSageIntacctScraper().run({
      fetchText: async (url) => {
        if (url === sageIntacct.PRODUCT_PAGE_URL) return productPageHtml
        if (url === sageIntacct.CAREERS_PAGE_URL) return careersHubHtml
        if (url === sageIntacct.CAREER_SEARCH_URL) return '<html><body>broken</body></html>'
        if (url === sageIntacct.LOCATIONS_URL) return locationsHtml
        throw new Error(`Unexpected Sage Intacct URL: ${url}`)
      },
    }),
    /career search/i,
  )

  await assert.rejects(
    sageIntacct.createSageIntacctScraper().run({
      fetchText: async (url) => {
        if (url === sageIntacct.PRODUCT_PAGE_URL) return productPageHtml
        if (url === sageIntacct.CAREERS_PAGE_URL) return careersHubHtml
        if (url === sageIntacct.CAREER_SEARCH_URL) return careerSearchHtml
        if (url === sageIntacct.LOCATIONS_URL) return '<html><body>missing india hubs</body></html>'
        throw new Error(`Unexpected Sage Intacct URL: ${url}`)
      },
    }),
    /india locations/i,
  )
})
