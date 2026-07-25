import assert from 'node:assert/strict'
import test from 'node:test'

const loadDaVinciModule = async () => import('../davincitrading/script.js')

const careersHtml = `
  <section class="career-listings">
    <a href="/job/experienced-quant-mumbai/">
      <span>Mumbai, Maharashtra, India</span>
      <h3>Experienced Quant</h3>
      <span>Apply</span>
    </a>
    <a href="/job/machine-learning-quant-amsterdam/">
      <span>Amsterdam, North Holland, Netherlands</span>
      <h3>Machine Learning Quant</h3>
      <span>Apply</span>
    </a>
  </section>
`

test('extractCareerJobs keeps official Da Vinci Mumbai roles and excludes non-India roles', async () => {
  const daVinci = await loadDaVinciModule()

  assert.deepEqual(daVinci.extractCareerJobs(careersHtml), [{
    title: 'Experienced Quant',
    company: 'Da Vinci Trading',
    department: null,
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    country: 'India',
    jobId: 'experienced-quant-mumbai',
    requisitionId: 'experienced-quant-mumbai',
    sourceUrl: 'https://davincitrading.com/job/experienced-quant-mumbai/',
    applyUrl: 'https://davincitrading.com/job/experienced-quant-mumbai/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Apply through the official Da Vinci Trading careers page.',
  }])
})

test('run fetches the official Da Vinci careers page', async () => {
  const daVinci = await loadDaVinciModule()
  const requestedUrls = []
  const jobs = await daVinci.createDaVinciTradingScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [daVinci.CAREERS_PAGE_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'davincitrading')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
