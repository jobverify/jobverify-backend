import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!DOCTYPE html>
<html lang="en" class="h-full bg-neutral-950 text-base antialiased">
  <head>
    <title>Defining the Future of Data Archiving</title>
    <meta name="description" content="Defining the Future of Data Archiving" />
  </head>
  <body>
    <nav>
      <a href="/work">Our Work</a>
      <a href="/blog">Blog</a>
    </nav>
    <main>
      <h1>Defining the Future of Data Archiving</h1>
      <p>Creating the next generation .Zip Data Manager</p>
      <p>Our offices</p>
      <p>Copenhagen</p>
      <p>Billund</p>
      <p>NeoZip is a new software program that aims to expand on the legacy of ZIP.</p>
      <p>Email: contact@neoware.io</p>
    </main>
  </body>
</html>
`

const missingRouteHtml = `
<!DOCTYPE html>
<html lang="en" class="h-full bg-neutral-950 text-base antialiased">
  <head>
    <title>Defining the Future of Data Archiving</title>
  </head>
  <body>
    <main>
      <h1>404 Page not found</h1>
      <p>Sorry, we couldn't find the page you're looking for.</p>
      <a href="/">Go to the home page</a>
      <footer>© NeoWare Inc. 2025 All rights reserved. Email: contact@neoware.io</footer>
    </main>
  </body>
</html>
`

const liveMissingRouteHtml = `
<!DOCTYPE html>
<html lang="en" class="h-full bg-neutral-950 text-base antialiased">
  <head>
    <title>Defining the Future of Data Archiving</title>
  </head>
  <body>
    <main>
      <h1>404 Page not found</h1>
      <p>Sorry, we couldn’t find the page you’re looking for.</p>
      <a href="/">Go to the home page</a>
      <footer>© NeoWare Inc. 2025 All rights reserved. Email: contact@neoware.io</footer>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

test('Neoware sentinel recognizes the verified homepage and first-party missing-route shell', async () => {
  const neoware = await loadModule()
  assert.ok(neoware, 'Expected scraper module at ./script.js')

  assert.equal(neoware.SOURCE, 'neoware')
  assert.equal(neoware.COMPANY, 'Neoware')
  assert.equal(neoware.HOMEPAGE_URL, 'https://www.neoware.io/')
  assert.deepEqual(neoware.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://www.neoware.io/careers',
    'https://www.neoware.io/careers/',
    'https://www.neoware.io/career',
    'https://www.neoware.io/career/',
    'https://www.neoware.io/jobs',
    'https://www.neoware.io/jobs/',
    'https://www.neoware.io/openings',
    'https://www.neoware.io/openings/',
    'https://www.neoware.io/join-us',
    'https://www.neoware.io/join-us/',
    'https://www.neoware.io/sitemap.xml',
  ])

  assert.equal(neoware.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(neoware.hasUnexpectedCareerLikeLink(homepageHtml), false)
  assert.equal(neoware.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(
    neoware.isVerifiedMissingRoute({
      status: 404,
      url: 'https://www.neoware.io/careers',
      html: missingRouteHtml,
    }),
    true,
  )
  assert.equal(
    neoware.isVerifiedMissingRoute({
      status: 404,
      url: 'https://www.neoware.io/careers',
      html: liveMissingRouteHtml,
    }),
    true,
  )
})

test('Neoware sentinel returns no jobs only while the verified first-party surface stays unchanged', async () => {
  const neoware = await loadModule()
  assert.ok(neoware, 'Expected scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await neoware.createNeowareScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === neoware.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (neoware.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    neoware.HOMEPAGE_URL,
    ...neoware.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Neoware sentinel fails closed when the homepage or a checked route starts exposing careers content', async () => {
  const neoware = await loadModule()
  assert.ok(neoware, 'Expected scraper module at ./script.js')

  await assert.rejects(
    neoware.createNeowareScraper().run({
      fetchPage: async (url) => {
        if (url === neoware.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    neoware.createNeowareScraper().run({
      fetchPage: async (url) => {
        if (url === neoware.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml.replace('</nav>', '<a href="/careers">Careers</a></nav>'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage now exposes a first-party careers path/i,
  )

  await assert.rejects(
    neoware.createNeowareScraper().run({
      fetchPage: async (url) => {
        if (url === neoware.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === neoware.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><p>Current Openings</p></body></html>',
          }
        }

        if (neoware.NO_PUBLIC_CAREERS_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: missingRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /missing first-party route changed or now exposes a public careers surface/i,
  )
})
