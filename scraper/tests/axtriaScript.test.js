import assert from 'node:assert/strict'
import test from 'node:test'

const loadAxtriaModule = async () => {
  try {
    return await import('../axtria/script.js')
  } catch {
    return null
  }
}

const buildCareersHtml = () => `
<!doctype html>
<html>
  <body>
    <div class="career-bottom-tabs-manual-block">
      <div class="career-bottom-tabs-manual-left">
        <p class="text-2xl">
          Manager- Patient Analytics
        </p>
        <p class="text-lg">
          Any Axtria location
        </p>
      </div>
      <div class="career-bottom-tabs-manual-right">
        <a class="in-btn in-btn--filled-dark career-job-link" data-india-job="true" href="https://career10.successfactors.com/sfcareer/jobreqcareerpvt?jobId=10624&amp;company=axtriaindiP&amp;st=DBD1FE2675EA51E52E390581B47D0C5D505A758F" target="_blank" rel="nofollow noopener">
          View Job
        </a>
      </div>
    </div>
    <div class="career-bottom-tabs-manual-block">
      <div class="career-bottom-tabs-manual-left">
        <p class="text-2xl">
          Senior Associate- Forecasting
        </p>
        <p class="text-lg">
          Gurugram
        </p>
      </div>
      <div class="career-bottom-tabs-manual-right">
        <a class="in-btn in-btn--filled-dark career-job-link" data-india-job="true" href="https://career10.successfactors.com/sfcareer/jobreqcareerpvt?jobId=10570&amp;company=axtriaindiP&amp;st=A113E47AD8BAE583B28AC7CECADB67B756C08FEA" target="_blank" rel="nofollow noopener">
          View Job
        </a>
      </div>
    </div>
  </body>
</html>
`

test('extractSearchResults maps the Axtria static India job cards into shared scraper fields', async () => {
  const axtria = await loadAxtriaModule()
  assert.ok(axtria)

  const jobs = axtria.extractSearchResults(buildCareersHtml())

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Manager- Patient Analytics',
    company: 'Axtria',
    department: null,
    location: 'India',
    city: null,
    country: 'India',
    jobId: '10624',
    requisitionId: '10624',
    sourceUrl: 'https://career10.successfactors.com/sfcareer/jobreqcareerpvt?jobId=10624&company=axtriaindiP&st=DBD1FE2675EA51E52E390581B47D0C5D505A758F',
    applyUrl: 'https://career10.successfactors.com/sfcareer/jobreqcareerpvt?jobId=10624&company=axtriaindiP&st=DBD1FE2675EA51E52E390581B47D0C5D505A758F',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Axtria India opening for Manager- Patient Analytics in India.',
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].jobId, '10570')
  assert.equal(jobs[1].location, 'Gurugram, India')
  assert.equal(jobs[1].city, 'Gurugram')
})

test('run fetches the Axtria careers page and decorates jobs', async () => {
  const axtria = await loadAxtriaModule()
  assert.ok(axtria)

  const requestedUrls = []
  const scraper = axtria.createAxtriaScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === axtria.CAREER_PAGE_URL) return buildCareersHtml()
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(axtria.buildSearchUrl(), axtria.CAREER_PAGE_URL)
  assert.deepEqual(requestedUrls, [axtria.CAREER_PAGE_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'axtria')
  assert.equal(jobs[0].link, 'https://career10.successfactors.com/sfcareer/jobreqcareerpvt?jobId=10624&company=axtriaindiP&st=DBD1FE2675EA51E52E390581B47D0C5D505A758F')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
