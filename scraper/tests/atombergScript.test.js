import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Atomberg: Buy Best Ceiling Fans, Mixer Grinders &amp; Water Purifier</title>
  </head>
  <body>
    <main>
      <h1>Welcome to Atomberg!</h1>
      <p>
        From day one, we've turned real customer problems into modern solutions through tech-first
        innovation, R&amp;D, and design.
      </p>
      <p>Pan-India service network with on-site warranty</p>
    </main>
    <footer>
      <a href="/careers">Careers</a>
    </footer>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Atomberg- Join us in the journey of revolutionizing India&#x27;s home appliances</title>
  </head>
  <body>
    <main>
      <h1>CAREERS</h1>
      <p>
        Interested candidates can share their updated resumes on
        <a href="/cdn-cgi/l/email-protection#b0d3d1c2d5d5c2f0d1c4dfddd2d5c2d79ed3dfdd">
          <span class="__cf_email__" data-cfemail="096a687b6c6c7b49687d66646b6c7b6e276a6664">[email&#160;protected]</span>
        </a>
      </p>
    </main>
    <footer>
      <a href="/careers">Careers</a>
    </footer>
  </body>
</html>
`

const next404Html = `
<!doctype html>
<html id="__next_error__">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta name="robots" content="noindex" />
    <meta name="generator" content="Next.js" />
  </head>
  <body></body>
</html>
`

const internalServerErrorHtml = `
<!doctype html>
<html>
  <head>
    <title>500: Internal Server Error</title>
  </head>
  <body>
    <h1>500: Internal Server Error</h1>
    <p>500 Internal Server Error .</p>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Atomberg Careers</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Senior Engineer"}
    </script>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://jobs.lever.co/atomberg/senior-engineer">Apply now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../atomberg/script.js')
  } catch {
    assert.fail('Expected Atomberg scraper module at ../atomberg/script.js')
  }
}

test('Atomberg sentinel pins the verified homepage, email-only careers page, and missing-route contract from July 15, 2026', async () => {
  const atomberg = await loadModule()

  assert.equal(atomberg.SOURCE, 'atomberg')
  assert.equal(atomberg.COMPANY, 'Atomberg')
  assert.equal(atomberg.OFFICIAL_BRAND_NAME, 'Atomberg')
  assert.equal(atomberg.VERIFIED_AT, '2026-07-15')
  assert.equal(atomberg.HOMEPAGE_URL, 'https://atomberg.com/')
  assert.equal(atomberg.CAREERS_URL, 'https://atomberg.com/careers')
  assert.equal(atomberg.APPLICATION_EMAIL, 'career@atomberg.com')
  assert.equal(atomberg.APPLICATION_URL, 'mailto:career@atomberg.com')
  assert.deepEqual(atomberg.NO_PUBLIC_JOB_ROUTE_URLS, [
    'https://atomberg.com/jobs',
    'https://atomberg.com/pages/careers',
  ])
  assert.equal(atomberg.BROKEN_CAREER_ROUTE_URL, 'https://atomberg.com/career')
  assert.match(atomberg.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)

  assert.equal(atomberg.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(atomberg.extractApplicationEmail(careersHtml), 'career@atomberg.com')
  assert.equal(atomberg.hasResumeOnlyCareersSignal(careersHtml), true)
  assert.equal(atomberg.pageExposesPublicJobListings(careersHtml), false)
  assert.equal(atomberg.pageExposesPublicJobListings(publicJobsHtml), true)
  assert.equal(
    atomberg.hasVerifiedNext404Route(
      {
        status: 404,
        url: 'https://atomberg.com/jobs',
        html: next404Html,
      },
      'https://atomberg.com/jobs',
    ),
    true,
  )
  assert.equal(
    atomberg.hasVerifiedInternalServerErrorRoute(
      {
        status: 500,
        url: 'https://atomberg.com/career',
        html: internalServerErrorHtml,
      },
      'https://atomberg.com/career',
    ),
    true,
  )
})

test('Atomberg sentinel returns [] only while the homepage, careers page, and adjacent job routes stay in the verified no-public-jobs state', async () => {
  const atomberg = await loadModule()
  const requestedUrls = []

  const jobs = await atomberg.createAtombergScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === atomberg.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === atomberg.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (atomberg.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: next404Html }
      }

      if (url === atomberg.BROKEN_CAREER_ROUTE_URL) {
        return { status: 500, url, html: internalServerErrorHtml }
      }

      throw new Error(`Unexpected Atomberg URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    atomberg.HOMEPAGE_URL,
    atomberg.CAREERS_URL,
    ...atomberg.NO_PUBLIC_JOB_ROUTE_URLS,
    atomberg.BROKEN_CAREER_ROUTE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Atomberg sentinel fails closed when the homepage, careers page, or adjacent routes drift into a public jobs surface', async () => {
  const atomberg = await loadModule()

  await assert.rejects(
    atomberg.createAtombergScraper().run({
      fetchPage: async (url) => {
        if (url === atomberg.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Placeholder</title></head><body>Welcome</body></html>' }
        }

        throw new Error(`Unexpected Atomberg URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    atomberg.createAtombergScraper().run({
      fetchPage: async (url) => {
        if (url === atomberg.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === atomberg.CAREERS_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected Atomberg URL: ${url}`)
      },
    }),
    /public jobs surface|resume-only/i,
  )

  await assert.rejects(
    atomberg.createAtombergScraper().run({
      fetchPage: async (url) => {
        if (url === atomberg.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === atomberg.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === atomberg.NO_PUBLIC_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body><h1>Current Openings</h1></body></html>' }
        }

        if (url === atomberg.NO_PUBLIC_JOB_ROUTE_URLS[1]) {
          return { status: 404, url, html: next404Html }
        }

        if (url === atomberg.BROKEN_CAREER_ROUTE_URL) {
          return { status: 500, url, html: internalServerErrorHtml }
        }

        throw new Error(`Unexpected Atomberg URL: ${url}`)
      },
    }),
    /verified no-public-job route changed/i,
  )

  await assert.rejects(
    atomberg.createAtombergScraper().run({
      fetchPage: async (url) => {
        if (url === atomberg.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === atomberg.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (atomberg.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
          return { status: 404, url, html: next404Html }
        }

        if (url === atomberg.BROKEN_CAREER_ROUTE_URL) {
          return { status: 200, url, html: '<html><body><h1>Current Openings</h1><a href="/apply">Apply now</a></body></html>' }
        }

        throw new Error(`Unexpected Atomberg URL: ${url}`)
      },
    }),
    /verified broken career route changed/i,
  )
})
