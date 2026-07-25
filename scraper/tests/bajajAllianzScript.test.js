import assert from 'node:assert/strict'
import test from 'node:test'

const redirectedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Bajaj General Insurance (Formerly Bajaj Allianz)</title>
    <meta name="description" content="Buy health, car, bike &amp; travel insurance online with Bajaj General Insurance (Formerly Bajaj Allianz)." />
    <link rel="canonical" href="https://www.bajajgeneralinsurance.com" />
  </head>
  <body>
    <main>
      <h1>Bajaj General Insurance (Formerly Bajaj Allianz)</h1>
      <footer>
        <nav>
          <a href="https://jobs.bajajgeneral.com/">Careers</a>
        </nav>
      </footer>
    </main>
  </body>
</html>
`

const jobsPortalShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Bajaj General Insurance Limited - Career</title>
    <meta name="description" content="Bajaj General Career, Bajaj General Insurance" />
    <base href="/bajajgeneral/" />
    <script>
      if (location.hostname.includes('impl.openings.co') || location.hostname.includes('preprod1.openings.co')) {
        document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex, nofollow">')
      }
    </script>
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`

const publicJobsShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Bajaj General Insurance Limited - Career</title>
    <meta name="description" content="Bajaj General Career, Bajaj General Insurance" />
    <base href="/bajajgeneral/" />
  </head>
  <body>
    <app-root></app-root>
    <section>
      <h2>Current Openings</h2>
      <a href="https://jobs.bajajgeneral.com/bajajgeneral/job/senior-manager-risk">Apply now</a>
    </section>
  </body>
</html>
`

const brokenCareersHtml = `
<html>
  <head>
    <title>File not found</title>
    <script defer="defer" type="text/javascript" src="/.rum/@adobe/helix-rum-js@%5E2/dist/micro.js" data-status="404"></script>
  </head>
  <body>
    <p>A custom errorhandler for 404 responses</p>
  </body>
</html>
`

const loadBajajAllianzModule = async () => {
  try {
    return await import('../bajajallianz/script.js')
  } catch {
    assert.fail('Expected Bajaj Allianz scraper module at ../bajajallianz/script.js')
  }
}

test('Bajaj Allianz constants stay pinned to the verified legacy redirect, current homepage handoff, jobs shell, and broken direct careers route', async () => {
  const bajajAllianz = await loadBajajAllianzModule()

  assert.equal(bajajAllianz.SOURCE, 'bajajallianz')
  assert.equal(bajajAllianz.COMPANY, 'Bajaj Allianz')
  assert.equal(
    bajajAllianz.OFFICIAL_BRAND_NAME,
    'Bajaj General Insurance (Formerly Bajaj Allianz)',
  )
  assert.equal(bajajAllianz.VERIFIED_ON, '2026-07-15')
  assert.equal(bajajAllianz.LEGACY_HOMEPAGE_URL, 'https://www.bajajallianz.com/')
  assert.equal(bajajAllianz.CURRENT_HOMEPAGE_URL, 'https://www.bajajgeneralinsurance.com/')
  assert.equal(bajajAllianz.JOBS_PORTAL_URL, 'https://jobs.bajajgeneral.com/')
  assert.deepEqual(bajajAllianz.JOBS_PORTAL_SHELL_ROUTE_URLS, [
    'https://jobs.bajajgeneral.com/',
    'https://jobs.bajajgeneral.com/bajajgeneral/search-jobs',
  ])
  assert.deepEqual(bajajAllianz.BROKEN_CAREERS_ROUTE_URLS, [
    'https://www.bajajgeneralinsurance.com/careers',
    'https://www.bajajgeneralinsurance.com/careers.html',
  ])
  assert.match(bajajAllianz.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(bajajAllianz.hasOfficialCurrentHomepageSignal(redirectedHomepageHtml), true)
  assert.equal(
    bajajAllianz.extractHomepageCareerUrl(redirectedHomepageHtml),
    'https://jobs.bajajgeneral.com/',
  )
  assert.equal(bajajAllianz.hasOfficialJobsPortalShellSignal(jobsPortalShellHtml), true)
  assert.deepEqual(bajajAllianz.extractPublicJobLinks(jobsPortalShellHtml), [])
  assert.deepEqual(bajajAllianz.extractPublicJobLinks(publicJobsShellHtml), [
    'https://jobs.bajajgeneral.com/bajajgeneral/job/senior-manager-risk',
  ])
  assert.equal(
    bajajAllianz.isVerifiedLegacyHomepageRedirect({
      status: 200,
      url: bajajAllianz.CURRENT_HOMEPAGE_URL,
      html: redirectedHomepageHtml,
    }),
    true,
  )
  assert.equal(
    bajajAllianz.isVerifiedJobsPortalShellPage({
      status: 200,
      url: bajajAllianz.JOBS_PORTAL_SHELL_ROUTE_URLS[1],
      html: jobsPortalShellHtml,
    }),
    true,
  )
  assert.equal(
    bajajAllianz.isVerifiedBrokenCareersRoute(
      {
        status: 404,
        url: 'https://www.bajajgeneralinsurance.com/careers.html',
        html: brokenCareersHtml,
      },
      bajajAllianz.BROKEN_CAREERS_ROUTE_URLS[0],
    ),
    true,
  )
})

test('Bajaj Allianz sentinel returns [] only while the verified redirect, jobs shell, and broken direct careers route remain unchanged', async () => {
  const bajajAllianz = await loadBajajAllianzModule()
  const requestedUrls = []

  const jobs = await bajajAllianz.createBajajAllianzScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === bajajAllianz.LEGACY_HOMEPAGE_URL) {
        return {
          status: 200,
          url: bajajAllianz.CURRENT_HOMEPAGE_URL,
          html: redirectedHomepageHtml,
        }
      }

      if (url === bajajAllianz.CURRENT_HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          html: redirectedHomepageHtml,
        }
      }

      if (bajajAllianz.JOBS_PORTAL_SHELL_ROUTE_URLS.includes(url)) {
        return {
          status: 200,
          url,
          html: jobsPortalShellHtml,
        }
      }

      if (url === bajajAllianz.BROKEN_CAREERS_ROUTE_URLS[0]) {
        return {
          status: 404,
          url: bajajAllianz.BROKEN_CAREERS_ROUTE_URLS[1],
          html: brokenCareersHtml,
        }
      }

      if (url === bajajAllianz.BROKEN_CAREERS_ROUTE_URLS[1]) {
        return {
          status: 404,
          url,
          html: brokenCareersHtml,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    bajajAllianz.LEGACY_HOMEPAGE_URL,
    bajajAllianz.CURRENT_HOMEPAGE_URL,
    ...bajajAllianz.JOBS_PORTAL_SHELL_ROUTE_URLS,
    ...bajajAllianz.BROKEN_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Bajaj Allianz sentinel fails closed when the redirect, homepage handoff, jobs shell, or broken direct careers route drifts materially', async () => {
  const bajajAllianz = await loadBajajAllianzModule()

  await assert.rejects(
    bajajAllianz.createBajajAllianzScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAllianz.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: redirectedHomepageHtml,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /legacy homepage redirect/i,
  )

  await assert.rejects(
    bajajAllianz.createBajajAllianzScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAllianz.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url: bajajAllianz.CURRENT_HOMEPAGE_URL,
            html: redirectedHomepageHtml,
          }
        }

        if (url === bajajAllianz.CURRENT_HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: redirectedHomepageHtml.replace('https://jobs.bajajgeneral.com/', 'https://example.com/jobs'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage Careers link changed materially/i,
  )

  await assert.rejects(
    bajajAllianz.createBajajAllianzScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAllianz.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url: bajajAllianz.CURRENT_HOMEPAGE_URL,
            html: redirectedHomepageHtml,
          }
        }

        if (url === bajajAllianz.CURRENT_HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: redirectedHomepageHtml,
          }
        }

        if (url === bajajAllianz.JOBS_PORTAL_SHELL_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: publicJobsShellHtml,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /jobs portal shell route changed materially or now exposes public jobs/i,
  )

  await assert.rejects(
    bajajAllianz.createBajajAllianzScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAllianz.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url: bajajAllianz.CURRENT_HOMEPAGE_URL,
            html: redirectedHomepageHtml,
          }
        }

        if (url === bajajAllianz.CURRENT_HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: redirectedHomepageHtml,
          }
        }

        if (bajajAllianz.JOBS_PORTAL_SHELL_ROUTE_URLS.includes(url)) {
          return {
            status: 200,
            url,
            html: jobsPortalShellHtml,
          }
        }

        if (url === bajajAllianz.BROKEN_CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: redirectedHomepageHtml,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /direct careers route changed materially or now exposes public jobs/i,
  )
})
