import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at MSC</title>
  </head>
  <body>
    <h1>Careers at MSC</h1>
    <h2>Our Vacancies</h2>
    <p>Unfortunately, we do not have any vacancies published in this country right now.</p>
    <p>Please apply online by following the instructions in the relevant job posting on our LinkedIn page or check the local job sites in the country where you would like to work.</p>
    <p>No, unfortunately we cannot accept unsolicited job applications. However, you can find a full list of our current vacancies on our LinkedIn job portal.</p>
    <p>MSC Mediterranean Shipping Company</p>
  </body>
</html>
`

const ACCESS_DENIED_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Access Denied</title>
  </head>
  <body>
    <h1>Access Denied</h1>
    <p>You don't have permission to access "http://www.msc.com/en/careers" on this server.</p>
    <p>Reference #18.4f4ddb17.1721146618.44b325fe</p>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>MSC Careers</title>
  </head>
  <body>
    <h1>Open Positions at MSC</h1>
    <a href="/jobs/software-engineer">Apply now</a>
    <script type="application/ld+json">
      { "@context": "https://schema.org", "@type": "JobPosting", "title": "Software Engineer" }
    </script>
  </body>
</html>
`

const loadMscModule = async () => {
  try {
    return await import('../../scraper/msc/script.js')
  } catch {
    assert.fail('Expected MSC scraper module at ../../scraper/msc/script.js')
  }
}

test('MSC sentinel helpers stay pinned to the verified careers-copy and access-denied contracts', async () => {
  const msc = await loadMscModule()

  assert.equal(msc.SOURCE, 'msc')
  assert.equal(msc.COMPANY, 'MSC')
  assert.equal(msc.OFFICIAL_BRAND_NAME, 'MSC Mediterranean Shipping Company')
  assert.equal(msc.HOMEPAGE_URL, 'https://www.msc.com/en')
  assert.equal(msc.CAREERS_URL, 'https://www.msc.com/en/careers?jobs=Italy+Le+Navi')
  assert.equal(msc.COMPANY_DOMAIN, 'msc.com')
  assert.equal(msc.VERIFIED_ON, '2026-07-16')
  assert.equal(msc.hasVerifiedMscCareersSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(msc.hasVerifiedMscAccessDeniedSignal(ACCESS_DENIED_HTML), true)
  assert.equal(msc.hasPublicMscJobSignals(VERIFIED_CAREERS_HTML), false)
  assert.equal(msc.hasPublicMscJobSignals(PUBLIC_JOBS_HTML), true)
})

test('MSC returns [] when the verified first-party careers copy still defers applicants to LinkedIn and local job sites', async () => {
  const msc = await loadMscModule()
  const requestedUrls = []

  const jobs = await msc.createMscScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === msc.CAREERS_URL) return VERIFIED_CAREERS_HTML
      throw new Error(`Unexpected MSC URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [msc.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('MSC also returns [] when the exact-name careers route is protected by the verified access-denied gate', async () => {
  const msc = await loadMscModule()

  const jobs = await msc.createMscScraper().run({
    fetchText: async () => ACCESS_DENIED_HTML,
  })

  assert.deepEqual(jobs, [])
})

test('MSC fails closed when the first-party careers route starts exposing public job signals', async () => {
  const msc = await loadMscModule()

  await assert.rejects(
    msc.createMscScraper().run({
      fetchText: async () => PUBLIC_JOBS_HTML,
    }),
    /public jobs surface/i,
  )
})
