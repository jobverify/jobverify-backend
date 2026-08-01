import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const htmlAttributeJson = (value) => JSON.stringify(value).replace(/"/g, '&quot;')

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected scraper module at ${relativePath}`)
  }
}

const cognusHomepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <nav>
      <a href="/life-at-cognus">Life At Cognus</a>
      <a href="https://cognustechnology.zohorecruit.in/jobs/Careers">Join Us</a>
    </nav>
  </body>
</html>
`

const cognusModuleMeta = [
  {
    api_name: 'Job_Openings',
    fields: [
      { id: '61921000000003081', api_name: 'Job_Opening_Name' },
      { id: '61921000000003067', api_name: 'Job_Type' },
      { id: '61921000000003125', api_name: 'Work_Experience' },
      { id: '61921000000003103', api_name: 'State' },
      { id: '61921000000003101', api_name: 'City' },
      { id: '61921000000003105', api_name: 'Country' },
      { id: '61921000000003091', api_name: 'Date_Opened' },
      { id: '61921000000003143', api_name: 'Job_Description' },
    ],
  },
]

const cognusPageJson = {
  detail: {
    section: {
      data: [
        {
          blocktype: 'jobs',
          title: 'Join us',
          subtitle: 'Current Openings',
        },
      ],
    },
  },
}

const cognusMeta = {
  org_info: {
    company_name: 'Cognus Technology',
    website: 'http://www.cognustechnology.com',
  },
  list_url: 'https://cognustechnology.zohorecruit.in/jobs/Careers',
  page_name: 'Careers',
  _no_longer: 'zr.pos.no.act',
}

const cognusCareersHtml = (jobsPayload) => `
<!doctype html>
<html lang="en">
  <body>
    <input type="hidden" id="pageJson" value="${htmlAttributeJson(cognusPageJson)}">
    <input type="hidden" id="moduleMeta" value="${htmlAttributeJson(cognusModuleMeta)}">
    <input type="hidden" id="jobs" value="${htmlAttributeJson(jobsPayload)}">
    <input type="hidden" id="meta" value="${htmlAttributeJson(cognusMeta)}">
    <div id="career-website-main"></div>
  </body>
</html>
`

const sagCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Current Openings <span>(<strong>HR - </strong><a href="tel:9672850509">9672850509</a>)</span></h2>
    <div class="career-box">
      <div class="col-md-10 col-9"><h3>Tech Support <span>0-2 Years</span></h3></div>
      <p><span class="dispmsg">Tech Support Executive</span> (No. of Vacancies: 2)</p>
      <a class="btn send-btn-career" href="ApplyCareer.aspx?code=0023">APPLY NOW!<i class="fa fa-send"></i></a>
    </div>
    <div class="career-box">
      <div class="col-md-10 col-9"><h3>Angular Developer <span>1-5 Years</span></h3></div>
      <p><span class="dispmsg">Angular Developer</span> (No. of Vacancies: 2)</p>
      <a class="btn send-btn-career" href="ApplyCareer.aspx?code=0019">APPLY NOW!<i class="fa fa-send"></i></a>
    </div>
  </body>
</html>
`

const intechCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career - The INTECH Group</title>
  </head>
  <body>
    <p>At INTECH Creative Services, we believe that when people grow, businesses grow.</p>
    <h2>Find Your Perfect Role</h2>
    <div data-elementor-type="loop-item" data-elementor-id="12806" class="elementor elementor-12806 e-loop-item e-loop-item-17285 post-17285 jobs type-jobs status-publish hentry">
      <h2 class="elementor-heading-title elementor-size-default">Assistant Consultant - Oracle Fusion</h2>
      <h6 class="elementor-heading-title elementor-size-default">Department:</h6>
      <div class="elementor-widget-text-editor">Technical</div>
      <h6 class="elementor-heading-title elementor-size-default">Experience:</h6>
      <div class="elementor-widget-text-editor">8-10 years</div>
      <h6 class="elementor-heading-title elementor-size-default">Job Type:</h6>
      <div class="elementor-widget-text-editor">Permanent</div>
      <h6 class="elementor-heading-title elementor-size-default">Vacancies:</h6>
      <div class="elementor-widget-text-editor">1</div>
      <h6 class="elementor-heading-title elementor-size-default">Location:</h6>
      <div class="elementor-widget-text-editor">Work From Home</div>
      <a class="elementor-button elementor-button-link elementor-size-sm" href="https://theintechgroup.com/career/jobs/assistant-consultant-oracle-fusion-2/">
        <span class="elementor-button-text">Apply Now</span>
      </a>
    </div>
    <div data-elementor-type="loop-item" data-elementor-id="12806" class="elementor elementor-12806 e-loop-item e-loop-item-16979 post-16979 jobs type-jobs status-publish hentry">
      <h2 class="elementor-heading-title elementor-size-default">Assistant Consultant - Oracle Fusion</h2>
      <h6 class="elementor-heading-title elementor-size-default">Department:</h6>
      <div class="elementor-widget-text-editor">Technical</div>
      <h6 class="elementor-heading-title elementor-size-default">Experience:</h6>
      <div class="elementor-widget-text-editor">5-8 years</div>
      <h6 class="elementor-heading-title elementor-size-default">Job Type:</h6>
      <div class="elementor-widget-text-editor">Contractual</div>
      <h6 class="elementor-heading-title elementor-size-default">Vacancies:</h6>
      <div class="elementor-widget-text-editor">1</div>
      <h6 class="elementor-heading-title elementor-size-default">Location:</h6>
      <div class="elementor-widget-text-editor">Work From Home</div>
      <a class="elementor-button elementor-button-link elementor-size-sm" href="https://theintechgroup.com/career/jobs/assistant-consultant-oracle-fusion/">
        <span class="elementor-button-text">Apply Now</span>
      </a>
    </div>
    <div data-elementor-type="loop-item" data-elementor-id="12806" class="elementor elementor-12806 e-loop-item e-loop-item-16552 post-16552 jobs type-jobs status-publish hentry">
      <h2 class="elementor-heading-title elementor-size-default">Senior Executive - Implementation</h2>
      <h6 class="elementor-heading-title elementor-size-default">Department:</h6>
      <div class="elementor-widget-text-editor">Technical</div>
      <h6 class="elementor-heading-title elementor-size-default">Experience:</h6>
      <div class="elementor-widget-text-editor">5-8 years</div>
      <h6 class="elementor-heading-title elementor-size-default">Job Type:</h6>
      <div class="elementor-widget-text-editor">Permanent</div>
      <h6 class="elementor-heading-title elementor-size-default">Vacancies:</h6>
      <div class="elementor-widget-text-editor">1</div>
      <h6 class="elementor-heading-title elementor-size-default">Location:</h6>
      <div class="elementor-widget-text-editor">Bengaluru</div>
      <a class="elementor-button elementor-button-link elementor-size-sm" href="https://theintechgroup.com/career/jobs/senior-executive-implementation/">
        <span class="elementor-button-text">Apply Now</span>
      </a>
    </div>
  </body>
</html>
`

const mindfireCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Career Possibilities</h1>
    <a href="https://apply.mindfiresolutions.com/">APPLY NOW</a>
  </body>
</html>
`

const mindfireJobpostPayload = [
  {
    jobPostingId: 5100,
    position: 'AWS Data Engineer',
    locations: 'Bhubaneswar, Delhi - NCR, Remote Working',
    minExp: 3,
    maxExp: 5,
    jobDetails: 'Build and optimize scalable data platforms on AWS.',
    qualifications: '<div>- Bachelor degree in Computer Science.</div>',
    responsibilities: '<div>- Design ETL pipelines.</div>',
    requiredSkills: '<div>- Python</div><div>- SQL</div>',
    exposureSkills: '<div>- Exposure to Generative AI.</div>',
    compensation: null,
    jobType: 1,
    publishDate: '2026-04-09T00:00:00',
    isActive: 1,
    isPublished: 1,
  },
  {
    jobPostingId: 5102,
    position: 'AI/ML Engineer',
    locations: 'Bhubaneswar, Delhi - NCR, Remote Working',
    minExp: 2,
    maxExp: 4,
    jobDetails: 'Develop Generative AI and Agentic AI solutions.',
    qualifications: '<div>- Bachelor degree in Computer Science.</div>',
    responsibilities: '<div>- Build production AI systems.</div>',
    requiredSkills: '<div>- Python</div><div>- LangChain</div>',
    exposureSkills: null,
    compensation: null,
    jobType: 1,
    publishDate: '2026-05-05T00:00:00',
    isActive: 1,
    isPublished: 1,
  },
]

const hiddenBrainsCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Join a People-first Environment Where Personal Growth and Achievements Are Celebrated</h2>
    <a href="#">ALL POSITIONS (15)</a>
    <div class="JobPostView_inner-box__8B_7h ">
      <div class="JobPostView_inner-title__e9SXi">Business Development Executive <span class="JobPostView_sub-title__vg5Ow"></span></div>
      <span class="JobPostView_openings-text__sLvQK">7 Openings</span>
      <ul><li>0 - 2 Years Experience</li><li>Full Time</li></ul>
      <a href="#" class="JobPostView_view-details-link__DJ1_Q ">View Details</a>
      <a href="#InquiryJob" class="JobPostView_apply-now-btn___CGti">APPLY NOW!</a>
    </div>
    <div class="JobPostView_inner-box__8B_7h ">
      <div class="JobPostView_inner-title__e9SXi">MERN Fullstack Developer - (Onsite - Abu Dhabi) <span class="JobPostView_sub-title__vg5Ow"></span></div>
      <span class="JobPostView_openings-text__sLvQK">10 Openings</span>
      <ul><li>5 - 8 Years Experience</li><li>Full Time</li></ul>
      <a href="#" class="JobPostView_view-details-link__DJ1_Q ">View Details</a>
      <a href="#InquiryJob" class="JobPostView_apply-now-btn___CGti">APPLY NOW!</a>
    </div>
    <div class="JobPostView_inner-box__8B_7h ">
      <div class="JobPostView_inner-title__e9SXi">Creative UI/UX Lead <span class="JobPostView_sub-title__vg5Ow"></span></div>
      <span class="JobPostView_openings-text__sLvQK">2 Openings</span>
      <ul><li>8 - 10 Years Experience</li><li>Full Time</li></ul>
      <a href="#" class="JobPostView_view-details-link__DJ1_Q ">View Details</a>
      <a href="#InquiryJob" class="JobPostView_apply-now-btn___CGti">APPLY NOW!</a>
    </div>
  </body>
</html>
`

test('Cognus Technology helper extraction and empty-board run stay pinned to the official homepage handoff and hidden-input payload', async () => {
  const cognus = await loadModule('../../scraper/cognustechnology/script.js')
  const jobsHtml = cognusCareersHtml([
    {
      id: '61921000099999999',
      '61921000000003081': 'Data Engineer',
      '61921000000003067': 'Full Time',
      '61921000000003125': '3-5 years',
      '61921000000003101': 'Bhubaneswar',
      '61921000000003103': 'Odisha',
      '61921000000003105': 'India',
      '61921000000003091': '2026-07-01',
      '61921000000003143': '<div>Build cloud data pipelines.</div>',
    },
  ])

  assert.equal(cognus.CAREERS_URL, 'https://cognustechnology.zohorecruit.in/jobs/Careers')
  assert.equal(cognus.hasOfficialHomepageSignal(cognusHomepageHtml), true)
  assert.equal(cognus.hasOfficialCareersSignal(jobsHtml), true)

  const extractedJobs = cognus.extractJobsFromOfficialBoard(jobsHtml)
  assert.equal(extractedJobs.length, 1)
  assert.equal(extractedJobs[0].title, 'Data Engineer')
  assert.equal(extractedJobs[0].location, 'Bhubaneswar, Odisha, India')

  const requestedUrls = []
  const emptyJobs = await cognus.createCognusTechnologyScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === cognus.HOMEPAGE_URL) return cognusHomepageHtml
      if (url === cognus.CAREERS_URL) return cognusCareersHtml([])
      throw new Error(`Unexpected Cognus URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [cognus.HOMEPAGE_URL, cognus.CAREERS_URL])
  assert.deepEqual(emptyJobs, [])
})

test('SAG Infotech run returns normalized jobs from the verified first-party current openings page', async () => {
  const sag = await loadModule('../../scraper/saginfotech/script.js')

  assert.equal(sag.hasOfficialCareersSignal(sagCareersHtml), true)
  assert.deepEqual(sag.extractOpeningCards(sagCareersHtml).map((job) => job.title), [
    'Tech Support Executive',
    'Angular Developer',
  ])

  const jobs = await sag.createSagInfotechScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, sag.CAREERS_URL)
      return sagCareersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Angular Developer')
  assert.equal(jobs[0].applyUrl, 'https://saginfotech.com/ApplyCareer.aspx?code=0019')
  assert.equal(jobs[1].title, 'Tech Support Executive')
  assert.equal(jobs[1].openingsCount, 2)
})

test('Intech Creative Services run returns normalized jobs from the verified loop-grid cards', async () => {
  const intech = await loadModule('../../scraper/intechcreativeservices/script.js')

  assert.equal(intech.hasOfficialCareersSignal(intechCareersHtml), true)
  assert.equal(intech.extractLoopGridJobCards(intechCareersHtml).length, 3)

  const jobs = await intech.createIntechCreativeServicesScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, intech.CAREERS_URL)
      return intechCareersHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Assistant Consultant - Oracle Fusion')
  assert.equal(jobs[0].employmentType, 'Contractual')
  assert.equal(jobs[0].location, 'Work From Home')
  assert.equal(jobs[2].title, 'Senior Executive - Implementation')
  assert.equal(jobs[2].city, 'Bangalore')
})

test('Mindfire Solutions run returns normalized jobs from the public jobpost API payload', async () => {
  const mindfire = await loadModule('../../scraper/mindfiresolutions/script.js')
  const requestedUrls = []

  assert.equal(mindfire.hasOfficialCareersSignal(mindfireCareersHtml), true)
  assert.deepEqual(mindfire.extractJobsFromJobpostPayload(mindfireJobpostPayload).map((job) => job.title), [
    'AI/ML Engineer',
    'AWS Data Engineer',
  ])

  const jobs = await mindfire.createMindfireSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, mindfire.CAREERS_URL)
      return mindfireCareersHtml
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, mindfire.JOBS_API_URL)
      return mindfireJobpostPayload
    },
  })

  assert.deepEqual(requestedUrls, [mindfire.CAREERS_URL, mindfire.JOBS_API_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'AI/ML Engineer')
  assert.equal(jobs[1].location, 'Bhubaneswar, Delhi - NCR, Remote Working')
  assert.equal(jobs[1].employmentType, 'Full Time')
})

test('Hidden Brains InfoTech run returns visible ALL POSITIONS jobs and excludes the Abu Dhabi opening', async () => {
  const hiddenBrains = await loadModule('../../scraper/hiddenbrainsinfotech/script.js')

  assert.equal(hiddenBrains.hasOfficialCareersSignal(hiddenBrainsCareersHtml), true)
  assert.equal(hiddenBrains.extractVisibleJobCards(hiddenBrainsCareersHtml).length, 3)

  const jobs = await hiddenBrains.createHiddenBrainsInfotechScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, hiddenBrains.CAREERS_URL)
      return hiddenBrainsCareersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Business Development Executive',
    'Creative UI/UX Lead',
  ])
  assert.equal(jobs[0].applyUrl, 'https://www.hiddenbrains.com/careers.html#InquiryJob')
  assert.equal(jobs[1].experienceRequired, '8 - 10 Years')
})
