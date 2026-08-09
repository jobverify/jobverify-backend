import assert from 'node:assert/strict'
import test from 'node:test'

const loadCloudAmbassadorsModule = async () => {
  try {
    return await import('../../scraper/cloudambassadors/script.js')
  } catch {
    return null
  }
}

const careersHtml = `
  <html>
    <head>
      <title>Careers | Cloud Ambassadors</title>
    </head>
    <body>
  <header>
    <button class="cursor-pointer">Menu</button>
  </header>
  <section>
    <p>Open Roles</p>
    <div>
      <button class="glass cursor-pointer">Cloud Consultant</button>
      <button class="glass cursor-pointer">Cloud Engineer</button>
      <button class="glass cursor-pointer">Data Engineer</button>
      <button class="glass cursor-pointer">AI / ML / GenAI Engineer</button>
      <button class="glass cursor-pointer">DevOps / MLOps Engineer</button>
    </div>
  </section>
  </body>
  </html>
`

const applyPageHtml = `
  <html>
    <head>
      <title>Cloud Ambassadors — Maximizing Cloud Impact</title>
    </head>
    <body>
      <main>
        <div>
          <span>1</span><span>Personal Details</span>
          <span>2</span><span>Role &amp; Experience</span>
          <span>3</span><span>Documents</span>
          <span>4</span><span>Review</span>
        </div>
        <label>Location</label>
        <label>Email</label>
      </main>
    </body>
  </html>
`

test('extractCareerListings maps the official published roles to application-ready jobs', async () => {
  const cloudAmbassadors = await loadCloudAmbassadorsModule()
  assert.ok(cloudAmbassadors)

  const jobs = cloudAmbassadors.extractCareerListings(careersHtml)

  assert.equal(jobs.length, 5)
  assert.deepEqual(jobs[0], {
    title: 'Cloud Consultant',
    company: 'Cloud Ambassadors',
    department: null,
    location: null,
    city: null,
    state: null,
    country: 'India',
    jobId: 'cloud-consultant',
    requisitionId: 'cloud-consultant',
    sourceUrl: 'https://cloudambassadors.com/careers',
    applyUrl: 'https://cloudambassadors.com/careers/apply',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    publicExperienceChecked: true,
    remoteStatus: null,
  })
  assert.equal(jobs[4].title, 'DevOps / MLOps Engineer')
  assert.equal(jobs[4].jobId, 'devops-mlops-engineer')
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
})

test('run fetches the official careers and shared apply pages and decorates verified-missing roles for the runner', async () => {
  const cloudAmbassadors = await loadCloudAmbassadorsModule()
  assert.ok(cloudAmbassadors)

  const requestedUrls = []
  const jobs = await cloudAmbassadors.createCloudAmbassadorsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === 'https://cloudambassadors.com/careers') return careersHtml
      if (url === 'https://cloudambassadors.com/careers/apply') return applyPageHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://cloudambassadors.com/careers',
    'https://cloudambassadors.com/careers/apply',
  ])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'cloudambassadors')
  assert.equal(jobs[0].link, 'https://cloudambassadors.com/careers/apply')
  assert.equal(jobs[0].company, 'Cloud Ambassadors')
  assert.equal(jobs[0].experienceRequired, null)
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('runStandalone writes the verified-missing jobs to jobs.json during dry-run execution', async () => {
  const cloudAmbassadors = await loadCloudAmbassadorsModule()
  assert.ok(cloudAmbassadors)

  const savedFiles = []
  const savedDatabases = []

  await cloudAmbassadors.runStandalone({
    argv: ['node', 'cloudambassadors/script.js', '--dry-run'],
    fetchText: async (url) => {
      if (url === 'https://cloudambassadors.com/careers') return careersHtml
      if (url === 'https://cloudambassadors.com/careers/apply') return applyPageHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    saveToFile: (jobs, filePath) => {
      savedFiles.push({ jobs, filePath })
    },
    saveToDB: async (jobs, source) => {
      savedDatabases.push({ jobs, source })
    },
  })

  assert.equal(savedFiles.length, 1)
  assert.equal(savedDatabases.length, 0)
  assert.match(savedFiles[0].filePath, /cloudambassadors[\\/]jobs\.json$/)
  assert.equal(savedFiles[0].jobs.length, 5)
  assert.ok(savedFiles[0].jobs.every((job) => job.publicExperienceChecked === true))
})
