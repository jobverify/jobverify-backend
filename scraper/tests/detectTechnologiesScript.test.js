import assert from 'node:assert/strict'
import test from 'node:test'

const listingHtml = `
<div class="current-job-list">
  <h5>Software Engineer&nbsp;( SE 2 &#8211; Frontend Developer)&nbsp;</h5>
  <div class="media"><div class="media-body"><p>Job Type : Full Time</p></div></div>
  <div class="media"><div class="media-body"><p>Exp : 2+ Years</p></div></div>
  <div class="media"><div class="media-body"><p>Location : Chennai</p></div></div>
  <a href="https://detecttechnologies.com/career/software-engineer-se-2-frontend-developer/" class="btn btn-text">Apply Now<i></i></a>
</div>
<div class="current-job-list">
  <h5>Backend Engineer Applications &#8211; BEA 1</h5>
  <div class="media"><div class="media-body"><p>Job Type : Full Time</p></div></div>
  <div class="media"><div class="media-body"><p>Exp : 2+ Years</p></div></div>
  <div class="media"><div class="media-body"><p>Location : Chennai</p></div></div>
  <a href="https://detecttechnologies.com/career/backend-engineer-applications-bea-1/" class="btn btn-text">Apply Now<i></i></a>
</div>
`

const loadDetectTechnologiesModule = async () => {
  try {
    return await import('../detecttechnologies/script.js')
  } catch {
    assert.fail('Expected Detect Technologies scraper module at ../scraper/detecttechnologies/script.js')
  }
}

test('extractSearchResults maps official Detect Technologies opening cards into job records', async () => {
  const detect = await loadDetectTechnologiesModule()

  assert.equal(detect.pageIndicatesJobCards(listingHtml), true)
  assert.deepEqual(detect.extractSearchResults(listingHtml), [
    {
      title: 'Software Engineer ( SE 2 - Frontend Developer)',
      company: 'Detect Technologies',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'detecttechnologies-software-engineer-se-2-frontend-developer',
      requisitionId: 'software-engineer-se-2-frontend-developer',
      sourceUrl: 'https://detecttechnologies.com/current-openings/',
      applyUrl: 'https://detecttechnologies.com/career/software-engineer-se-2-frontend-developer/',
      employmentType: 'Full Time',
      experienceRequired: '2+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Apply via the official Detect Technologies job page.',
    },
    {
      title: 'Backend Engineer Applications - BEA 1',
      company: 'Detect Technologies',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'detecttechnologies-backend-engineer-applications-bea-1',
      requisitionId: 'backend-engineer-applications-bea-1',
      sourceUrl: 'https://detecttechnologies.com/current-openings/',
      applyUrl: 'https://detecttechnologies.com/career/backend-engineer-applications-bea-1/',
      employmentType: 'Full Time',
      experienceRequired: '2+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Apply via the official Detect Technologies job page.',
    },
  ])
})

test('run fetches the official Detect Technologies openings page and decorates each job', async () => {
  const detect = await loadDetectTechnologiesModule()
  const requestedUrls = []

  const jobs = await detect.createDetectTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return listingHtml
    },
  })

  assert.deepEqual(requestedUrls, [detect.CAREER_PAGE_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'detecttechnologies')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
