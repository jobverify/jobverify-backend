import assert from 'node:assert/strict'
import test from 'node:test'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Careers</h1>
      <h3>Unlock Your Career Potential With AFour Technologies</h3>
      <p>We are hiring</p>

      <section class="job-card">
        <h2>Cobol Developer</h2>
        <h2>4-8 Years</h2>
        <p>Cobol, db2, java, file handling, string handling, deployment</p>
        <a href="https://afourtech.com/contact-us/">Apply Now</a>
      </section>
      <section class="job-card">
        <h2>Senior SDET Performance</h2>
        <h2>4-7 Years</h2>
        <p>Performance testing</p>
        <a href="https://afourtech.com/contact-us/">Apply Now</a>
      </section>
      <section class="job-card">
        <h2>Lead SDET</h2>
        <h2>7-10 Years</h2>
        <p>Slenium, python, java, ci/cd, api testing</p>
        <a href="https://afourtech.com/contact-us/">Apply Now</a>
      </section>
      <section class="job-card">
        <h2>Sr. SDE Java</h2>
        <h2>4-8 Years</h2>
        <p>Java development</p>
        <a href="https://afourtech.com/contact-us/">Apply Now</a>
      </section>
      <section class="job-card">
        <h2>Lead SDET Enterprise Analytics Testing</h2>
        <h2>6-8 Years</h2>
        <p>etl testing, BI Testing, Python</p>
        <a href="https://afourtech.com/contact-us/">Apply Now</a>
      </section>
      <section class="job-card">
        <h2>Sr. Python Developer</h2>
        <h2>4-8 Years</h2>
        <p>Python development</p>
        <a href="https://afourtech.com/contact-us/">Apply Now</a>
      </section>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/afourtechnologies/script.js')
  } catch {
    assert.fail('Expected AFour Technologies scraper module at ../../scraper/afourtechnologies/script.js')
  }
}

test('AFour Technologies helpers stay pinned to the verified careers page from Saturday, July 18, 2026', async () => {
  const afour = await loadModule()

  assert.equal(afour.SOURCE, 'afourtechnologies')
  assert.equal(afour.COMPANY, 'AFour Technologies')
  assert.equal(afour.CAREERS_URL, 'https://afourtech.com/careers-3/')
  assert.equal(afour.VERIFIED_ON, '2026-07-18')
  assert.equal(afour.hasOfficialCareersSignal(careersPageHtml), true)

  const jobs = afour.extractJobs(careersPageHtml)
  assert.equal(jobs.length, 6)
  assert.deepEqual(jobs[0], {
    title: 'Cobol Developer',
    experience: '4-8 Years',
    description: 'Cobol, db2, java, file handling, string handling, deployment',
    location: 'India',
    sourceUrl: 'https://afourtech.com/careers-3/',
    applyUrl: 'https://afourtech.com/contact-us/',
  })
})

test('AFour Technologies returns public jobs from the verified first-party careers page', async () => {
  const afour = await loadModule()
  const requestedUrls = []

  const jobs = await afour.createAFourTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === afour.CAREERS_URL) return careersPageHtml
      throw new Error(`Unexpected AFour Technologies URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [afour.CAREERS_URL])
  assert.equal(jobs.length, 6)
  assert.equal(jobs[0].company, 'AFour Technologies')
  assert.equal(jobs[0].source, 'afourtechnologies')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
  assert.notEqual(jobs[0].jobId, jobs[1].jobId)
})

test('AFour Technologies fails closed when the verified careers page loses its public job cards', async () => {
  const afour = await loadModule()

  await assert.rejects(
    afour.createAFourTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1><p>Join us</p></body></html>',
    }),
    /verified AFour Technologies careers surface/i,
  )
})
