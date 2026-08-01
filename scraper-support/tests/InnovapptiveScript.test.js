import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Innovapptive</title>
  </head>
  <body>
    <h1>Build the future of connected frontline operations</h1>
    <p>Join our team of builders and problem solvers.</p>
    <a href="https://innovapptive.applytojob.com/apply">View Open Positions</a>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Innovapptive - Career Page</title>
  </head>
  <body>
    <a href="https://www.innovapptive.com">View Our Website</a>
    <h2>Current Openings</h2>
    <ul>
      <li class="list-group-item">
        <h3><a href="/apply/s1UhWrT4FC/Associate-Solution-Consultant-EAM">Associate Solution Consultant - EAM</a></h3>
        <div>Hyderabad, Telangana, India</div>
        <div>Services</div>
      </li>
      <li class="list-group-item">
        <h3><a href="/apply/IOS123/Senior-Engineer-IOS">Senior Engineer - iOS</a></h3>
        <div>Remote</div>
        <div>Engineering</div>
      </li>
      <li class="list-group-item">
        <h3><a href="/apply/USONLY/Program-Manager">Program Manager</a></h3>
        <div>Houston, Texas, United States</div>
        <div>PMO</div>
      </li>
    </ul>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/innovapptive/script.js')
  } catch {
    assert.fail('Expected Innovapptive scraper module at ../../scraper/innovapptive/script.js')
  }
}

test('Innovapptive helpers stay pinned to the verified careers handoff and ApplyToJob board from Friday, July 17, 2026', async () => {
  const innovapptive = await loadModule()

  assert.equal(innovapptive.SOURCE, 'innovapptive')
  assert.equal(innovapptive.COMPANY, 'Innovapptive')
  assert.equal(innovapptive.CAREERS_URL, 'https://www.innovapptive.com/company/careers')
  assert.equal(innovapptive.BOARD_URL, 'https://innovapptive.applytojob.com/apply')
  assert.equal(innovapptive.VERIFIED_ON, '2026-07-17')
  assert.equal(innovapptive.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(innovapptive.hasOfficialCareersSignal('<main>Careers</main>'), false)
  assert.equal(innovapptive.hasVerifiedBoardSignal(boardHtml), true)
  assert.equal(innovapptive.hasVerifiedBoardSignal('<main>No board</main>'), false)
  assert.deepEqual(innovapptive.extractBoardJobs(boardHtml), [
    {
      title: 'Associate Solution Consultant - EAM',
      company: 'Innovapptive',
      department: 'Services',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 's1UhWrT4FC',
      requisitionId: 's1UhWrT4FC',
      sourceUrl: 'https://innovapptive.applytojob.com/apply/s1UhWrT4FC/Associate-Solution-Consultant-EAM',
      applyUrl: 'https://innovapptive.applytojob.com/apply/s1UhWrT4FC/Associate-Solution-Consultant-EAM',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Senior Engineer - iOS',
      company: 'Innovapptive',
      department: 'Engineering',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'IOS123',
      requisitionId: 'IOS123',
      sourceUrl: 'https://innovapptive.applytojob.com/apply/IOS123/Senior-Engineer-IOS',
      applyUrl: 'https://innovapptive.applytojob.com/apply/IOS123/Senior-Engineer-IOS',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Remote',
    },
  ])
})

test('Innovapptive run validates both verified surfaces before decorating extracted jobs', async () => {
  const innovapptive = await loadModule()
  const requestedUrls = []

  const jobs = await innovapptive.createInnovapptiveScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === innovapptive.CAREERS_URL) return officialCareersHtml
      if (url === innovapptive.BOARD_URL) return boardHtml
      throw new Error(`Unexpected Innovapptive URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [innovapptive.CAREERS_URL, innovapptive.BOARD_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'innovapptive')
  assert.equal(
    jobs[0].link,
    'https://innovapptive.applytojob.com/apply/s1UhWrT4FC/Associate-Solution-Consultant-EAM',
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Innovapptive run fails closed when the verified official page or board drifts', async () => {
  const innovapptive = await loadModule()

  await assert.rejects(
    innovapptive.createInnovapptiveScraper().run({
      fetchText: async (url) => (url === innovapptive.CAREERS_URL ? '<html><body>Careers</body></html>' : boardHtml),
    }),
    /official Innovapptive careers page/i,
  )

  await assert.rejects(
    innovapptive.createInnovapptiveScraper().run({
      fetchText: async (url) => (url === innovapptive.CAREERS_URL ? officialCareersHtml : '<html><body>Jobs</body></html>'),
    }),
    /verified Innovapptive ApplyToJob board/i,
  )
})
