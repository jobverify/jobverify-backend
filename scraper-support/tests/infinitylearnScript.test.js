import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Infinity Learn India's Top Online Learning Platform for Class 6 to 12, IIT JEE &amp; NEET Exams</title>
    <link rel="canonical" href="https://infinitylearn.com" />
    <meta property="og:site_name" content="Infinity Learn" />
    <meta name="description" content="Infinity Learn is India's top online learning platform for Class 6-12, IIT-JEE, and NEET exams." />
  </head>
  <body>
    <h1>Power up your academic learning journey with Infinity Learn</h1>
    <a href="tel:7996668865">Talk to experts</a>
  </body>
</html>
`

const careerHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Careers at Infinity Learn | Grow with India's Top EdTech</title>
    <link rel="canonical" href="https://infinitylearn.com/career" />
    <meta property="og:site_name" content="Infinity Learn" />
    <meta name="description" content="Join Infinity Learn: build a teaching career with mission-driven work, growth, wellness &amp; performance incentives." />
  </head>
  <body>
    <h1>help us build the future of education</h1>
    <p>cultivating distinguished careers.</p>
    <p>1200+ employees &amp; growing rapidly</p>
    <h2>why Infinity Learn?</h2>
    <p>advance your career.</p>
    <h2>infinity learn's selection process</h2>
    <button type="button">Apply Now</button>
    <button type="button">apply now</button>
  </body>
</html>
`

const careers404Html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="robots" content="noindex" />
    <title>404 Page Not Found – InfinityLearn</title>
    <meta name="description" content="Sorry, the page you are looking for cannot be found. Explore more content on Your Infinity Learn." />
    <meta property="og:site_name" content="Infinity Learn" />
  </head>
  <body>
    <h1>404</h1>
    <p>Page not found</p>
  </body>
</html>
`

const loadInfinitylearnModule = async () => {
  try {
    return await import('../../scraper/infinitylearn/script.js')
  } catch {
    assert.fail('Expected Infinity Learn scraper module at ../../scraper/infinitylearn/script.js')
  }
}

test('Infinity Learn validates the verified official homepage, empty career shell, and missing alternate routes', async () => {
  const infinitylearn = await loadInfinitylearnModule()

  assert.equal(infinitylearn.SOURCE, 'infinitylearn')
  assert.equal(infinitylearn.COMPANY, 'Infinity Learn')
  assert.equal(infinitylearn.HOMEPAGE_URL, 'https://infinitylearn.com/')
  assert.equal(infinitylearn.CAREER_URL, 'https://infinitylearn.com/career')
  assert.deepEqual(infinitylearn.MISSING_ROUTE_URLS, [
    'https://infinitylearn.com/careers',
    'https://infinitylearn.com/jobs',
  ])
  assert.equal(infinitylearn.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(infinitylearn.hasOfficialCareerSignal(careerHtml), true)
  assert.equal(infinitylearn.hasPublicJobBoardSignal(careerHtml), false)
  assert.equal(
    infinitylearn.isVerifiedMissingRoute({
      status: 404,
      url: 'https://infinitylearn.com/careers',
      html: careers404Html,
    }),
    true,
  )
  assert.equal(
    infinitylearn.isVerifiedMissingRoute({
      status: 404,
      url: 'https://infinitylearn.com/careers',
      html: `${careers404Html}<a href="/">Go to home</a>`,
    }),
    true,
  )
})

test('Infinity Learn returns no jobs while the verified first-party career page remains a generic apply shell', async () => {
  const infinitylearn = await loadInfinitylearnModule()
  const requestedUrls = []

  const jobs = await infinitylearn.createInfinitylearnScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === infinitylearn.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          html: homepageHtml,
        }
      }

      if (url === infinitylearn.CAREER_URL) {
        return {
          status: 200,
          url,
          html: careerHtml,
        }
      }

      if (infinitylearn.MISSING_ROUTE_URLS.includes(url)) {
        return {
          status: 404,
          url,
          html: careers404Html,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    infinitylearn.HOMEPAGE_URL,
    infinitylearn.CAREER_URL,
    ...infinitylearn.MISSING_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Infinity Learn fails closed when the verified shell changes or public job listings appear', async () => {
  const infinitylearn = await loadInfinitylearnModule()

  await assert.rejects(
    infinitylearn.createInfinitylearnScraper().run({
      fetchPage: async (url) => {
        if (url === infinitylearn.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Unexpected homepage</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    infinitylearn.createInfinitylearnScraper().run({
      fetchPage: async (url) => {
        if (url === infinitylearn.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml,
          }
        }

        if (url === infinitylearn.CAREER_URL) {
          return {
            status: 200,
            url,
            html: `${careerHtml}<a href="/career/senior-math-faculty">View job</a>`,
          }
        }

        return {
          status: 404,
          url,
          html: careers404Html,
        }
      },
    }),
    /career page now appears to expose public job listings/i,
  )

  await assert.rejects(
    infinitylearn.createInfinitylearnScraper().run({
      fetchPage: async (url) => {
        if (url === infinitylearn.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml,
          }
        }

        if (url === infinitylearn.CAREER_URL) {
          return {
            status: 200,
            url,
            html: careerHtml,
          }
        }

        return {
          status: 200,
          url,
          html: '<html><body><h1>Jobs</h1><a href="/jobs/physics-faculty">Apply now</a></body></html>',
        }
      },
    }),
    /missing careers routes changed materially or now expose public jobs/i,
  )
})

test('Infinity Learn falls back to a browser-backed page loader when Node fetch times out', async () => {
  const infinitylearn = await loadInfinitylearnModule()
  const requestedPrimaryUrls = []
  const requestedBrowserUrls = []

  const jobs = await infinitylearn.createInfinitylearnScraper().run({
    fetchPage: async (url) => {
      requestedPrimaryUrls.push(url)
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fetchBrowserPage: async (url) => {
      requestedBrowserUrls.push(url)

      if (url === infinitylearn.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === infinitylearn.CAREER_URL) {
        return { status: 200, url, html: careerHtml }
      }

      if (infinitylearn.MISSING_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: careers404Html }
      }

      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPrimaryUrls, [
    infinitylearn.HOMEPAGE_URL,
    infinitylearn.CAREER_URL,
    ...infinitylearn.MISSING_ROUTE_URLS,
  ])
  assert.deepEqual(requestedBrowserUrls, requestedPrimaryUrls)
  assert.deepEqual(jobs, [])
})
