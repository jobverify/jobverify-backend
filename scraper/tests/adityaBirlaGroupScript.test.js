import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aditya Birla Group of Companies - History, Businesses, Legacy</title>
  </head>
  <body>
    <section>
      <h2>Join Our Team</h2>
      <p>
        Discover your next chapter with us. Explore a rewarding career with Aditya Birla Group
        that aligns with your purpose, passion and potential.
      </p>
    </section>
  </body>
</html>
`

const verifiedCareersHomeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Explore Careers & Opportunities Across Industries | Aditya Birla Group</title>
  </head>
  <body>
    <nav>
      <a href="/about-us">About Us</a>
      <a href="/leadership-programs">Leadership Programs</a>
      <a href="/life-and-culture">Life and Culture</a>
      <a href="/resources">Resources</a>
      <a href="/job-search">Job Search</a>
    </nav>
    <section>
      <h2>Join a team that is building the future.</h2>
      <p>We lead 20+ sectors, shaping industries and creating meaningful change in everyday lives.</p>
    </section>
  </body>
</html>
`

const verifiedZeroJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Search Jobs at Aditya Birla Group – Apply Online</title>
  </head>
  <body>
    <main>
      <h1>Search Jobs at Aditya Birla Group – Apply Online</h1>
      <h2>Showing 1–0 jobs out of 0</h2>
      <section class="result-card">
        <h3>No Jobs Available</h3>
        <p>
          Currently, we have no vacancies in this sector. Please upload your resume for future
          opportunities, or discover jobs in other businesses.
        </p>
        <a href="https://abgcareers.peoplestrong.com/register">Upload CV</a>
      </section>
    </main>
  </body>
</html>
`

const verifiedOpeningHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Search Jobs at Aditya Birla Group – Apply Online</title>
  </head>
  <body>
    <main>
      <h1>Search Jobs at Aditya Birla Group – Apply Online</h1>
      <h2>Showing 1–1 jobs out of 1</h2>
      <section class="result-card">
        <h3>Senior Manager - Manufacturing</h3>
        <p>Gujarat, India</p>
        <a href="/job-search/senior-manager-manufacturing">View Details</a>
      </section>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../adityabirlagroup/script.js')
  } catch {
    assert.fail('Expected Aditya Birla Group scraper module at ../adityabirlagroup/script.js')
  }
}

test('Aditya Birla Group pins the verified public careers homepage and zero-jobs search surface from July 14, 2026', async () => {
  const adityaBirlaGroup = await loadModule()

  assert.equal(adityaBirlaGroup.SOURCE, 'adityabirlagroup')
  assert.equal(adityaBirlaGroup.COMPANY, 'Aditya Birla Group')
  assert.equal(adityaBirlaGroup.HOMEPAGE_URL, 'https://www.adityabirla.com/')
  assert.equal(adityaBirlaGroup.CAREERS_HOME_URL, 'https://careers.adityabirla.com/')
  assert.equal(adityaBirlaGroup.JOB_SEARCH_URL, 'https://careers.adityabirla.com/job-search')
  assert.equal(adityaBirlaGroup.UPLOAD_CV_URL, 'https://abgcareers.peoplestrong.com/register')
  assert.equal(adityaBirlaGroup.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(adityaBirlaGroup.hasOfficialCareersHomeSignal(verifiedCareersHomeHtml), true)
  assert.equal(
    adityaBirlaGroup.extractJobSearchUrl(verifiedCareersHomeHtml),
    adityaBirlaGroup.JOB_SEARCH_URL,
  )
  assert.equal(adityaBirlaGroup.extractUploadCvUrl(verifiedZeroJobsHtml), adityaBirlaGroup.UPLOAD_CV_URL)
  assert.equal(adityaBirlaGroup.hasVerifiedZeroJobsSurface(verifiedZeroJobsHtml), true)
  assert.equal(adityaBirlaGroup.hasPublicJobSignal(verifiedZeroJobsHtml), false)
  assert.equal(adityaBirlaGroup.hasPublicJobSignal(verifiedOpeningHtml), true)
})

test('Aditya Birla Group returns no jobs while the verified first-party public job-search surface remains empty', async () => {
  const adityaBirlaGroup = await loadModule()
  const requestedUrls = []

  const jobs = await adityaBirlaGroup.createAdityaBirlaGroupScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === adityaBirlaGroup.HOMEPAGE_URL) {
        return verifiedHomepageHtml
      }

      if (url === adityaBirlaGroup.CAREERS_HOME_URL) {
        return verifiedCareersHomeHtml
      }

      if (url === adityaBirlaGroup.JOB_SEARCH_URL) {
        return verifiedZeroJobsHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    adityaBirlaGroup.HOMEPAGE_URL,
    adityaBirlaGroup.CAREERS_HOME_URL,
    adityaBirlaGroup.JOB_SEARCH_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Aditya Birla Group fails closed when the verified homepage, careers handoff, or public search surface drifts', async () => {
  const adityaBirlaGroup = await loadModule()

  await assert.rejects(
    adityaBirlaGroup.createAdityaBirlaGroupScraper().run({
      fetchText: async (url) => {
        if (url === adityaBirlaGroup.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body>Broken</body></html>'
        }

        if (url === adityaBirlaGroup.CAREERS_HOME_URL) {
          return verifiedCareersHomeHtml
        }

        return verifiedZeroJobsHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    adityaBirlaGroup.createAdityaBirlaGroupScraper().run({
      fetchText: async (url) => {
        if (url === adityaBirlaGroup.HOMEPAGE_URL) {
          return verifiedHomepageHtml
        }

        if (url === adityaBirlaGroup.CAREERS_HOME_URL) {
          return verifiedCareersHomeHtml.replace('/job-search', '/careers-openings')
        }

        return verifiedZeroJobsHtml
      },
    }),
    /verified public job-search route/i,
  )

  await assert.rejects(
    adityaBirlaGroup.createAdityaBirlaGroupScraper().run({
      fetchText: async (url) => {
        if (url === adityaBirlaGroup.HOMEPAGE_URL) {
          return verifiedHomepageHtml
        }

        if (url === adityaBirlaGroup.CAREERS_HOME_URL) {
          return verifiedCareersHomeHtml
        }

        if (url === adityaBirlaGroup.JOB_SEARCH_URL) {
          return verifiedOpeningHtml
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public jobs surface now exposes openings/i,
  )
})
