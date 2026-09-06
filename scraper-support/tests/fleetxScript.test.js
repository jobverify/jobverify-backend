import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedTimeoutResult = (url) => ({
  ok: false,
  url,
  errorName: 'TimeoutError',
  errorMessage: 'The operation was aborted due to timeout',
  causeName: null,
  causeMessage: null,
})

const connectTimeoutResult = (url) => ({
  ok: false,
  url,
  errorName: 'TypeError',
  errorMessage: 'fetch failed',
  causeName: 'ConnectTimeoutError',
  causeMessage: 'Connect Timeout Error',
})

const reachableHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Fleetx</title>
  </head>
  <body>
    <main>
      <h1>Fleetx</h1>
      <a href="/careers">Careers</a>
    </main>
  </body>
</html>
`

const currentCareersHtml = `
<!doctype html>
<html lang="en">
  <head><title>Career Opportunities At Fleetx | Fleetx</title></head>
  <body>
    <section id="current-openings">
      <div>Current Openings</div>
      <div class="flex flex-col items-start text-left rounded bg-white p-6 shadow col-span-2">
        <h3>Area Sales Manager</h3>
        <p>Minimum Exp.: 5-7 yrs</p>
        <p>Key Skills: Field Sales, B2B Sales</p>
        <p>Location: Bangalore, Chennai</p>
      </div>
    </section>
  </body>
</html>
`

const loadFleetxModule = async () => {
  try {
    return await import('../../scraper/fleetx/script.js')
  } catch {
    assert.fail('Expected Fleetx scraper module at ../../scraper/fleetx/script.js')
  }
}

test('Fleetx helpers stay pinned to the verified timeout-only first-party contract', async () => {
  const fleetx = await loadFleetxModule()

  assert.equal(fleetx.SOURCE, 'fleetx')
  assert.equal(fleetx.COMPANY, 'Fleetx')
  assert.equal(fleetx.OFFICIAL_BRAND_NAME, 'Fleetx')
  assert.equal(fleetx.VERIFIED_ON, '2026-07-15')
  assert.equal(fleetx.HOMEPAGE_URL, 'https://fleetx.io/')
  assert.equal(fleetx.WWW_HOMEPAGE_URL, 'https://www.fleetx.io/')
  assert.equal(fleetx.CAREERS_URL, 'https://fleetx.io/careers')
  assert.equal(fleetx.WWW_CAREERS_URL, 'https://www.fleetx.io/careers')
  assert.equal(fleetx.ROBOTS_URL, 'https://fleetx.io/robots.txt')
  assert.equal(fleetx.WWW_ROBOTS_URL, 'https://www.fleetx.io/robots.txt')
  assert.equal(fleetx.SITEMAP_URL, 'https://fleetx.io/sitemap.xml')
  assert.equal(fleetx.WWW_SITEMAP_URL, 'https://www.fleetx.io/sitemap.xml')
  assert.deepEqual(fleetx.TIMEOUT_PROBE_URLS, [
    'https://fleetx.io/',
    'https://www.fleetx.io/',
    'https://fleetx.io/careers',
    'https://www.fleetx.io/careers',
    'https://fleetx.io/career',
    'https://www.fleetx.io/career',
    'https://fleetx.io/jobs',
    'https://www.fleetx.io/jobs',
    'https://fleetx.io/join-us',
    'https://www.fleetx.io/join-us',
    'https://fleetx.io/work-with-us',
    'https://www.fleetx.io/work-with-us',
    'https://fleetx.io/robots.txt',
    'https://www.fleetx.io/robots.txt',
    'https://fleetx.io/sitemap.xml',
    'https://www.fleetx.io/sitemap.xml',
  ])
  assert.match(fleetx.VERIFIED_SURFACE_SUMMARY, /timed out/i)
  assert.match(fleetx.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(
    fleetx.isVerifiedTimeoutResult(verifiedTimeoutResult(fleetx.HOMEPAGE_URL), fleetx.HOMEPAGE_URL),
    true,
  )
  assert.equal(
    fleetx.isVerifiedTimeoutResult(connectTimeoutResult(fleetx.HOMEPAGE_URL), fleetx.HOMEPAGE_URL),
    true,
  )
  assert.equal(
    fleetx.isVerifiedTimeoutResult(
      {
        ok: true,
        status: 200,
        url: fleetx.HOMEPAGE_URL,
        html: reachableHtml,
      },
      fleetx.HOMEPAGE_URL,
    ),
    false,
  )
})

test('Fleetx returns no jobs only while the verified first-party routes remain unreachable by timeout', async () => {
  const fleetx = await loadFleetxModule()
  const requestedUrls = []

  const jobs = await fleetx.run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return verifiedTimeoutResult(url)
    },
  })

  assert.deepEqual(requestedUrls, [fleetx.CURRENT_CAREERS_URL, ...fleetx.TIMEOUT_PROBE_URLS])
  assert.deepEqual(jobs, [])
})

test('Fleetx extracts the current first-party careers cards at fleetx.ai', async () => {
  const fleetx = await loadFleetxModule()
  const jobs = await fleetx.run({
    now: () => '2026-09-03T00:00:00.000Z',
    fetchPage: async (url) => {
      if (url === fleetx.CURRENT_CAREERS_URL) {
        return { ok: true, status: 200, url, html: currentCareersHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(jobs.map((job) => ({ title: job.title, location: job.location, sourceUrl: job.sourceUrl })), [
    {
      title: 'Area Sales Manager',
      location: 'Bangalore, Chennai, India',
      sourceUrl: fleetx.CURRENT_CAREERS_URL,
    },
  ])
})

test('Fleetx fails closed when the verified homepage, careers routes, or discovery routes become reachable or otherwise drift', async () => {
  const fleetx = await loadFleetxModule()

  await assert.rejects(
    fleetx.run({
      fetchPage: async (url) => {
        if (url === fleetx.HOMEPAGE_URL) {
          return {
            ok: true,
            status: 200,
            url,
            html: reachableHtml,
          }
        }

        return verifiedTimeoutResult(url)
      },
    }),
    /homepage route changed materially or became reachable/i,
  )

  await assert.rejects(
    fleetx.run({
      fetchPage: async (url) => {
        if (url === fleetx.CAREERS_URL) {
          return {
            ok: true,
            status: 200,
            url,
            html: reachableHtml,
          }
        }

        return verifiedTimeoutResult(url)
      },
    }),
    /careers route changed materially or became reachable/i,
  )

  await assert.rejects(
    fleetx.run({
      fetchPage: async (url) => {
        if (url === fleetx.ROBOTS_URL) {
          return {
            ok: false,
            url,
            errorName: 'TypeError',
            errorMessage: 'fetch failed',
            causeName: 'SocketError',
            causeMessage: 'ECONNRESET',
          }
        }

        return verifiedTimeoutResult(url)
      },
    }),
    /discovery route changed materially or became reachable/i,
  )
})
