import assert from 'node:assert/strict'
import test from 'node:test'

const loadCodemonkModule = async () => {
  try {
    return await import('../../scraper/codemonk/script.js')
  } catch {
    return null
  }
}

const careersHtml = `
  <a class="flex flex-wrap justify-between items-center" target="_blank" href="/careers/qa-intern-E3A2655F70">
    <div>
      <div class="font-semibold">QA Intern</div>
      <div class="mt-2 text-gray-600">Bengaluru, Karnataka, India | Experience entry-level</div>
    </div>
    <button class="button-secondary">Apply</button>
  </a>
  <a class="flex flex-wrap justify-between items-center" target="_blank" href="/careers/backend-intern-(django)-4039481B76">
    <div>
      <div class="font-semibold">Backend Intern (Django)</div>
      <div class="mt-2 text-gray-600">Bangalore Urban, Karnataka, India | Experience entry-level</div>
    </div>
    <button class="button-secondary">Apply</button>
  </a>
  <a class="flex flex-wrap justify-between items-center" target="_blank" href="/careers/sales-intern-83F72CA009">
    <div>
      <div class="font-semibold">Sales Intern</div>
      <div class="mt-2 text-gray-600">Bengaluru, Karnataka, India | Experience entry-level</div>
    </div>
    <button class="button-secondary">Apply</button>
  </a>
  <a class="flex flex-wrap justify-between items-center" target="_blank" href="/careers/business-development-executive--it-staffing-D24FF6E4F2">
    <div>
      <div class="font-semibold">Business Development Executive -IT Staffing</div>
      <div class="mt-2 text-gray-600">Bengaluru, Karnataka, India | Experience mid-senior-level</div>
    </div>
    <button class="button-secondary">Apply</button>
  </a>
`

test('extractCareerListings maps official Codemonk career cards to India job listings', async () => {
  const codemonk = await loadCodemonkModule()
  assert.ok(codemonk)

  const jobs = codemonk.extractCareerListings(careersHtml)

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'QA Intern',
    company: 'Codemonk',
    department: null,
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    jobId: 'qa-intern-E3A2655F70',
    requisitionId: 'qa-intern-E3A2655F70',
    sourceUrl: 'https://codemonk.io/careers/qa-intern-E3A2655F70',
    applyUrl: 'https://codemonk.io/careers/qa-intern-E3A2655F70',
    employmentType: null,
    experienceRequired: 'entry-level',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].city, 'Bangalore Urban')
  assert.equal(jobs[3].experienceRequired, 'mid-senior-level')
})

test('run fetches the official Codemonk careers page and decorates its listings for the runner', async () => {
  const codemonk = await loadCodemonkModule()
  assert.ok(codemonk)

  const requestedUrls = []
  const jobs = await codemonk.createCodemonkScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://codemonk.io/careers'])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].source, 'codemonk')
  assert.equal(jobs[0].link, 'https://codemonk.io/careers/qa-intern-E3A2655F70')
  assert.equal(jobs[0].company, 'Codemonk')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
