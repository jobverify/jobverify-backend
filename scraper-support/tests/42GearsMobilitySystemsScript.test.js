import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - 42Gears Mobility Systems</title>
  </head>
  <body>
    <h1>Let's do something interesting - together.</h1>
    <h2>Current Openings</h2>
    <article class="job-card">
      <a href="https://www.42gears.com/careers/intern-admin-and-facilities/">
        <h3>Intern – Admin and facilities</h3>
      </a>
      <p>Internship</p>
      <p>Bengaluru, India</p>
      <p>Relevant Experience: Fresher Responsibilities: Qualifications:</p>
    </article>
    <article class="job-card">
      <a href="https://www.42gears.com/careers/lead-software-engineer/">
        <h3>Lead Software Engineer</h3>
      </a>
      <p>Full Time</p>
      <p>Bengaluru, India</p>
      <p>Relevant Experience: 5+ years Core Responsibilities Technical Requirements Security: Design:</p>
    </article>
    <article class="job-card">
      <a href="https://www.42gears.com/careers/channel-sales-manager-chicago-area/">
        <h3>Channel Sales Manager – Chicago area</h3>
      </a>
      <p>Full Time</p>
      <p>USA</p>
      <p>Location: Remote, based in Chicago</p>
    </article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/42gears/script.js')
  } catch {
    assert.fail('Expected 42Gears Mobility Systems scraper module at ../../scraper/42gears/script.js')
  }
}

test('42Gears Mobility Systems helpers stay pinned to the verified India-filtered first-party careers listing', async () => {
  const fortyTwoGears = await loadModule()

  assert.equal(fortyTwoGears.SOURCE, '42gears')
  assert.equal(fortyTwoGears.COMPANY, '42Gears Mobility Systems')
  assert.equal(
    fortyTwoGears.CAREERS_URL,
    'https://www.42gears.com/careers/?selected_jobtype=-1&selected_location=india',
  )
  assert.equal(fortyTwoGears.VERIFIED_ON, '2026-07-17')
  assert.equal(fortyTwoGears.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(fortyTwoGears.hasOfficialCareersSignal('<html><body><h1>Current Openings</h1></body></html>'), false)
  assert.deepEqual(fortyTwoGears.extractJobs(careersHtml), [
    {
      title: 'Intern – Admin and facilities',
      company: '42Gears Mobility Systems',
      department: null,
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'intern-admin-and-facilities',
      requisitionId: 'intern-admin-and-facilities',
      sourceUrl: 'https://www.42gears.com/careers/intern-admin-and-facilities/',
      applyUrl: 'https://www.42gears.com/careers/intern-admin-and-facilities/',
      employmentType: 'Internship',
      experienceRequired: 'Fresher',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Relevant Experience: Fresher Responsibilities: Qualifications:',
      remoteStatus: 'On-site',
    },
    {
      title: 'Lead Software Engineer',
      company: '42Gears Mobility Systems',
      department: null,
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'lead-software-engineer',
      requisitionId: 'lead-software-engineer',
      sourceUrl: 'https://www.42gears.com/careers/lead-software-engineer/',
      applyUrl: 'https://www.42gears.com/careers/lead-software-engineer/',
      employmentType: 'Full Time',
      experienceRequired: '5+ years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        'Relevant Experience: 5+ years Core Responsibilities Technical Requirements Security: Design:',
      remoteStatus: 'On-site',
    },
  ])
})

test('42Gears Mobility Systems run validates the verified careers page before decorating extracted jobs', async () => {
  const fortyTwoGears = await loadModule()
  const requestedUrls = []

  const jobs = await fortyTwoGears.create42GearsScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === fortyTwoGears.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected 42Gears URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [fortyTwoGears.CAREERS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, '42gears')
  assert.equal(jobs[0].link, 'https://www.42gears.com/careers/intern-admin-and-facilities/')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('42Gears Mobility Systems run fails closed when the verified careers surface drifts', async () => {
  const fortyTwoGears = await loadModule()

  await assert.rejects(
    fortyTwoGears.create42GearsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified 42gears mobility systems careers surface/i,
  )
})
