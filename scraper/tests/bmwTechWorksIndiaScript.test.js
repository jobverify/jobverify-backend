import assert from 'node:assert/strict'
import test from 'node:test'

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>BMW Group & TATA Technologies:</h2>
    <p>
      BMW TechWorks India brings together the BMW Group and Tata Technologies and
      focuses exclusively on strategic software development.
    </p>
    <footer>Copyright 2026 BMW TechWorks India Pvt Ltd. All rights reserved</footer>
  </body>
</html>
`

const CAREERS_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Where Seamless Innovation Begins</h1>
    <section>Beyond the Resume: Our 3D Hiring Experience</section>
    <h2>Roles We’re Hiring For</h2>
    <ul>
      <li>Embedded Software Engineers</li>
      <li>DevOps CI-CD</li>
      <li>Automotive Vehicle Integration</li>
    </ul>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Open Positions</h1>
    <a href="https://www.bmwtechworks.in/careers/senior-platform-engineer">View Job</a>
    <a href="https://jobs.example.com/bmwtechworksindia/apply">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../bmwtechworksindia/script.js')
  } catch {
    assert.fail('Expected BMW TechWorks India scraper module at ../bmwtechworksindia/script.js')
  }
}

test('BMW TechWorks India scraper constants stay pinned to the verified Saturday, July 25, 2026 shell', async () => {
  const bmwTechWorksIndia = await loadModule()

  assert.equal(bmwTechWorksIndia.SOURCE, 'bmwtechworksindia')
  assert.equal(bmwTechWorksIndia.COMPANY, 'BMW TechWorks India')
  assert.equal(bmwTechWorksIndia.VERIFIED_ON, '2026-07-25')
  assert.equal(bmwTechWorksIndia.HOMEPAGE_URL, 'https://www.bmwtechworks.in/')
  assert.equal(bmwTechWorksIndia.CAREERS_PAGE_URL, 'https://www.bmwtechworks.in/careers/')
  assert.equal(bmwTechWorksIndia.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(bmwTechWorksIndia.hasCareerCategoryShellSignal(CAREERS_SHELL_HTML), true)
  assert.equal(bmwTechWorksIndia.hasPublicJobsSignal(CAREERS_SHELL_HTML), false)
  assert.equal(bmwTechWorksIndia.hasPublicJobsSignal(PUBLIC_JOBS_HTML), true)
})

test('BMW TechWorks India returns [] only while the verified first-party pages remain category shells without job links', async () => {
  const bmwTechWorksIndia = await loadModule()
  const requestedUrls = []

  const jobs = await bmwTechWorksIndia.createBmwTechWorksIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === bmwTechWorksIndia.HOMEPAGE_URL) {
        return {
          finalUrl: bmwTechWorksIndia.HOMEPAGE_URL,
          html: HOMEPAGE_HTML,
        }
      }

      if (url === bmwTechWorksIndia.CAREERS_PAGE_URL) {
        return {
          finalUrl: bmwTechWorksIndia.CAREERS_PAGE_URL,
          html: CAREERS_SHELL_HTML,
        }
      }

      throw new Error(`Unexpected BMW TechWorks India URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    bmwTechWorksIndia.HOMEPAGE_URL,
    bmwTechWorksIndia.CAREERS_PAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('BMW TechWorks India fails closed when the verified shell drifts or public jobs appear', async () => {
  const bmwTechWorksIndia = await loadModule()

  await assert.rejects(
    bmwTechWorksIndia.createBmwTechWorksIndiaScraper().run({
      fetchPage: async () => ({
        finalUrl: bmwTechWorksIndia.HOMEPAGE_URL,
        html: CAREERS_SHELL_HTML,
      }),
    }),
    /homepage signal changed materially/i,
  )

  await assert.rejects(
    bmwTechWorksIndia.createBmwTechWorksIndiaScraper().run({
      fetchPage: async (url) => ({
        finalUrl: url,
        html: url === bmwTechWorksIndia.HOMEPAGE_URL ? HOMEPAGE_HTML : PUBLIC_JOBS_HTML,
      }),
    }),
    /appears to expose public jobs/i,
  )
})
