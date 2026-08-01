import assert from 'node:assert/strict'
import test from 'node:test'

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us | Springworks</title>
  </head>
  <body>
    <a href="https://springworks.goodfit.so/careers/springworks">Join our team</a>
    <footer><a href="https://springworks.goodfit.so/careers/springworks">Work with Us</a></footer>
  </body>
</html>
`

const jobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Springworks Careers</title>
  </head>
  <body>
    <section>
      <a href="/jobs/springworks/Sales-SDR-Intern?id=1MgmvBUL">
        <h3>Sales/ SDR Intern</h3>
        <p>Springworks ✦ Remote</p>
      </a>
      <a href="/jobs/springworks/Account-Executive-Goodfit?id=2Goodfit">
        <h3>Account Executive - Goodfit</h3>
        <p>Springworks ✦ Remote</p>
      </a>
      <a href="/jobs/springworks/Sales-Development-Representative-SpringVerify?id=3Verify">
        <h3>Sales Development Representative- SpringVerify</h3>
        <p>Springworks ✦ Remote</p>
      </a>
    </section>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/springworks/script.js')
  } catch {
    assert.fail('Expected Springworks scraper module at ../../scraper/springworks/script.js')
  }
}

test('Springworks scraper parses verified public role cards from the Goodfit jobs surface', async () => {
  const springworks = await loadScriptModule()

  assert.equal(springworks.SOURCE, 'springworks')
  assert.equal(springworks.COMPANY, 'Springworks')
  assert.equal(springworks.VERIFIED_ON, '2026-07-18')
  assert.equal(springworks.ABOUT_URL, 'https://www.springworks.in/about-us/')
  assert.equal(springworks.HANDOFF_URL, 'https://springworks.goodfit.so/careers/springworks')
  assert.equal(springworks.JOBS_URL, 'https://app.goodfit.so/careers/springworks/jobs')
  assert.equal(springworks.hasFirstPartyAboutSignal(aboutHtml), true)
  assert.equal(springworks.hasGoodfitJobsSignal(jobsHtml), true)

  const extractedJobs = springworks.extractSpringworksJobs(jobsHtml)
  assert.equal(extractedJobs.length, 3)

  const jobs = await springworks.createSpringworksScraper().run({
    fetchPage: async (url) => {
      if (url === springworks.ABOUT_URL) return { status: 200, url, html: aboutHtml }
      if (url === springworks.JOBS_URL) return { status: 200, url, html: jobsHtml }
      throw new Error(`Unexpected Springworks URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.applyUrl]),
    [
      ['Sales/ SDR Intern', 'Remote', 'https://app.goodfit.so/jobs/springworks/Sales-SDR-Intern?id=1MgmvBUL'],
      ['Account Executive - Goodfit', 'Remote', 'https://app.goodfit.so/jobs/springworks/Account-Executive-Goodfit?id=2Goodfit'],
      ['Sales Development Representative- SpringVerify', 'Remote', 'https://app.goodfit.so/jobs/springworks/Sales-Development-Representative-SpringVerify?id=3Verify'],
    ],
  )
})

test('Springworks scraper fails closed when the about or jobs surfaces drift', async () => {
  const springworks = await loadScriptModule()

  await assert.rejects(
    springworks.createSpringworksScraper().run({
      fetchPage: async (url) => {
        if (url === springworks.ABOUT_URL) return { status: 200, url, html: '<title>Unexpected</title>' }
        throw new Error(`Unexpected Springworks URL: ${url}`)
      },
    }),
    /trusted careers handoff surface/i,
  )

  await assert.rejects(
    springworks.createSpringworksScraper().run({
      fetchPage: async (url) => {
        if (url === springworks.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === springworks.JOBS_URL) return { status: 200, url, html: '<title>Springworks Careers</title>' }
        throw new Error(`Unexpected Springworks URL: ${url}`)
      },
    }),
    /verified SSR jobs surface/i,
  )
})
