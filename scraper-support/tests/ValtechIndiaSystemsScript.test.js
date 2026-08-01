import assert from 'node:assert/strict'
import test from 'node:test'

const listingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs list - Valtech India</title>
  </head>
  <body>
    <h1>Jobs list</h1>
    <div class="job-listing">
      <a href="https://careers.india.valtech.com/jobs/5421672-java-lead-developer">Java - Lead Developer</a>
      <p>Mobility Business Unit · Gandhinagar</p>
    </div>
    <div class="job-listing">
      <a href="https://careers.india.valtech.com/jobs/5395703-frontend-technical-lead">Frontend Lead</a>
      <p>Digital XP · Bengaluru</p>
    </div>
  </body>
</html>
`

const detailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <p>Vendors Teamtailor</p>
    <nav>Career menu</nav>
    <div>Mobility Business Unit · Gandhinagar</div>
    <h1>Java - Lead Developer</h1>
    <a href="/jobs/5421672-java-lead-developer/apply">Apply for this job</a>
    <p>We are Valtech Mobility, a strategic business unit of Valtech Group.</p>
    <h2>Mandatory mindset, skillset and experience</h2>
    <ul>
      <li>Hands on experience in building Java applications using Java 8 (and above), Spring Boot and Hibernate</li>
      <li>Skilled in TDD approach</li>
    </ul>
    <h2>Ideal candidates should also have</h2>
    <ul>
      <li>Experience with automation of software integration, testing, delivery, and deployment</li>
    </ul>
    <div>Department</div>
    <div>Mobility Business Unit</div>
    <div>Role</div>
    <div>Developer</div>
    <div>Locations</div>
    <div>Gandhinagar</div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/valtechindiasystems/script.js')
  } catch {
    assert.fail('Expected Valtech India Systems scraper module at ../../scraper/valtechindiasystems/script.js')
  }
}

test('Valtech India Systems validates the Teamtailor listing page and extracts job cards', async () => {
  const valtech = await loadModule()

  assert.equal(valtech.SOURCE, 'valtechindiasystems')
  assert.equal(valtech.COMPANY, 'Valtech India Systems')
  assert.equal(valtech.JOBS_URL, 'https://careers.india.valtech.com/jobs')
  assert.equal(valtech.hasOfficialJobsPageSignal(listingHtml), true)

  const listings = valtech.extractJobListings(listingHtml)
  assert.equal(listings.length, 2)
  assert.equal(listings[0].title, 'Java - Lead Developer')
  assert.equal(listings[0].department, 'Mobility Business Unit')
  assert.equal(listings[0].location, 'Gandhinagar, India')
})

test('Valtech India Systems run enriches first-party Teamtailor jobs from the detail page', async () => {
  const valtech = await loadModule()
  const requestedUrls = []

  const jobs = await valtech.createValtechindiasystemsScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === valtech.JOBS_URL) return listingHtml
      if (url === 'https://careers.india.valtech.com/jobs/5421672-java-lead-developer') return detailHtml
      if (url === 'https://careers.india.valtech.com/jobs/5395703-frontend-technical-lead') {
        return detailHtml
          .replace(/Java - Lead Developer/g, 'Frontend Lead')
          .replace(/Mobility Business Unit/g, 'Digital XP')
          .replace(/Gandhinagar/g, 'Bengaluru')
      }
      throw new Error(`Unexpected Valtech fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    valtech.JOBS_URL,
    'https://careers.india.valtech.com/jobs/5421672-java-lead-developer',
    'https://careers.india.valtech.com/jobs/5395703-frontend-technical-lead',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].applyUrl, 'https://careers.india.valtech.com/jobs/5421672-java-lead-developer/apply')
  assert.equal(jobs[1].location, 'Bengaluru, India')
})

test('Valtech India Systems fails closed when the Teamtailor contract drifts', async () => {
  const valtech = await loadModule()

  await assert.rejects(
    valtech.createValtechindiasystemsScraper().run({
      fetchText: async () => listingHtml.replace('Jobs list - Valtech India', 'Other Company'),
    }),
    /verified teamtailor listing page/i,
  )
})
