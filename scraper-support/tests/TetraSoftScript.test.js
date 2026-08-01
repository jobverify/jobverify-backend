import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T07:00:00.000Z'

const careersHtml = `
<!doctype html>
<html>
  <head>
    <title>Tetrasoft</title>
  </head>
  <body>
    <h2>Tetrasoft Careers</h2>
    <p>We create meaningful human experiences for our associates.</p>
    <div class="faq-item">
      <div class="faq-header"><h4>Tech Lead - Machine Learning with Python</h4></div>
      <div class="faq-content">
        <p><strong>Skills:</strong> Machine Learning with Python<br><strong>Experience:</strong> 7 - 10 Years<br><strong>Location:</strong> HYDERABAD</p>
        <p><strong>Job Description:</strong> Hands on development using agentic AI frameworks such as LangGraph and LangChain.</p>
        <p><a href="mailto:ts_tag_offshore@tetrasoft.us"><strong>Apply Now</strong></a></p>
      </div>
    </div>
    <div class="faq-item">
      <div class="faq-header"><h4>Tech Lead - ReactJS</h4></div>
      <div class="faq-content">
        <p><strong>Skills:</strong> ReactJS<br><strong>Experience:</strong> 7 - 10 Years<br><strong>Location:</strong> HYDERABAD</p>
        <p><strong>Job Description:</strong> We are seeking a highly skilled Senior Software Developer with extensive experience in Angular 11.</p>
        <p><a href="mailto:ts_tag_offshore@tetrasoft.us"><strong>Apply Now</strong></a></p>
      </div>
    </div>
    <div class="faq-item">
      <div class="faq-header"><h4>Tech Lead - Python</h4></div>
      <div class="faq-content">
        <p><strong>Skills:</strong> Python<br><strong>Experience:</strong> 7 - 10 Years<br><strong>Location:</strong> HYDERABAD</p>
        <p><strong>Job Description:</strong> We are seeking a highly skilled Senior Software Developer with extensive experience in Python.</p>
        <p><a href="mailto:ts_tag_offshore@tetrasoft.us"><strong>Apply Now</strong></a></p>
      </div>
    </div>
  </body>
</html>
`

const loadTetrasoftModule = async () => {
  try {
    return await import('../../scraper/tetrasoft/script.js')
  } catch {
    assert.fail('Expected TetraSoft scraper module at ../../scraper/tetrasoft/script.js')
  }
}

test('TetraSoft pins the verified first-party careers accordion and mailto apply contract', async () => {
  const tetrasoft = await loadTetrasoftModule()

  assert.equal(tetrasoft.SOURCE, 'tetrasoft')
  assert.equal(tetrasoft.COMPANY, 'TetraSoft')
  assert.equal(tetrasoft.COMPANY_DOMAIN, 'tetrasoft.us')
  assert.equal(tetrasoft.CAREERS_URL, 'https://www.tetrasoft.us/careers.html')
  assert.equal(tetrasoft.APPLICATION_EMAIL, 'ts_tag_offshore@tetrasoft.us')
  assert.equal(tetrasoft.VERIFIED_ON, '2026-07-18')
  assert.equal(tetrasoft.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(tetrasoft.extractCareerCards(careersHtml).length, 3)
})

test('TetraSoft extracts first-party accordion jobs into the shared job shape', async () => {
  const tetrasoft = await loadTetrasoftModule()
  const jobs = tetrasoft.extractCareerCards(careersHtml)

  assert.deepEqual(jobs[0], {
    title: 'Tech Lead - Machine Learning with Python',
    company: 'TetraSoft',
    department: null,
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: 'tech-lead-machine-learning-with-python',
    requisitionId: 'tech-lead-machine-learning-with-python',
    sourceUrl: 'https://www.tetrasoft.us/careers.html#tech-lead-machine-learning-with-python',
    applyUrl: 'mailto:ts_tag_offshore@tetrasoft.us',
    employmentType: null,
    experienceRequired: '7 - 10 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Machine Learning with Python'],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Hands on development using agentic AI frameworks such as LangGraph and LangChain.',
    salary: null,
  })
  assert.equal(jobs[1].title, 'Tech Lead - ReactJS')
  assert.match(jobs[1].jobDescription, /Angular 11/i)
  assert.equal(jobs[2].title, 'Tech Lead - Python')
})

test('TetraSoft run validates the page and decorates the extracted first-party jobs', async () => {
  const tetrasoft = await loadTetrasoftModule()
  const jobs = await tetrasoft.createTetrasoftScraper().run({
    fetchText: async () => careersHtml,
    now: () => FIXED_SCRAPED_AT,
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'tetrasoft')
  assert.equal(jobs[0].company, 'TetraSoft')
  assert.equal(jobs[0].companyCareerPage, tetrasoft.CAREERS_URL)
  assert.equal(jobs[0].companyDomain, 'tetrasoft.us')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers-html')
  assert.equal(jobs[0].link, 'mailto:ts_tag_offshore@tetrasoft.us')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('TetraSoft fails closed when the verified careers accordion drifts materially', async () => {
  const tetrasoft = await loadTetrasoftModule()

  await assert.rejects(
    tetrasoft.createTetrasoftScraper().run({
      fetchText: async () => '<html><h2>Unexpected</h2></html>',
    }),
    /verified TetraSoft careers page/i,
  )
})
