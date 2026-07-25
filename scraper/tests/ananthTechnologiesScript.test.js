import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Ananth Technologies | Aerospace &amp; Defence</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/satcom">SATCOM</a>
        <a href="/broadband">BROADBAND</a>
        <a href="/about">About</a>
        <a href="/products">Products</a>
        <a href="/services">Services</a>
        <a href="/facilities">Facilities</a>
        <a href="/careers">Careers</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>
    <main>
      <h1>Coming Soon KA-Band High-Throughput Satellite</h1>
      <p>Delivering high-speed satellite broadband connectivity to underserved regions and enabling next-generation applications.</p>
      <section>
        <h2>Featured Mission SPADEX</h2>
        <p>India's First In-Space Docking Experiment</p>
      </section>
      <section>
        <h2>National Missions</h2>
        <p>Proud contributor to India's flagship space programs</p>
      </section>
    </main>
  </body>
</html>
`

const careersResumeOnlyHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Ananth Technologies | Aerospace &amp; Defence</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/careers">Careers</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>
    <main>
      <h1>Join Our Team</h1>
      <h2>Shape the future of aerospace technology</h2>
      <p>Build Your Legacy in Aerospace</p>
      <p>
        At Ananth Technologies, we don't just manufacture components; we engineer the future of
        space exploration and national defense.
      </p>
      <p>
        Ready to launch your career? We are always looking for exceptional talent in Hardware,
        Software, RF and Microwave and Mechanical systems design and manufacturing. Send us your
        resume and tell us how you can contribute.
      </p>
      <p><a href="mailto:jobs@ananthtech.com">jobs@ananthtech.com</a></p>
    </main>
  </body>
</html>
`

const forbiddenJobsRouteHtml = `
<html>
  <head><title>403 Forbidden</title></head>
  <body>
    <h1>403 Forbidden</h1>
    <ul>
      <li>Code: AccessDenied</li>
      <li>Message: Access Denied</li>
    </ul>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Ananth Technologies Careers</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"RF Engineer"}
    </script>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://jobs.lever.co/ananthtech/rf-engineer">Apply now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../ananthtechnologies/script.js')
  } catch {
    assert.fail('Expected Ananth Technologies scraper module at ../ananthtechnologies/script.js')
  }
}

test('Ananth Technologies scraper constants stay pinned to the verified first-party no-public-careers surface from July 15, 2026', async () => {
  const ananth = await loadModule()

  assert.equal(ananth.SOURCE, 'ananthtechnologies')
  assert.equal(ananth.COMPANY, 'Ananth Technologies')
  assert.equal(ananth.OFFICIAL_BRAND_NAME, 'Ananth Technologies')
  assert.equal(ananth.VERIFIED_AT, '2026-07-15')
  assert.equal(ananth.HOMEPAGE_URL, 'https://ananthtech.com/')
  assert.equal(ananth.CAREERS_ENTRY_URL, 'https://ananthtech.com/careers')
  assert.equal(ananth.CAREERS_URL, 'https://ananthtech.com/careers/')
  assert.equal(ananth.APPLICATION_EMAIL, 'jobs@ananthtech.com')
  assert.equal(ananth.APPLICATION_URL, 'mailto:jobs@ananthtech.com')
  assert.deepEqual(ananth.NO_PUBLIC_JOB_ROUTE_URLS, [
    'https://ananthtech.com/jobs',
    'https://ananthtech.com/jobs/',
    'https://www.ananthtech.com/jobs',
    'https://www.ananthtech.com/jobs/',
  ])
  assert.match(ananth.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(ananth.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(ananth.hasResumeOnlyCareersSignal(careersResumeOnlyHtml), true)
  assert.equal(ananth.pageExposesPublicJobListings(careersResumeOnlyHtml), false)
  assert.equal(ananth.pageExposesPublicJobListings(publicJobsHtml), true)
  assert.equal(
    ananth.isVerifiedNoPublicJobRoute(
      {
        status: 403,
        url: 'https://ananthtech.com/jobs',
        html: forbiddenJobsRouteHtml,
      },
      'https://ananthtech.com/jobs',
    ),
    true,
  )
})

test('Ananth Technologies returns no jobs only while the verified careers page remains resume-only and common job routes stay forbidden', async () => {
  const ananth = await loadModule()
  const requestedUrls = []

  const jobs = await ananth.createAnanthTechnologiesScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === ananth.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === ananth.CAREERS_ENTRY_URL) {
        return { status: 200, url: ananth.CAREERS_URL, html: careersResumeOnlyHtml }
      }

      if (ananth.NO_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 403, url, html: forbiddenJobsRouteHtml }
      }

      throw new Error(`Unexpected Ananth Technologies URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ananth.HOMEPAGE_URL,
    ananth.CAREERS_ENTRY_URL,
    ...ananth.NO_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Ananth Technologies fails closed when the homepage, careers page, or forbidden job routes drift into a public jobs surface', async () => {
  const ananth = await loadModule()

  await assert.rejects(
    ananth.createAnanthTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === ananth.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Placeholder</title></head><body>Welcome</body></html>' }
        }

        throw new Error(`Unexpected Ananth Technologies URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    ananth.createAnanthTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === ananth.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === ananth.CAREERS_ENTRY_URL) {
          return { status: 200, url: ananth.CAREERS_URL, html: publicJobsHtml }
        }

        throw new Error(`Unexpected Ananth Technologies URL: ${url}`)
      },
    }),
    /public jobs surface|resume-only/i,
  )

  await assert.rejects(
    ananth.createAnanthTechnologiesScraper().run({
      fetchPage: async (url) => {
        if (url === ananth.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === ananth.CAREERS_ENTRY_URL) {
          return { status: 200, url: ananth.CAREERS_URL, html: careersResumeOnlyHtml }
        }

        if (url === ananth.NO_PUBLIC_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: '<html><body><h1>Careers hub</h1></body></html>' }
        }

        if (ananth.NO_PUBLIC_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 403, url, html: forbiddenJobsRouteHtml }
        }

        throw new Error(`Unexpected Ananth Technologies URL: ${url}`)
      },
    }),
    /verified no-public-job route changed/i,
  )
})
