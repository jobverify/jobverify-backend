import assert from 'node:assert/strict'
import test from 'node:test'

const jobsArchiveHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs Archive - Inspiredge IT Solutions</title>
  </head>
  <body>
    <h1>Job Archives</h1>
    <article class="job-card">
      <h2>Telecom Analyst</h2>
      <p class="company">Inspiredge IT Solutions</p>
      <a href="https://inspiredgeit.com/jobs/telecom-analyst/">Apply Now</a>
      <p class="department">Technical Services</p>
      <p class="location">Remote</p>
      <p class="posted">Posted 2 years ago</p>
    </article>
    <article class="job-card">
      <h2>Python Developer</h2>
      <p class="company">Inpiredge IT Solutions</p>
      <a href="https://inspiredgeit.com/jobs/python-developer/">Apply Now</a>
      <p class="department">Technical Services</p>
      <p class="location">Remote</p>
      <p class="posted">Posted 2 years ago</p>
    </article>
    <article class="job-card">
      <h2>Cisco IPT - T2</h2>
      <p class="company">Inpiredge IT Solutions</p>
      <a href="https://inspiredgeit.com/jobs/cisco-ipt-t2/">Apply Now</a>
      <p class="department">Technical Services</p>
      <p class="location">Hyderabad</p>
      <p class="posted">Posted 2 years ago</p>
    </article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../inspiredgeitsolutions/script.js')
  } catch {
    assert.fail('Expected Inspiredge IT Solutions scraper module at ../inspiredgeitsolutions/script.js')
  }
}

test('Inspiredge IT Solutions helpers stay pinned to the verified first-party jobs archive from Saturday, July 18, 2026', async () => {
  const inspiredge = await loadModule()

  assert.equal(inspiredge.SOURCE, 'inspiredgeitsolutions')
  assert.equal(inspiredge.COMPANY, 'Inspiredge IT Solutions')
  assert.equal(inspiredge.CAREERS_URL, 'https://inspiredgeit.com/jobs/')
  assert.equal(inspiredge.VERIFIED_ON, '2026-07-18')
  assert.equal(inspiredge.hasOfficialJobsArchiveSignal(jobsArchiveHtml), true)
  assert.equal(inspiredge.hasOfficialJobsArchiveSignal('<html><body><h1>Jobs</h1></body></html>'), false)
  assert.deepEqual(inspiredge.extractJobs(jobsArchiveHtml), [
    {
      title: 'Telecom Analyst',
      company: 'Inspiredge IT Solutions',
      department: 'Technical Services',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'telecom-analyst',
      requisitionId: 'telecom-analyst',
      sourceUrl: 'https://inspiredgeit.com/jobs/telecom-analyst/',
      applyUrl: 'https://inspiredgeit.com/jobs/telecom-analyst/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Posted 2 years ago',
      remoteStatus: 'Remote',
    },
    {
      title: 'Python Developer',
      company: 'Inspiredge IT Solutions',
      department: 'Technical Services',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'python-developer',
      requisitionId: 'python-developer',
      sourceUrl: 'https://inspiredgeit.com/jobs/python-developer/',
      applyUrl: 'https://inspiredgeit.com/jobs/python-developer/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Posted 2 years ago',
      remoteStatus: 'Remote',
    },
    {
      title: 'Cisco IPT - T2',
      company: 'Inspiredge IT Solutions',
      department: 'Technical Services',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'cisco-ipt-t2',
      requisitionId: 'cisco-ipt-t2',
      sourceUrl: 'https://inspiredgeit.com/jobs/cisco-ipt-t2/',
      applyUrl: 'https://inspiredgeit.com/jobs/cisco-ipt-t2/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Posted 2 years ago',
      remoteStatus: 'On-site',
    },
  ])
})

test('Inspiredge IT Solutions run validates the verified jobs archive before decorating extracted jobs', async () => {
  const inspiredge = await loadModule()
  const requestedUrls = []

  const jobs = await inspiredge.createInspiredgeItSolutionsScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === inspiredge.CAREERS_URL) return jobsArchiveHtml
      throw new Error(`Unexpected Inspiredge URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [inspiredge.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'inspiredgeitsolutions')
  assert.equal(jobs[0].link, 'https://inspiredgeit.com/jobs/telecom-analyst/')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Inspiredge IT Solutions run fails closed when the verified jobs archive drifts', async () => {
  const inspiredge = await loadModule()

  await assert.rejects(
    inspiredge.createInspiredgeItSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified inspiredge it solutions jobs archive/i,
  )
})
