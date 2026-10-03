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
    return await import('../../scraper/detecttechnologies/script.js')
  } catch {
    assert.fail('Expected Detect Technologies scraper module at ../../scraper/scraper/detecttechnologies/script.js')
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

test('Detect Technologies reads the current Webflow openings cards', async () => {
  const detect = await loadDetectTechnologiesModule()
  const webflowHtml = `<html><head><title>Current Openings</title><meta name="generator" content="Webflow"></head><body>
    <div id="roles"><div class="w-dyn-list"><div role="list" class="w-dyn-items">
    <div role="listitem" class="w-dyn-item"><div class="job-listing-card">
      <h3 class="text-size-medium">Junior Software Operations and Maintenance Engineer</h3>
      <div>Mode:</div><div>Full Time</div><div>Exp:</div><div>Freshers</div>
      <div>Location:</div><div>Chennai</div><div>Mode:</div><div>Work from office</div>
      <a href="/careers/junior-software-operations-and-maintenance-engineer" class="button is-icon w-inline-block"><div>Apply Now</div></a>
    </div></div>
    <div role="listitem" class="w-dyn-item"><div class="job-listing-card">
      <h3 class="text-size-medium">Delivery Engineer DA Robotics (Drone Pilot)</h3>
      <div>Mode:</div><div>Full Time</div><div>Exp:</div><div>1-1.5 yrs</div>
      <div>Location:</div><div>Chennai</div><div>Mode:</div><div>Work from office</div>
      <a href="/careers/delivery-engineer-da-robotics-drone-pilot" class="button is-icon w-inline-block"><div>Apply Now</div></a>
    </div></div></div></div></div></body></html>`

  assert.equal(detect.pageIndicatesJobCards(webflowHtml), true)
  const jobs = await detect.createDetectTechnologiesScraper().run({ fetchText: async () => webflowHtml })
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Junior Software Operations and Maintenance Engineer')
  assert.equal(jobs[0].city, 'Chennai')
  assert.equal(jobs[0].employmentType, 'Full Time')
  assert.equal(jobs[0].experienceRequired, 'Freshers')
  assert.equal(jobs[0].applyUrl, 'https://detecttechnologies.com/careers/junior-software-operations-and-maintenance-engineer')
})
