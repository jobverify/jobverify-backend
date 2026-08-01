import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Oriented Courses for Freshers & Executives | Imarticus Learning</title>
  </head>
  <body>
    <main>
      <h1>Real Learning that delivers your career goals</h1>
      <p>3,500+ hiring partners</p>
    </main>
    <footer>
      <a href="/about-us/">About Us</a>
      <a href="/careers/">Careers at Imarticus</a>
      <p>Imarticus Learning</p>
    </footer>
  </body>
</html>
`

const careerServicesHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Build your dream career with Imarticus Rise</title>
    <link rel="canonical" href="https://imarticus.org/building-careers-of-the-future-with-imarticus-rise/" />
  </head>
  <body>
    <main>
      <h1>Building Careers Of The Future</h1>
      <p>Benefit From A Global Network Of 3500+ Hiring Partners</p>
      <p>We’re passionate about building meaningful careers that create an impact.</p>
      <a href="/programs/">Apply Now</a>
    </main>
    <footer>
      <p>Imarticus Rise</p>
    </footer>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Imarticus Careers</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Business Analyst"}
    </script>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://jobs.example.com/imarticus/business-analyst">Apply now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/imarticuslearning/script.js')
  } catch {
    assert.fail('Expected Imarticus Learning scraper module at ../../scraper/imarticuslearning/script.js')
  }
}

test('Imarticus Learning helpers stay pinned to the verified career-services-only first-party surface', async () => {
  const imarticusLearning = await loadModule()

  assert.equal(imarticusLearning.SOURCE, 'imarticuslearning')
  assert.equal(imarticusLearning.COMPANY, 'Imarticus Learning')
  assert.equal(imarticusLearning.HOMEPAGE_URL, 'https://imarticus.org/')
  assert.equal(imarticusLearning.CAREERS_URL, 'https://imarticus.org/careers/')
  assert.equal(
    imarticusLearning.CANONICAL_CAREER_SERVICES_URL,
    'https://imarticus.org/building-careers-of-the-future-with-imarticus-rise/',
  )
  assert.equal(imarticusLearning.COMPANY_DOMAIN, 'imarticus.org')
  assert.equal(imarticusLearning.VERIFIED_ON, '2026-07-16')
  assert.equal(imarticusLearning.extractCareerPageUrl(homepageHtml), imarticusLearning.CAREERS_URL)
  assert.equal(imarticusLearning.hasVerifiedHomepageSignals(homepageHtml), true)
  assert.equal(imarticusLearning.hasVerifiedCareerServicesSignals(careerServicesHtml), true)
  assert.equal(imarticusLearning.hasPublicEmployerJobSignals(careerServicesHtml), false)
  assert.equal(imarticusLearning.hasPublicEmployerJobSignals(publicJobsHtml), true)
})

test('Imarticus Learning returns [] while the verified first-party surface remains career-services-only', async () => {
  const imarticusLearning = await loadModule()
  const requestedUrls = []

  const jobs = await imarticusLearning.createImarticusLearningScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === imarticusLearning.HOMEPAGE_URL) return homepageHtml
      if (url === imarticusLearning.CAREERS_URL) return careerServicesHtml
      throw new Error(`Unexpected Imarticus Learning URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    imarticusLearning.HOMEPAGE_URL,
    imarticusLearning.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Imarticus Learning fails closed when the first-party handoff or careers page drifts into employer-job territory', async () => {
  const imarticusLearning = await loadModule()

  await assert.rejects(
    imarticusLearning.run({
      fetchText: async (url) => {
        if (url === imarticusLearning.HOMEPAGE_URL) {
          return homepageHtml.replace('/careers/', '/jobs/')
        }
        if (url === imarticusLearning.CAREERS_URL) return careerServicesHtml
        throw new Error(`Unexpected Imarticus Learning URL: ${url}`)
      },
    }),
    /verified homepage/i,
  )

  await assert.rejects(
    imarticusLearning.run({
      fetchText: async (url) => {
        if (url === imarticusLearning.HOMEPAGE_URL) return homepageHtml
        if (url === imarticusLearning.CAREERS_URL) return '<html><body><h1>Different page</h1></body></html>'
        throw new Error(`Unexpected Imarticus Learning URL: ${url}`)
      },
    }),
    /verified career services page/i,
  )

  await assert.rejects(
    imarticusLearning.run({
      fetchText: async (url) => {
        if (url === imarticusLearning.HOMEPAGE_URL) return homepageHtml
        if (url === imarticusLearning.CAREERS_URL) return publicJobsHtml
        throw new Error(`Unexpected Imarticus Learning URL: ${url}`)
      },
    }),
    /public jobs surface/i,
  )
})
