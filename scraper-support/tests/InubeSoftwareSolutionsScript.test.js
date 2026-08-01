import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - iNube</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>View all 0penings</p>
      <article class="job-item">
        <a href="https://inubesolutions.com/jobs/technical-lead-pps/">Technical Lead PPS</a>
        <span>PPS</span>
        <span>Full Time</span>
        <span>Mumbai</span>
      </article>
      <article class="job-item">
        <a href="https://inubesolutions.com/jobs/project-management-dot-net-insurance/">Project Manager/Associate Project Manager</a>
        <span>PPS</span>
        <span>Full Time</span>
        <span>Bangalore</span>
      </article>
    </main>
  </body>
</html>
`

const technicalLeadHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Technical Lead PPS</h1>
      <h2>Main Responsibilities:</h2>
      <ul>
        <li>Lead implementation and support activities for PPS applications</li>
        <li>Coordinate with business and technical teams to deliver releases</li>
      </ul>
      <h2>Qualifications & Work Experience:</h2>
      <p>BE/Btech/MCA</p>
      <p>8-12 years of Experience</p>
      <p>Location: Mumbai</p>
      <p>Work from Office</p>
    </main>
  </body>
</html>
`

const pmHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Project Manager/Associate Project Manager</h1>
      <h2>Key Responsibilities:</h2>
      <ul>
        <li>Manage multiple software development, maintenance and support projects</li>
        <li>Prepare project charter, project plan and reports during project lifecycle</li>
      </ul>
      <h2>Skills:</h2>
      <ul>
        <li>Project Management</li>
        <li>Microsoft Technologies (C#, ASP.NET) is a plus</li>
      </ul>
      <p>Location: Bangalore</p>
      <p>Work from Office</p>
      <p>5-15 years experience</p>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/inubesoftwaresolutions/script.js')
  } catch {
    assert.fail('Expected Inube Software Solutions scraper module at ../../scraper/inubesoftwaresolutions/script.js')
  }
}

test('Inube Software Solutions helpers stay pinned to the verified jobs archive and detail pages', async () => {
  const inube = await loadModule()

  assert.equal(inube.SOURCE, 'inubesoftwaresolutions')
  assert.equal(inube.COMPANY, 'Inube Software Solutions')
  assert.equal(inube.CAREERS_URL, 'https://inubesolutions.com/careers-inube/')
  assert.equal(inube.VERIFIED_ON, '2026-07-18')
  assert.equal(inube.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(inube.hasOfficialCareersSignal('<html><body><h1>Jobs</h1></body></html>'), false)
  assert.deepEqual(inube.extractRoleSummaries(careersHtml), [
    {
      title: 'Technical Lead PPS',
      detailUrl: 'https://inubesolutions.com/jobs/technical-lead-pps/',
      department: 'PPS',
      employmentType: 'Full Time',
      location: 'Mumbai',
    },
    {
      title: 'Project Manager/Associate Project Manager',
      detailUrl: 'https://inubesolutions.com/jobs/project-management-dot-net-insurance/',
      department: 'PPS',
      employmentType: 'Full Time',
      location: 'Bangalore',
    },
  ])

  const technicalLead = inube.extractRoleDetail(technicalLeadHtml, inube.extractRoleSummaries(careersHtml)[0])
  assert.equal(technicalLead.location, 'Mumbai, India')
  assert.equal(technicalLead.remoteStatus, 'On-site')
  assert.equal(technicalLead.experienceRequired, '8-12 years')
})

test('Inube Software Solutions run validates the verified archive before hydrating detail pages', async () => {
  const inube = await loadModule()
  const requestedUrls = []

  const jobs = await inube.createInubeSoftwareSolutionsScraper().run({
    now: () => FIXED_SCRAPED_AT,
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === inube.CAREERS_URL) return careersHtml
      if (url === 'https://inubesolutions.com/jobs/technical-lead-pps/') return technicalLeadHtml
      if (url === 'https://inubesolutions.com/jobs/project-management-dot-net-insurance/') return pmHtml
      throw new Error(`Unexpected iNube URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    inube.CAREERS_URL,
    'https://inubesolutions.com/jobs/technical-lead-pps/',
    'https://inubesolutions.com/jobs/project-management-dot-net-insurance/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'inubesoftwaresolutions')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[1].title, 'Project Manager/Associate Project Manager')
})

test('Inube Software Solutions run fails closed when the verified jobs archive drifts', async () => {
  const inube = await loadModule()

  await assert.rejects(
    inube.createInubeSoftwareSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified inube software solutions careers surface/i,
  )
})
