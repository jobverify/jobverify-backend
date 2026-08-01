import assert from 'node:assert/strict'
import test from 'node:test'

const browserVerifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers At Edelweiss</title>
  </head>
  <body>
    <nav>
      <a href="https://www.edelweissfin.com/">Home</a>
      <a href="https://www.edelweissfin.com/edelweisscareers">Careers</a>
    </nav>
    <main>
      <h1>CAREERS AT EDELWEISS</h1>
      <p>
        A professional environment that nurtures your personal and professional aspirations with
        equanimity.
      </p>
      <h2>LIFE AT EDELWEISS</h2>
      <p>Want to join the Edelweiss family? Send your CV to GroupTalent.Acquisition@edelweissfin.com</p>
    </main>
  </body>
</html>
`

const blockedDirectFetchHtml = (url) => `
<html>
  <head><title>Access Denied</title></head>
  <body>
    <h1>Access Denied</h1>
    You don't have permission to access "${url}" on this server.
    <p>https://errors.edgesuite.net/18.e5eec817.1784074417.38217eb</p>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Edelweiss Jobs</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Finance Analyst"}
    </script>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://jobs.lever.co/edelweiss/finance-analyst">Apply now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/edelweiss/script.js')
  } catch {
    assert.fail('Expected Edelweiss scraper module at ../../scraper/edelweiss/script.js')
  }
}

test('Edelweiss pins the verified browser careers page and the Akamai-blocked direct-fetch routes from July 15, 2026', async () => {
  const edelweiss = await loadModule()

  assert.equal(edelweiss.SOURCE, 'edelweiss')
  assert.equal(edelweiss.COMPANY, 'Edelweiss')
  assert.equal(edelweiss.OFFICIAL_BRAND_NAME, 'Edelweiss')
  assert.equal(edelweiss.VERIFIED_AT, '2026-07-15')
  assert.equal(edelweiss.ROOT_URL, 'https://www.edelweissfin.com/')
  assert.equal(edelweiss.CAREERS_URL, 'https://www.edelweissfin.com/edelweisscareers')
  assert.equal(edelweiss.APPLICATION_EMAIL, 'GroupTalent.Acquisition@edelweissfin.com')
  assert.equal(
    edelweiss.APPLICATION_URL,
    'mailto:GroupTalent.Acquisition@edelweissfin.com',
  )
  assert.deepEqual(edelweiss.BLOCKED_ROUTE_URLS, [
    'https://www.edelweissfin.com/',
    'https://www.edelweissfin.com/edelweisscareers',
    'https://www.edelweissfin.com/robots.txt',
    'https://www.edelweissfin.com/sitemap.xml',
    'https://www.edelweissfin.com/careers',
    'https://www.edelweissfin.com/career',
    'https://www.edelweissfin.com/jobs',
    'https://www.edelweissfin.com/join-us',
    'https://www.edelweissfin.com/work-with-us',
  ])
  assert.equal(edelweiss.hasVerifiedInformationalCareersSignal(browserVerifiedCareersHtml), true)
  assert.equal(edelweiss.hasPublicJobListingSignal(browserVerifiedCareersHtml), false)
  assert.equal(edelweiss.hasVerifiedInformationalCareersSignal(publicJobsHtml), false)
  assert.equal(edelweiss.hasPublicJobListingSignal(publicJobsHtml), true)
  assert.equal(
    edelweiss.isVerifiedBlockedDirectFetchSurface(
      {
        status: 403,
        url: edelweiss.ROOT_URL,
        html: blockedDirectFetchHtml(edelweiss.ROOT_URL),
      },
      edelweiss.ROOT_URL,
    ),
    true,
  )
})

test('Edelweiss returns no jobs only while the verified direct-fetch routes remain Akamai-blocked', async () => {
  const edelweiss = await loadModule()
  const requestedUrls = []

  const jobs = await edelweiss.createEdelweissScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (edelweiss.BLOCKED_ROUTE_URLS.includes(url)) {
        return { status: 403, url, html: blockedDirectFetchHtml(url) }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, edelweiss.BLOCKED_ROUTE_URLS)
  assert.deepEqual(jobs, [])
})

test('Edelweiss fails closed when a blocked direct-fetch route changes or starts exposing public jobs', async () => {
  const edelweiss = await loadModule()

  await assert.rejects(
    edelweiss.createEdelweissScraper().run({
      fetchPage: async (url) => {
        if (url === edelweiss.BLOCKED_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body>Unexpected homepage</body></html>' }
        }

        return { status: 403, url, html: blockedDirectFetchHtml(url) }
      },
    }),
    /verified blocked direct-fetch surface changed/i,
  )

  await assert.rejects(
    edelweiss.createEdelweissScraper().run({
      fetchPage: async (url) => {
        if (url === edelweiss.BLOCKED_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        return { status: 403, url, html: blockedDirectFetchHtml(url) }
      },
    }),
    /blocked direct-fetch route now appears to expose public jobs/i,
  )
})
