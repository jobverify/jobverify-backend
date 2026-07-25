import assert from 'node:assert/strict'
import test from 'node:test'

const searchPageOneHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Search results for "".</h1>
    <p>Results 1 – 5 of 6 Page 1 of 2</p>
    <a href="https://careers.aurigo.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=5">2</a>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Manager-Legal/1/">Manager - Legal</a>
      <span>IN</span>
      <span>Nov 25, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Software-Engineer-II/2/">Software Engineer II</a>
      <span>IN</span>
      <span>Nov 13, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Information-Developer-II/3/">Information Developer II</a>
      <span>IN</span>
      <span>Nov 11, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Sales-Engineer/4/">Sales Engineer</a>
      <span>US</span>
      <span>Nov 7, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Information-Developer-II-2/5/">Information Developer - II</a>
      <span>IN</span>
      <span>Nov 6, 2025</span>
    </div>
  </body>
</html>
`

const searchPageTwoHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Search results for "".</h1>
    <p>Results 6 – 10 of 23 Page 2 of 5</p>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Senior-Manager-Product-Operations/6/">Senior Manager - Product Operations</a>
      <span>IN</span>
      <span>Jul 19, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Senior-Specialist-Content-and-Design/7/">Senior Specialist - Content and Design</a>
      <span>IN</span>
      <span>Jul 17, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Senior-Software-Engineer-I-DevOps/8/">Senior Software Engineer I - DevOps</a>
      <span>IN</span>
      <span>Jul 16, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Administrator-I-Enterprise-IT/9/">Administrator I - Enterprise IT</a>
      <span>IN</span>
      <span>Jul 16, 2025</span>
    </div>
    <div class="job">
      <a href="https://careers.aurigo.com/job/Product-Manager-Reporting-Data-Analytics/10/">Product Manager - Reporting & Data Analytics</a>
      <span>IN</span>
      <span>Jul 15, 2025</span>
    </div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../aurigo/script.js')
  } catch {
    assert.fail('Expected Aurigo Software Technologies scraper module at ../aurigo/script.js')
  }
}

test('Aurigo Software Technologies helpers stay pinned to the verified first-party jobs search pages', async () => {
  const aurigo = await loadModule()

  assert.equal(aurigo.SOURCE, 'aurigo')
  assert.equal(aurigo.COMPANY, 'Aurigo Software Technologies')
  assert.equal(aurigo.CAREERS_URL, 'https://careers.aurigo.com/')
  assert.equal(
    aurigo.SEARCH_RESULTS_URL,
    'https://careers.aurigo.com/search/?createNewAlert=false&locationsearch=&q=',
  )
  assert.equal(aurigo.VERIFIED_ON, '2026-07-17')
  assert.equal(aurigo.hasOfficialCareersSignal(searchPageOneHtml), true)
  assert.equal(aurigo.hasOfficialCareersSignal('<html><body><h1>Search results</h1></body></html>'), false)
  assert.equal(aurigo.extractNextPageUrl(searchPageOneHtml), 'https://careers.aurigo.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=5')
  assert.deepEqual(aurigo.extractJobs(searchPageOneHtml), [
    {
      title: 'Manager - Legal',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'manager-legal-1',
      requisitionId: 'manager-legal-1',
      sourceUrl: 'https://careers.aurigo.com/job/Manager-Legal/1/',
      applyUrl: 'https://careers.aurigo.com/job/Manager-Legal/1/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-25',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Software Engineer II',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'software-engineer-ii-2',
      requisitionId: 'software-engineer-ii-2',
      sourceUrl: 'https://careers.aurigo.com/job/Software-Engineer-II/2/',
      applyUrl: 'https://careers.aurigo.com/job/Software-Engineer-II/2/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-13',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Information Developer II',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'information-developer-ii-3',
      requisitionId: 'information-developer-ii-3',
      sourceUrl: 'https://careers.aurigo.com/job/Information-Developer-II/3/',
      applyUrl: 'https://careers.aurigo.com/job/Information-Developer-II/3/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-11',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Information Developer - II',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'information-developer-ii-2-5',
      requisitionId: 'information-developer-ii-2-5',
      sourceUrl: 'https://careers.aurigo.com/job/Information-Developer-II-2/5/',
      applyUrl: 'https://careers.aurigo.com/job/Information-Developer-II-2/5/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-06',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('Aurigo Software Technologies run validates the verified search pages and decorates India jobs only', async () => {
  const aurigo = await loadModule()
  const requestedUrls = []

  const jobs = await aurigo.createAurigoScraper({ maxPages: 2, maxJobs: 3 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === aurigo.SEARCH_RESULTS_URL) return searchPageOneHtml
      if (url === 'https://careers.aurigo.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=5') {
        return searchPageTwoHtml
      }
      throw new Error(`Unexpected Aurigo URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    aurigo.SEARCH_RESULTS_URL,
    'https://careers.aurigo.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=5',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'aurigo')
  assert.equal(jobs[0].link, 'https://careers.aurigo.com/job/Manager-Legal/1/')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Aurigo Software Technologies run fails closed when the verified jobs search surface drifts', async () => {
  const aurigo = await loadModule()

  await assert.rejects(
    aurigo.createAurigoScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified aurigo search surface/i,
  )
})
