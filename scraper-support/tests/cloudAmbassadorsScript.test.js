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
    remoteStatus: null,
  })
  assert.equal(jobs[4].title, 'DevOps / MLOps Engineer')
  assert.equal(jobs[4].jobId, 'devops-mlops-engineer')
})

test('run fetches the official careers page and decorates the published roles for the runner', async () => {
  const cloudAmbassadors = await loadCloudAmbassadorsModule()
  assert.ok(cloudAmbassadors)

  const requestedUrls = []
  const jobs = await cloudAmbassadors.createCloudAmbassadorsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://cloudambassadors.com/careers'])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'cloudambassadors')
  assert.equal(jobs[0].link, 'https://cloudambassadors.com/careers/apply')
  assert.equal(jobs[0].company, 'Cloud Ambassadors')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
