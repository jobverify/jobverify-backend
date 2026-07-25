import assert from 'node:assert/strict'
import test from 'node:test'

const loadDeShawModule = async () => {
  try {
    return await import('../deshawindia/script.js')
  } catch {
    return null
  }
}

const careersHtml = `
  <div class="job" data-job-id="6147">
    <div class="information">
      <p class="category">Core Tech</p>
      <span class="location">HYD/BLR</span>
    </div>
    <div class="description-wrapper">
      <a class="parent-arrow-long" href="/careers/lead-tech-djs-web-infrastructure-6147">
        <p><span class="job-display-name">Lead, Tech (DJS Web Infrastructure)</span></p>
      </a>
    </div>
  </div>
  <div class="job" data-job-id="2781">
    <div class="information">
      <p class="category">Financial Operations</p>
      <span class="location">HYD/BLR/GGM</span>
    </div>
    <div class="description-wrapper">
      <a class="parent-arrow-long" href="/careers/all-positions-in-financial-operations-2781">
        <p><span class="job-display-name">All positions in Financial Operations</span></p>
      </a>
    </div>
  </div>
`

test('extractCareerListings maps D. E. Shaw India official career cards to India job records', async () => {
  const deShaw = await loadDeShawModule()
  assert.ok(deShaw)

  const jobs = deShaw.extractCareerListings(careersHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Lead, Tech (DJS Web Infrastructure)',
    company: 'D. E. Shaw India',
    department: 'Core Tech',
    location: 'Hyderabad, Bengaluru, India',
    city: null,
    country: 'India',
    jobId: '6147',
    requisitionId: '6147',
    sourceUrl: 'https://www.deshawindia.com/careers/lead-tech-djs-web-infrastructure-6147',
    applyUrl: 'https://www.deshawindia.com/careers/lead-tech-djs-web-infrastructure-6147',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].location, 'Hyderabad, Bengaluru, Gurugram, India')
  assert.equal(jobs[1].department, 'Financial Operations')
})

test('run fetches the D. E. Shaw India careers page and decorates official listings for the runner', async () => {
  const deShaw = await loadDeShawModule()
  assert.ok(deShaw)

  const requestedUrls = []
  const jobs = await deShaw.createDeShawScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://www.deshawindia.com/careers'])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'deshawindia')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].company, 'D. E. Shaw India')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
