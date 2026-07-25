import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => import('./script.js')

const homepageHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Velammal New Gen Edu Network</title>
    </head>
    <body>
      <header>
        <a href="https://velammal.org/admission/">Admissions</a>
      </header>
      <main>
        <h2>VELAMMAL GROUP</h2>
        <p>Velammal New Gen Edu Network mission.</p>
        <p>Velammal Educational Trust</p>
      </main>
      <footer>
        <p>Velammal Vidhyashram CBSE Surapet</p>
      </footer>
    </body>
  </html>
`

const careerHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Velammal New Gen Edu Network - Just another WordPress site</title>
    </head>
    <body>
      <main>
        <h1>When a teacher inspires, generations progress</h1>
        <p>We invite passionate teachers to join us in this mission.</p>
        <h2>Apply with this Application</h2>
        <p>Upload Resume (PDF/DOC/DOCX):</p>
        <p>Velammal Educational Trust</p>
        <p>Shri M.V. Muthuramalingam</p>
      </main>
      <footer>
        <p>© copyright 2026 | Velammal Groups</p>
      </footer>
    </body>
  </html>
`

const jobsHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Jobs - Velammal New Gen Edu Network</title>
    </head>
    <body>
      <main>
        <form class="filters-form" action="https://velammal.org/jobs/" method="get"></form>
        <div class="sjb-listing">
          <div class="list-view">
            <div class="no-job-listing">
              <img alt="No jobs found" id="sjb-not-found-v2" />
              <p class="no-job-listing-text">No jobs found</p>
            </div>
          </div>
        </div>
      </main>
    </body>
  </html>
`

const notFoundHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Page not found - Velammal New Gen Edu Network</title>
    </head>
    <body class="error404">
      <main id="error-404">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <a href="https://velammal.org/">Back to Home</a>
      </main>
    </body>
  </html>
`

test('Velammal Group of schools sentinel recognizes the verified homepage, career application page, and missing-route shell', async () => {
  const velammal = await loadModule()

  assert.equal(velammal.SOURCE, 'velammalgroupofschools')
  assert.equal(velammal.HOMEPAGE_URL, 'https://velammal.org/')
  assert.equal(velammal.CAREER_URL, 'https://velammal.org/career/')
  assert.equal(velammal.JOBS_URL, 'https://velammal.org/jobs/')
  assert.deepEqual(velammal.CHECKED_NO_LISTING_URLS, [
    'https://velammal.org/careers/',
    'https://velammal.org/current-openings/',
  ])

  assert.equal(velammal.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(velammal.hasOfficialCareerSignal(careerHtml), true)
  assert.equal(velammal.hasVerifiedEmptyJobsPageSignal(jobsHtml), true)
  assert.equal(velammal.hasPublicJobsSignal(careerHtml), false)
  assert.equal(
    velammal.isVerifiedNoListingRoute({
      status: 404,
      url: 'https://velammal.org/careers/',
      html: notFoundHtml,
    }),
    true,
  )
})

test('Velammal Group of schools sentinel returns no jobs only while the verified first-party hiring surface remains an apply-only form', async () => {
  const velammal = await loadModule()
  const requestedUrls = []

  const jobs = await velammal.createVelammalGroupOfSchoolsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === velammal.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === velammal.CAREER_URL) {
        return { status: 200, url, html: careerHtml }
      }

      if (url === velammal.JOBS_URL) {
        return { status: 200, url, html: jobsHtml }
      }

      if (velammal.CHECKED_NO_LISTING_URLS.includes(url)) {
        return { status: 404, url, html: notFoundHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://velammal.org/',
    'https://velammal.org/career/',
    'https://velammal.org/jobs/',
    'https://velammal.org/careers/',
    'https://velammal.org/current-openings/',
  ])
  assert.deepEqual(jobs, [])
})

test('Velammal Group of schools sentinel fails closed when the verified no-listing surface drifts or starts exposing jobs', async () => {
  const velammal = await loadModule()

  await assert.rejects(
    velammal.createVelammalGroupOfSchoolsScraper().run({
      fetchPage: async (url) => {
        if (url === velammal.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected homepage</h1></body></html>' }
        }

        if (url === velammal.CAREER_URL) {
          return { status: 200, url, html: careerHtml }
        }

        if (url === velammal.JOBS_URL) {
          return { status: 200, url, html: jobsHtml }
        }

        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    velammal.createVelammalGroupOfSchoolsScraper().run({
      fetchPage: async (url) => {
        if (url === velammal.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === velammal.CAREER_URL) {
          return {
            status: 200,
            url,
            html: careerHtml.replace(
              '</main>',
              '<a href="https://jobs.example.com/velammal/apply">Apply now</a></main>',
            ),
          }
        }

        if (url === velammal.JOBS_URL) {
          return { status: 200, url, html: jobsHtml }
        }

        return { status: 404, url, html: notFoundHtml }
      },
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    velammal.createVelammalGroupOfSchoolsScraper().run({
      fetchPage: async (url) => {
        if (url === velammal.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === velammal.CAREER_URL) {
          return { status: 200, url, html: careerHtml }
        }

        if (url === velammal.JOBS_URL) {
          return {
            status: 200,
            url,
            html: jobsHtml.replace(
              '<p class="no-job-listing-text">No jobs found</p>',
              '<a href="https://velammal.org/job/mathematics-teacher/">Mathematics Teacher</a>',
            ),
          }
        }

        return {
          status: 404,
          url,
          html: notFoundHtml,
        }
      },
    }),
    /empty jobs page/i,
  )

  await assert.rejects(
    velammal.createVelammalGroupOfSchoolsScraper().run({
      fetchPage: async (url) => {
        if (url === velammal.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === velammal.CAREER_URL) {
          return { status: 200, url, html: careerHtml }
        }

        if (url === velammal.JOBS_URL) {
          return { status: 200, url, html: jobsHtml }
        }

        return {
          status: 200,
          url,
          html: '<html><body><h1>Current openings</h1><a href="/job/teacher">Teacher</a></body></html>',
        }
      },
    }),
    /no-listing route/i,
  )
})
