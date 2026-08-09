import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-04T00:00:00.000Z'

const homepageHtml = `
<!doctype html>
<html>
  <body>
    <h1>Mobitech Wireless Solution Private Limited</h1>
    <p>Irrigation automation</p>
    <p>Smart Irrigation system</p>
    <a href="https://careers.mobitechwireless.in/">Careers</a>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html>
  <body>
    <h1>Join Our Team</h1>
    <p>Build Technology</p>
    <button>Load more</button>
    <a href="https://careers.mobitechwireless.in/jobs/firmware-support-engineer/">
      Firmware Support Engineer Permanent Full Time Perundurai R &amp; D Division More Details
    </a>
    <a href="https://careers.mobitechwireless.in/jobs/internship-assembly-testing/">
      Internship - Assembly &amp; Testing Full Time Vijayamangalam Production Division More Details
    </a>
  </body>
</html>
`

const firmwareSupportEngineerDetailHtml = `
<!doctype html>
<html>
  <body>
    <h1>Firmware Support Engineer</h1>
    <p>We are looking for enthusiastic Firmware Support Engineers with an Electronics background to join our team.</p>
    <p>Key Responsibilities</p>
    <ul>
      <li>Provide technical support for embedded firmware and IoT products.</li>
      <li>Diagnose and troubleshoot firmware-related issues reported by customers and field engineers.</li>
    </ul>
    <p>Required Skills</p>
    <ul>
      <li>Basic knowledge of Embedded Systems and Microcontrollers.</li>
      <li>Understanding of Embedded C fundamentals.</li>
    </ul>
    <p>Educational Qualification</p>
    <p>BE/B.Tech in Electronics &amp; Communication Engineering (ECE).</p>
    <p>Apply for this position</p>
    <label>Total Experience</label>
  </body>
</html>
`

const internshipDetailHtml = `
<!doctype html>
<html>
  <body>
    <h1>Internship - Assembly &amp; Testing</h1>
    <p>Join our assembly and testing internship program for embedded hardware products.</p>
    <p>Freshers and recent graduates are welcome to apply.</p>
    <p>Apply for this position</p>
    <label>Total Experience</label>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/mobitechwireless/script.js')
  } catch {
    assert.fail('Expected Mobitech Wireless scraper module at ../../scraper/mobitechwireless/script.js')
  }
}

test('Mobitech extracts public job cards from the verified careers page', async () => {
  const mobitech = await loadModule()

  assert.equal(mobitech.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(mobitech.hasOfficialCareersSignal(careersHtml), true)

  const jobs = mobitech.extractPublicJobs(careersHtml)
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Firmware Support Engineer',
    company: 'Mobitech Wireless Solution Private Limited',
    department: 'R & D Division',
    location: 'Perundurai, India',
    city: 'Perundurai',
    state: 'Tamil Nadu',
    country: 'India',
    jobId: 'firmware-support-engineer',
    requisitionId: 'firmware-support-engineer',
    sourceUrl: 'https://careers.mobitechwireless.in/jobs/firmware-support-engineer/',
    applyUrl: 'https://careers.mobitechwireless.in/jobs/firmware-support-engineer/',
    employmentType: 'Permanent',
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
})

test('Mobitech detail enrichment captures public descriptions without leaking the apply form', async () => {
  const mobitech = await loadModule()
  const job = mobitech.extractPublicJobs(careersHtml)[0]
  const enriched = mobitech.enrichJobFromDetailPage(job, firmwareSupportEngineerDetailHtml)

  assert.equal(enriched.publicExperienceChecked, true)
  assert.equal(enriched.experienceRequired, null)
  assert.match(enriched.jobDescription, /Firmware Support Engineer/)
  assert.match(enriched.jobDescription, /Provide technical support for embedded firmware and IoT products/)
  assert.doesNotMatch(enriched.jobDescription, /Total Experience/)
})

test('Mobitech run enriches public jobs from first-party detail pages', async () => {
  const mobitech = await loadModule()
  const requestedUrls = []

  const jobs = await mobitech.createMobitechWirelessScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === mobitech.HOMEPAGE_URL) return homepageHtml
      if (url === mobitech.CAREERS_URL) return careersHtml
      if (url === 'https://careers.mobitechwireless.in/jobs/firmware-support-engineer/') {
        return firmwareSupportEngineerDetailHtml
      }
      if (url === 'https://careers.mobitechwireless.in/jobs/internship-assembly-testing/') {
        return internshipDetailHtml
      }
      throw new Error(`Unexpected Mobitech URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    mobitech.HOMEPAGE_URL,
    mobitech.CAREERS_URL,
    'https://careers.mobitechwireless.in/jobs/firmware-support-engineer/',
    'https://careers.mobitechwireless.in/jobs/internship-assembly-testing/',
  ])
  assert.equal(jobs.length, 2)
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[0].source, 'mobitechwireless')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[1].experienceRequired, 'No experience required')
})
