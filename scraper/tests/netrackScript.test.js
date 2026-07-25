import assert from 'node:assert/strict'
import test from 'node:test'

const BLOCKED_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>Access Denied</title>
  </head>
  <body>
    <h1>Access Denied</h1>
    <p>You don't have permission to access "http://www.netrackindia.com/en" on this server.</p>
    <p>https://errors.edgesuite.net/18.6fbd5668.1784245388.196a4745</p>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Sales Engineer"}
    </script>
  </head>
  <body>
    <h1>Open Positions</h1>
    <a href="https://jobs.example.com/sales-engineer">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../netrack/script.js')
  } catch {
    assert.fail('Expected Netrack scraper module at ../netrack/script.js')
  }
}

test('Netrack sentinel helpers stay pinned to the verified blocked first-party route state', async () => {
  const netrack = await loadModule()

  assert.equal(netrack.SOURCE, 'netrack')
  assert.equal(netrack.COMPANY, 'Netrack')
  assert.equal(netrack.OFFICIAL_BRAND_NAME, 'NetRack Enclosures Private Ltd.')
  assert.equal(netrack.VERIFIED_ON, '2026-07-16')
  assert.equal(netrack.HOMEPAGE_URL, 'https://www.netrackindia.com/en')
  assert.equal(netrack.CONTACT_URL, 'https://www.netrackindia.com/en/contact-0')
  assert.equal(netrack.TEAM_URL, 'https://www.netrackindia.com/en/about-us/about-company/team')
  assert.deepEqual(netrack.BLOCKED_ROUTE_URLS, [
    'https://www.netrackindia.com/en',
    'https://www.netrackindia.com/en/contact-0',
    'https://www.netrackindia.com/en/about-us/about-company/team',
    'https://www.netrackindia.com/en/careers',
    'https://www.netrackindia.com/careers',
    'https://www.netrackindia.com/en/jobs',
    'https://www.netrackindia.com/jobs',
  ])
  assert.match(netrack.VERIFIED_SURFACE_SUMMARY, /\b403\b/i)
  assert.match(netrack.VERIFIED_SURFACE_SUMMARY, /Access Denied/i)
  assert.equal(netrack.hasPublicJobsSignal(BLOCKED_HTML), false)
  assert.equal(netrack.hasPublicJobsSignal(PUBLIC_JOBS_HTML), true)
  assert.equal(
    netrack.hasVerifiedBlockedSurface({
      status: 403,
      url: netrack.HOMEPAGE_URL,
      html: BLOCKED_HTML,
    }),
    true,
  )
})

test('Netrack returns [] only while the verified first-party routes remain blocked with no public job listings', async () => {
  const netrack = await loadModule()
  const requestedUrls = []

  const jobs = await netrack.createNetrackScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return { status: 403, url, html: BLOCKED_HTML }
    },
  })

  assert.deepEqual(requestedUrls, netrack.BLOCKED_ROUTE_URLS)
  assert.deepEqual(jobs, [])
})

test('Netrack fails closed when any verified blocked route stops matching the known blocked state', async () => {
  const netrack = await loadModule()

  await assert.rejects(
    netrack.createNetrackScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body>Unexpected</body></html>',
      }),
    }),
    /blocked first-party surface changed/i,
  )

  await assert.rejects(
    netrack.createNetrackScraper().run({
      fetchPage: async (url) => {
        if (url === netrack.TEAM_URL) {
          return { status: 403, url, html: PUBLIC_JOBS_HTML }
        }

        return { status: 403, url, html: BLOCKED_HTML }
      },
    }),
    /now appears to expose public jobs/i,
  )
})
