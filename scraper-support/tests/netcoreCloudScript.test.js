import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Netcore</title>
  </head>
  <body>
    <main>
      <h1>Join the community shaping the future of Agentic Marketing here.</h1>
      <p>Support Login English Portuguese</p>
      <p>Please wait while you are redirected to the right page...</p>
    </main>
  </body>
</html>
`

const currentOfficialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Netcore</title>
  </head>
  <body>
    <main>
      <p>Netcore Cloud is now Netcore.ai</p>
      <p>Please wait while you are redirected to the right page...</p>
      <a href="/careers/">Careers</a>
    </main>
  </body>
</html>
`

const redirectShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers list - Netcore</title>
  </head>
  <body>
    <section>
      <p>Support Login English Portuguese</p>
      <p>Please wait while you are redirected to the right page...</p>
      <img alt="loading" src="/loading.gif">
    </section>
  </body>
</html>
`

const forbiddenHtml = `
<html>
  <head>
    <title>Error 403 Forbidden</title>
  </head>
  <body>
    <h1>403 Forbidden</h1>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Netcore Cloud Jobs</title>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="/apply/senior-platform-engineer">Apply now</a>
    <script type="application/ld+json">
      { "@context": "https://schema.org", "@type": "JobPosting", "title": "Senior Platform Engineer" }
    </script>
  </body>
</html>
`

const loadNetcoreCloudModule = async () => {
  try {
    return await import('../../scraper/netcorecloud/script.js')
  } catch {
    assert.fail('Expected Netcore Cloud scraper module at ../../scraper/netcorecloud/script.js')
  }
}

test('Netcore Cloud sentinel helpers stay pinned to the Friday, August 7, 2026 careers and redirect-shell contracts', async () => {
  const netcoreCloud = await loadNetcoreCloudModule()

  assert.equal(netcoreCloud.SOURCE, 'netcorecloud')
  assert.equal(netcoreCloud.COMPANY, 'Netcore Cloud')
  assert.equal(netcoreCloud.OFFICIAL_BRAND_NAME, 'Netcore Cloud')
  assert.equal(netcoreCloud.HOMEPAGE_URL, 'https://netcorecloud.com/')
  assert.equal(netcoreCloud.CAREERS_URL, 'https://netcorecloud.com/careers')
  assert.equal(
    netcoreCloud.CAREERS_LIST_URL,
    'https://netcorecloud.com/careers-list?job_category=engineering',
  )
  assert.equal(netcoreCloud.COMPANY_DOMAIN, 'netcorecloud.com')
  assert.equal(netcoreCloud.VERIFIED_ON, '2026-08-07')
  assert.equal(
    netcoreCloud.hasVerifiedNetcoreCareersSignal(officialCareersHtml),
    true,
  )
  assert.equal(
    netcoreCloud.hasVerifiedNetcoreRedirectShellSignal(redirectShellHtml),
    true,
  )
  assert.equal(
    netcoreCloud.hasVerifiedNetcoreForbiddenSignal(forbiddenHtml),
    true,
  )
  assert.equal(netcoreCloud.hasPublicNetcoreJobSignals(redirectShellHtml), false)
  assert.equal(netcoreCloud.hasPublicNetcoreJobSignals(publicJobsHtml), true)
})

test('Netcore Cloud accepts the current careers redirect shell on Friday, August 7, 2026', async () => {
  const netcoreCloud = await loadNetcoreCloudModule()

  assert.equal(netcoreCloud.hasVerifiedNetcoreCareersSignal(currentOfficialCareersHtml), true)
})

test('Netcore Cloud returns [] while the first-party careers page leads only to the verified redirect shell', async () => {
  const netcoreCloud = await loadNetcoreCloudModule()
  const requestedUrls = []

  const jobs = await netcoreCloud.createNetcoreCloudScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === netcoreCloud.CAREERS_URL) {
        return { status: 200, url, html: officialCareersHtml }
      }
      if (url === netcoreCloud.CAREERS_LIST_URL) {
        return { status: 200, url, html: redirectShellHtml }
      }
      throw new Error(`Unexpected Netcore Cloud URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    netcoreCloud.CAREERS_URL,
    netcoreCloud.CAREERS_LIST_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Netcore Cloud also returns [] when the verified careers-list fetch is blocked by the known 403 surface', async () => {
  const netcoreCloud = await loadNetcoreCloudModule()

  const jobs = await netcoreCloud.createNetcoreCloudScraper().run({
    fetchPage: async (url) => {
      if (url === netcoreCloud.CAREERS_URL) {
        return { status: 200, url, html: officialCareersHtml }
      }
      if (url === netcoreCloud.CAREERS_LIST_URL) {
        return { status: 403, url, html: forbiddenHtml }
      }
      throw new Error(`Unexpected Netcore Cloud URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Netcore Cloud fails closed when the careers landing drifts or the careers-list surface starts exposing jobs', async () => {
  const netcoreCloud = await loadNetcoreCloudModule()

  await assert.rejects(
    netcoreCloud.createNetcoreCloudScraper().run({
      fetchPage: async (url) => {
        if (url === netcoreCloud.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Unexpected page</h1></body></html>',
          }
        }
        throw new Error(`Unexpected Netcore Cloud URL: ${url}`)
      },
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    netcoreCloud.createNetcoreCloudScraper().run({
      fetchPage: async (url) => {
        if (url === netcoreCloud.CAREERS_URL) {
          return { status: 200, url, html: officialCareersHtml }
        }
        if (url === netcoreCloud.CAREERS_LIST_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }
        throw new Error(`Unexpected Netcore Cloud URL: ${url}`)
      },
    }),
    /public jobs surface/i,
  )
})
