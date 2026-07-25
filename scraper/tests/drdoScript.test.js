import assert from 'node:assert/strict'
import test from 'node:test'

const loadDrdoModule = async () => {
  try {
    return await import('../drdo/script.js')
  } catch {
    assert.fail('Expected DRDO scraper module at ../scraper/drdo/script.js')
  }
}

const vacanciesPageHtml = `
  <main>
    <h1>Vacancies</h1>
    <div class="vacanciess-box">
      <div class="vacanciess-title">DMRL, Hyderabad invites applications for paid internship</div>
      <div class="vacanciess-advertisment-no-content">DMRL/HRD/PIS/2026/01</div>
      <div class="vacanciess-date-publish-content"><time>03/07/2026</time></div>
      <div class="vacanciess-due-date-content">15/07/2026</div>
      <a href="/drdo/en/offerings/vacancies/dmrl-hyderabad-invites-applications-paid-internship">View More</a>
    </div>
    <nav class="pager"><a href="?page=1">Next page</a></nav>
  </main>
`

test('extractVacancies maps official DRDO vacancy cards to normalized job records', async () => {
  const drdo = await loadDrdoModule()
  const jobs = drdo.extractVacancies(vacanciesPageHtml)

  assert.equal(drdo.hasVacanciesPageSignal(vacanciesPageHtml), true)
  assert.deepEqual(jobs, [{
    title: 'DMRL, Hyderabad invites applications for paid internship',
    company: 'DRDO',
    department: null,
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: 'drdo-dmrl-hrd-pis-2026-01',
    requisitionId: 'DMRL/HRD/PIS/2026/01',
    sourceUrl: drdo.VACANCIES_PAGE_URL,
    applyUrl: 'https://drdo.gov.in/drdo/en/offerings/vacancies/dmrl-hyderabad-invites-applications-paid-internship',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-03',
    closingDate: '2026-07-15',
    jobDescription: 'Official DRDO vacancy announcement. Review the official posting for eligibility and application details.',
  }])
  assert.deepEqual(drdo.extractPageUrls(vacanciesPageHtml), [
    'https://drdo.gov.in/drdo/en/offerings/vacancies?page=1',
  ])
})

test('run follows official DRDO vacancy pagination and decorates extracted jobs', async () => {
  const drdo = await loadDrdoModule()
  const requestedUrls = []
  const jobs = await drdo.createDrdoScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return url === drdo.VACANCIES_PAGE_URL ? vacanciesPageHtml : '<main><h1>Vacancies</h1></main>'
    },
  })

  assert.deepEqual(requestedUrls, [
    drdo.VACANCIES_PAGE_URL,
    'https://drdo.gov.in/drdo/en/offerings/vacancies?page=1',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'drdo')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.ok(Date.parse(jobs[0].scrapedAt))
})
