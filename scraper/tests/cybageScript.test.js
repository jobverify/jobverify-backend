import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Open Positions (Careers): Cybage</title>
    <link rel="canonical" href="https://www.cybage.com/careers/open-positions" />
  </head>
  <body>
    <h1>Open Positions</h1>
    <p>Current Openings</p>
    <table class="jobs-table">
      <tbody>
        <tr>
          <td><a href="/careers/open-positions/current-openings/senior-net-developer">Senior .NET Developer</a></td>
          <td>Pune, India</td>
          <td>4-8 years</td>
        </tr>
        <tr>
          <td><a href="/careers/open-positions/current-openings/lead-qa-automation-engineer">Lead QA Automation Engineer</a></td>
          <td>Hyderabad, India</td>
          <td>6-10 years</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const detailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior .NET Developer | Cybage</title>
  </head>
  <body>
    <h1>Senior .NET Developer</h1>
    <div class="job-meta">
      <span>Location: Pune, India</span>
      <span>Experience: 4-8 years</span>
    </div>
    <div class="job-description">
      <p>Build and maintain enterprise .NET applications for global clients.</p>
      <p>Collaborate with QA and product teams on delivery quality.</p>
    </div>
    <a class="apply-now" href="https://careers.cybage.com/PublicPages/UserLogin.aspx">Apply Now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../cybage/script.js')
  } catch {
    assert.fail('Expected Cybage scraper module at ../cybage/script.js')
  }
}

test('Cybage validates the verified first-party open positions page', async () => {
  const cybage = await loadModule()

  assert.equal(cybage.SOURCE, 'cybage')
  assert.equal(cybage.COMPANY, 'Cybage')
  assert.equal(cybage.CAREERS_URL, 'https://www.cybage.com/careers/open-positions')
  assert.equal(cybage.APPLY_LOGIN_URL, 'https://careers.cybage.com/PublicPages/UserLogin.aspx')
  assert.equal(cybage.hasOfficialCareersSignal(careersHtml), true)
})

test('Cybage extracts the verified first-party jobs table into listing records', async () => {
  const cybage = await loadModule()
  const listings = cybage.extractListings(careersHtml)

  assert.equal(listings.length, 2)
  assert.deepEqual(listings[0], {
    title: 'Senior .NET Developer',
    company: 'Cybage',
    department: null,
    location: 'Pune, India',
    city: 'Pune',
    country: 'India',
    jobId: 'senior-net-developer',
    requisitionId: 'senior-net-developer',
    sourceUrl: 'https://www.cybage.com/careers/open-positions/current-openings/senior-net-developer',
    applyUrl: 'https://www.cybage.com/careers/open-positions/current-openings/senior-net-developer',
    employmentType: null,
    experienceRequired: '4-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
})

test('Cybage detail parsing keeps the ASP.NET login handoff as the apply URL', async () => {
  const cybage = await loadModule()
  const detail = cybage.extractJobDetail(detailHtml, {
    title: 'Senior .NET Developer',
    company: 'Cybage',
    department: null,
    location: 'Pune, India',
    city: 'Pune',
    country: 'India',
    jobId: 'senior-net-developer',
    requisitionId: 'senior-net-developer',
    sourceUrl: 'https://www.cybage.com/careers/open-positions/current-openings/senior-net-developer',
    applyUrl: 'https://www.cybage.com/careers/open-positions/current-openings/senior-net-developer',
    employmentType: null,
    experienceRequired: '4-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })

  assert.deepEqual(detail, {
    title: 'Senior .NET Developer',
    company: 'Cybage',
    department: null,
    location: 'Pune, India',
    city: 'Pune',
    country: 'India',
    jobId: 'senior-net-developer',
    requisitionId: 'senior-net-developer',
    sourceUrl: 'https://www.cybage.com/careers/open-positions/current-openings/senior-net-developer',
    applyUrl: 'https://careers.cybage.com/PublicPages/UserLogin.aspx',
    employmentType: null,
    experienceRequired: '4-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Build and maintain enterprise .NET applications for global clients. Collaborate with QA and product teams on delivery quality.',
  })
})

test('Cybage run validates the verified first-party flow and decorates jobs', async () => {
  const cybage = await loadModule()
  const requestedUrls = []

  const jobs = await cybage.createCybageScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === cybage.CAREERS_URL) return careersHtml
      if (url === 'https://www.cybage.com/careers/open-positions/current-openings/senior-net-developer') {
        return detailHtml
      }

      throw new Error(`Unexpected Cybage fixture URL: ${url}`)
    },
    now: () => '2026-07-14T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    cybage.CAREERS_URL,
    'https://www.cybage.com/careers/open-positions/current-openings/senior-net-developer',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'cybage')
  assert.equal(jobs[0].company, 'Cybage')
  assert.equal(jobs[0].jobId, 'senior-net-developer')
  assert.equal(jobs[0].link, 'https://careers.cybage.com/PublicPages/UserLogin.aspx')
  assert.equal(jobs[0].scrapedAt, '2026-07-14T00:00:00.000Z')
})

test('Cybage fails closed when the verified jobs table or detail contract drifts', async () => {
  const cybage = await loadModule()

  await assert.rejects(
    cybage.createCybageScraper().run({
      fetchText: async () => '<html><body><h1>Open Positions</h1></body></html>',
    }),
    /verified official open positions surface/i,
  )

  await assert.rejects(
    cybage.createCybageScraper({ maxJobs: 1 }).run({
      fetchText: async (url) => {
        if (url === cybage.CAREERS_URL) return careersHtml
        return '<html><body><h1>Broken</h1></body></html>'
      },
    }),
    /verified first-party detail page/i,
  )
})
