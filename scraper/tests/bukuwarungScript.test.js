import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Let&#039;s Work Smart, Have Fun and Make History Together with BukuWarung</title>
  </head>
  <body>
    <h4>Start your journey with BukuWarung</h4>
    <a href="https://bukuwarung.darwinbox.com/ms/candidate/careers">See Open Positions</a>
    <h3>Building Digital Infrastructure for financial services and productivity tools</h3>
    <p>At BukuWarung, we’re on a mission to build the digital infrastructure for 60 million MSMEs in Indonesia.</p>
    <h4>BukuWarung Recruitment Process</h4>
    <p>Interested candidates can apply directly here</p>
    <h3>Join our rocketship!</h3>
  </body>
</html>
`

const blankDarwinboxShellHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Bukuwarung</title>
    <meta property="og:title" content="Bukuwarung " />
    <meta property="twitter:title" content="Bukuwarung " />
    <meta property="og:image" content="https://s3-ap-southeast-1.amazonaws.com/darwinbox/logo.png" />
    <meta property="twitter:image" content="https://s3-ap-southeast-1.amazonaws.com/darwinbox/logo.png" />
    <meta property="og:image:alt" content="Bukuwarung" />
  </head>
  <body>
    Bukuwarung -
  </body>
</html>
`

const currentEmptyDarwinboxShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Bukuwarung Careers</title>
  </head>
  <body>
    <section>
      <h1>Current Openings</h1>
      <a href="https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/jobDetails/bw-001">Apply now</a>
    </section>
  </body>
</html>
`

const blockedListingApiResult = {
  status: 403,
  body: `
  <!DOCTYPE html>
  <html lang="en-US">
    <head>
      <title>Attention Required! | Cloudflare</title>
    </head>
    <body>
      <h1>Sorry, you have been blocked</h1>
      <h2>You are unable to access darwinbox.com</h2>
      <p>Cloudflare Ray ID: a1b3fb3f690c8c14</p>
    </body>
  </html>
  `,
}

const loadBukuwarungModule = async () => {
  try {
    return await import('../bukuwarung/script.js')
  } catch {
    assert.fail('Expected Bukuwarung scraper module at ../bukuwarung/script.js')
  }
}

test('Bukuwarung sentinel constants stay pinned to the verified first-party careers page and non-public Darwinbox routes', async () => {
  const bukuwarung = await loadBukuwarungModule()

  assert.equal(bukuwarung.SOURCE, 'bukuwarung')
  assert.equal(bukuwarung.COMPANY, 'Bukuwarung')
  assert.equal(bukuwarung.VERIFIED_ON, '2026-07-15')
  assert.equal(bukuwarung.HOMEPAGE_URL, 'https://www.bukuwarung.com/')
  assert.equal(bukuwarung.LEGACY_HOMEPAGE_URL, 'https://bukuwarung.com/')
  assert.equal(bukuwarung.OFFICIAL_CAREERS_URL, 'https://www.bukuwarung.com/career/')
  assert.equal(
    bukuwarung.OFFICIAL_DARWINBOX_HANDOFF_URL,
    'https://bukuwarung.darwinbox.com/ms/candidate/careers',
  )
  assert.equal(bukuwarung.DARWINBOX_JOBS_URL, 'https://bukuwarung.darwinbox.com/jobs')
  assert.deepEqual(bukuwarung.DARWINBOX_SHELL_ROUTE_URLS, [
    'https://bukuwarung.darwinbox.com/ms/candidate/careers',
    'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home',
    'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/allJobs',
  ])
  assert.equal(
    bukuwarung.DARWINBOX_LISTING_API_URL,
    'https://bukuwarung.darwinbox.com/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.match(bukuwarung.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(bukuwarung.extractOfficialDarwinboxUrl(officialCareersHtml), bukuwarung.OFFICIAL_DARWINBOX_HANDOFF_URL)
  assert.equal(bukuwarung.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(bukuwarung.hasBlankDarwinboxShellSignal(blankDarwinboxShellHtml), true)
  assert.equal(bukuwarung.hasBlankDarwinboxShellSignal(currentEmptyDarwinboxShellHtml), true)
  assert.equal(bukuwarung.hasBlankDarwinboxShellSignal(publicJobsHtml), false)
  assert.equal(
    bukuwarung.hasJobsRedirectToBlankDarwinboxHome({
      status: 200,
      url: 'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home',
      html: blankDarwinboxShellHtml,
    }),
    true,
  )
  assert.equal(
    bukuwarung.hasBlockedDarwinboxListingApiSignal(blockedListingApiResult),
    true,
  )
})

test('Bukuwarung sentinel returns [] only while the verified careers page, blank Darwinbox shell routes, and blocked API remain unchanged', async () => {
  const bukuwarung = await loadBukuwarungModule()
  const requestedPages = []
  const requestedApis = []

  const jobs = await bukuwarung.createBukuwarungScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === bukuwarung.OFFICIAL_CAREERS_URL) {
        return { status: 200, url, html: officialCareersHtml }
      }

      if (url === bukuwarung.DARWINBOX_JOBS_URL) {
        return {
          status: 200,
          url: 'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home',
          html: blankDarwinboxShellHtml,
        }
      }

      if (bukuwarung.DARWINBOX_SHELL_ROUTE_URLS.includes(url)) {
        return {
          status: 200,
          url,
          html: blankDarwinboxShellHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    probeListingApi: async (url) => {
      requestedApis.push(url)
      return blockedListingApiResult
    },
  })

  assert.deepEqual(requestedPages, [
    bukuwarung.OFFICIAL_CAREERS_URL,
    bukuwarung.DARWINBOX_JOBS_URL,
    ...bukuwarung.DARWINBOX_SHELL_ROUTE_URLS,
  ])
  assert.deepEqual(requestedApis, [bukuwarung.DARWINBOX_LISTING_API_URL])
  assert.deepEqual(jobs, [])
})

test('Bukuwarung accepts the current empty Darwinbox shell only with the official careers handoff and blocked jobs API', async () => {
  const bukuwarung = await loadBukuwarungModule()

  const jobs = await bukuwarung.createBukuwarungScraper().run({
    fetchPage: async (url) => {
      if (url === bukuwarung.OFFICIAL_CAREERS_URL) {
        return { status: 200, url, html: officialCareersHtml }
      }

      if (url === bukuwarung.DARWINBOX_JOBS_URL) {
        return {
          status: 200,
          url: 'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home',
          html: currentEmptyDarwinboxShellHtml,
        }
      }

      if (bukuwarung.DARWINBOX_SHELL_ROUTE_URLS.includes(url)) {
        return { status: 200, url, html: currentEmptyDarwinboxShellHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    probeListingApi: async () => blockedListingApiResult,
  })

  assert.deepEqual(jobs, [])
})

test('Bukuwarung sentinel fails closed when the official careers page or Darwinbox tenant drifts materially', async () => {
  const bukuwarung = await loadBukuwarungModule()

  await assert.rejects(
    bukuwarung.createBukuwarungScraper().run({
      fetchPage: async (url) => {
        if (url === bukuwarung.OFFICIAL_CAREERS_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error('fetchPage should not be called beyond the official careers page')
      },
      probeListingApi: async () => {
        throw new Error('probeListingApi should not be called')
      },
    }),
    /official careers page no longer matches the verified public surface/i,
  )

  await assert.rejects(
    bukuwarung.createBukuwarungScraper().run({
      fetchPage: async (url) => {
        if (url === bukuwarung.OFFICIAL_CAREERS_URL) {
          return { status: 200, url, html: officialCareersHtml }
        }

        if (url === bukuwarung.DARWINBOX_JOBS_URL) {
          return {
            status: 200,
            url,
            html: publicJobsHtml,
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      probeListingApi: async () => {
        throw new Error('probeListingApi should not be called')
      },
    }),
    /darwinbox jobs route no longer matches the verified blank public shell/i,
  )

  await assert.rejects(
    bukuwarung.createBukuwarungScraper().run({
      fetchPage: async (url) => {
        if (url === bukuwarung.OFFICIAL_CAREERS_URL) {
          return { status: 200, url, html: officialCareersHtml }
        }

        if (url === bukuwarung.DARWINBOX_JOBS_URL) {
          return {
            status: 200,
            url: 'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home',
            html: blankDarwinboxShellHtml,
          }
        }

        if (bukuwarung.DARWINBOX_SHELL_ROUTE_URLS.includes(url)) {
          return {
            status: 200,
            url,
            html: publicJobsHtml,
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      probeListingApi: async () => {
        throw new Error('probeListingApi should not be called')
      },
    }),
    /darwinbox shell route no longer matches the verified blank public surface/i,
  )

  await assert.rejects(
    bukuwarung.createBukuwarungScraper().run({
      fetchPage: async (url) => {
        if (url === bukuwarung.OFFICIAL_CAREERS_URL) {
          return { status: 200, url, html: officialCareersHtml }
        }

        if (url === bukuwarung.DARWINBOX_JOBS_URL) {
          return {
            status: 200,
            url: 'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home',
            html: blankDarwinboxShellHtml,
          }
        }

        if (bukuwarung.DARWINBOX_SHELL_ROUTE_URLS.includes(url)) {
          return {
            status: 200,
            url,
            html: blankDarwinboxShellHtml,
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      probeListingApi: async () => ({
        status: 200,
        body: '{"data":[]}',
      }),
    }),
    /listing api no longer matches the verified cloudflare-blocked state/i,
  )
})
