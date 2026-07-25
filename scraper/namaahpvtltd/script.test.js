import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Namaah — 600,000+ Sacred Baby Names by Religion, Meaning & Origin</title>
<meta name="description" content="Discover 600,000+ authentic baby names from 11 world religions — Hindu, Muslim, Christian, Jewish, Sikh, Buddhist, Greek, Norse, Egyptian, Celtic & Japanese. Filter by gender, meaning, letter and theme. Free baby name finder.">
<meta name="author" content="Namaah">
<link rel="canonical" href="https://namaah.co.in/">
<meta property="og:site_name" content="Namaah">
<meta property="og:title" content="Namaah — 600,000+ Sacred Baby Names by Religion & Meaning">
<meta property="og:url" content="https://namaah.co.in/">
<meta name="twitter:site" content="@namaah_coin">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://namaah.co.in/#website",
      "name": "Namaah",
      "alternateName": "Namaah Sacred Baby Names",
      "url": "https://namaah.co.in/"
    },
    {
      "@type": "WebApplication",
      "@id": "https://namaah.co.in/#app",
      "name": "Namaah Baby Name Finder",
      "applicationCategory": "LifestyleApplication"
    }
  ]
}
</script>
</head>
<body>
  <main>
    <h1>Namaah</h1>
    <p>600,000+ authentic baby names from 11 world religions and mythologies, searchable by gender, meaning, letter, theme and religion.</p>
    <p>Find the perfect baby name from Hindu, Muslim, Christian, Jewish, Greek, Norse, Egyptian, Celtic &amp; more traditions. 600k+ names, free.</p>
  </main>
</body>
</html>
`

const missingRoute = {
  status: 404,
  url: 'https://namaah.co.in/careers',
  html: '',
}

const liveJobsRoute = {
  status: 200,
  url: 'https://namaah.co.in/jobs',
  html: `
    <html>
      <head><title>Namaah Careers</title></head>
      <body>
        <main>
          <h1>Current Openings</h1>
          <article>
            <h2>Growth Manager</h2>
            <a href="/jobs/growth-manager">Apply now</a>
          </article>
        </main>
      </body>
    </html>
  `,
}

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Namaah Pvt Ltd scraper module at ./script.js')
  }
}

test('Namaah Pvt Ltd sentinel pins the verified first-party no-public-jobs surface from July 13, 2026', async () => {
  const namaah = await loadModule()

  assert.equal(namaah.SOURCE, 'namaahpvtltd')
  assert.equal(namaah.COMPANY, 'Namaah Pvt Ltd')
  assert.equal(namaah.VERIFIED_ON, '2026-07-13')
  assert.equal(namaah.HOMEPAGE_URL, 'https://namaah.co.in/')
  assert.deepEqual(namaah.NO_PUBLIC_JOB_ROUTE_URLS, [
    'https://namaah.co.in/careers',
    'https://namaah.co.in/careers/',
    'https://namaah.co.in/jobs',
    'https://namaah.co.in/jobs/',
  ])
  assert.equal(
    namaah.VERIFIED_SURFACE_SUMMARY,
    'The verified first-party public surface on July 13, 2026 was https://namaah.co.in/, a Namaah baby-names product homepage with no public jobs board, while common careers and jobs routes returned 404.',
  )

  assert.equal(namaah.isFirstPartyUrl('https://namaah.co.in/careers'), true)
  assert.equal(namaah.isFirstPartyUrl('https://www.namaah.co.in/careers'), true)
  assert.equal(namaah.isFirstPartyUrl('https://example.com/jobs'), false)
  assert.equal(namaah.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(namaah.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(namaah.hasPublicJobsSignal(liveJobsRoute.html), true)
  assert.equal(namaah.isVerifiedNoJobsRoute(missingRoute), true)
  assert.equal(namaah.isVerifiedNoJobsRoute(liveJobsRoute), false)
})

test('Namaah Pvt Ltd sentinel returns [] only while the verified first-party surface stays careers-free', async () => {
  const namaah = await loadModule()
  const requestedUrls = []

  const jobs = await namaah.createNamaahScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === namaah.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (namaah.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: '' }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    namaah.HOMEPAGE_URL,
    ...namaah.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Namaah Pvt Ltd default fetch is bounded by a timeout signal', async () => {
  const namaah = await loadModule()
  let capturedInit = null

  const page = await namaah.defaultFetchPage(namaah.HOMEPAGE_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        status: 200,
        url,
        text: async () => homepageHtml,
      }
    },
  })

  assert.equal(page.status, 200)
  assert.equal(page.url, namaah.HOMEPAGE_URL)
  assert.equal(page.html, homepageHtml)
  assert.equal(capturedInit.redirect, 'follow')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('Namaah Pvt Ltd sentinel fails closed when the verified first-party surface drifts or starts exposing jobs', async () => {
  const namaah = await loadModule()

  await assert.rejects(
    namaah.createNamaahScraper().run({
      fetchPage: async (url) => {
        if (url === namaah.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Namaah</title></head><body><h1>Unexpected shell</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage no longer matches/i,
  )

  await assert.rejects(
    namaah.createNamaahScraper().run({
      fetchPage: async (url) => {
        if (url === namaah.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === namaah.NO_PUBLIC_JOB_ROUTE_URLS[0]) {
          return liveJobsRoute
        }

        if (namaah.NO_PUBLIC_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: '' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers-free route changed or now exposes public jobs/i,
  )
})
