import assert from 'node:assert/strict'
import test from 'node:test'

const careersPageHtml = `
  <html>
    <body>
      <h1>Careers at Chitkara University</h1>
      <div class="job-posted-box">
        <h3><a href="https://careers.chitkara.edu.in/ux-ui-associate-professor/">UX/UI Associate Professor</a></h3>
        <span class="job-location">Rajpura, Punjab, India</span>
        <span class="job-experience">8+ years</span>
        <span class="job-type">Full Time</span>
        <span class="job-domain">Design</span>
        <span class="job-education">Master's Degree</span>
        <p>Teach interaction design and mentor studio projects.</p>
      </div>
      <a class="next page-numbers" href="https://careers.chitkara.edu.in/page/2/">Next</a>
      <div class="gform_wrapper">Apply Now</div>
    </body>
  </html>
`

const pageTwoHtml = `
  <html>
    <body>
      <div class="job-posted-box">
        <h3><a href="https://careers.chitkara.edu.in/assistant-professor-data-science/">Assistant Professor - Data Science</a></h3>
        <span class="job-location">Chandigarh, India</span>
        <span class="job-experience">3-5 years</span>
        <span class="job-type">Full Time</span>
        <span class="job-domain">Data Science</span>
        <span class="job-education">PhD preferred</span>
        <p>Support lab-led teaching and applied analytics projects.</p>
      </div>
      <div class="gform_wrapper">Apply Now</div>
    </body>
  </html>
`

const uxUiDetailHtml = `
  <html>
    <body>
      <h1>UX/UI Associate Professor</h1>
      <section class="job-description">
        <p>Lead user experience curriculum design and industry collaborations.</p>
        <ul>
          <li>Mentor capstone projects.</li>
          <li>Build studio-based assessments.</li>
        </ul>
      </section>
      <div class="gform_wrapper">Upload Resume</div>
    </body>
  </html>
`

const dataScienceDetailHtml = `
  <html>
    <body>
      <h1>Assistant Professor - Data Science</h1>
      <section class="job-description">
        <p>Teach data science foundations and mentor analytics research.</p>
      </section>
      <div class="gform_wrapper">Upload Resume</div>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/chitkarauniversity/script.js')
  } catch {
    assert.fail('Expected Chitkara University scraper module at ../../scraper/chitkarauniversity/script.js')
  }
}

const modernCareersHtml = `<title>CHITKARA UNIVERSITY - Best University in North India</title>
  <button>View All Positions</button><section id="positions">All open positions</section>
  <script src="/_next/static/chunks/app/page-current.js"></script>`
const modernJob = {
  id: 'current-role-id', title: 'Professor', category: 'Education',
  location: 'Rajpura, Chitkara University', schedule: 'Full-Time',
  summary: 'Teach CSE and ECE.', responsibilities: ['Lead academic research'],
  qualifications: ['PhD in the relevant discipline'], requiredSkill: ['Teaching'],
  mandatoryEducation: 'PhD', experience: '20 Years', jobs_created_at: '2026-08-01T00:00:00.000Z',
}

test('Chitkara follows its current public app handoff and maps API roles without inventing detail URLs', async () => {
  const chitkara = await loadModule()
  const requests = []
  const jobs = await chitkara.run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === chitkara.CAREERS_URL) return modernCareersHtml
      if (url.endsWith('/page-current.js')) return 'fetch("https://api.chitkara.edu.in/jobpost/getAll").then(r=>r.json())'
      if (url === 'https://api.chitkara.edu.in/jobpost/getAll') return JSON.stringify({ statusCode: 200, data: [modernJob] })
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-09-12T00:00:00.000Z',
  })
  assert.equal(requests.length, 3)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, modernJob.id)
  assert.equal(jobs[0].title, 'Professor')
  assert.equal(jobs[0].city, 'Rajpura')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.deepEqual(jobs[0].requiredSkills, ['Teaching'])
  assert.match(jobs[0].jobDescription, /Lead academic research/)
  assert.equal(jobs[0].applyUrl, `${chitkara.CAREERS_URL}#positions`)
  assert.equal(jobs[0].scrapedAt, '2026-09-12T00:00:00.000Z')
})

test('Chitkara rejects a changed API handoff and malformed or duplicate public roles', async () => {
  const chitkara = await loadModule()
  for (const payload of [{ data: [] }, { statusCode: 200, data: [{}] }, { statusCode: 200, data: [modernJob, modernJob] }]) {
    await assert.rejects(chitkara.run({ fetchText: async (url) => url === chitkara.CAREERS_URL
      ? modernCareersHtml : url.endsWith('.js') ? 'fetch("https://api.chitkara.edu.in/jobpost/getAll")' : JSON.stringify(payload) }), /Chitkara/)
  }
  await assert.rejects(chitkara.run({ fetchText: async (url) => url === chitkara.CAREERS_URL
    ? modernCareersHtml : 'fetch("https://unrelated.example/jobs")' }), /Chitkara/)
})

test('Chitkara University exports stable first-party careers pagination helpers', async () => {
  const chitkara = await loadModule()

  assert.equal(chitkara.CAREERS_URL, 'https://careers.chitkara.edu.in/')
  assert.equal(chitkara.buildPageUrl(1), 'https://careers.chitkara.edu.in/')
  assert.equal(chitkara.buildPageUrl(2), 'https://careers.chitkara.edu.in/page/2/')
  assert.equal(chitkara.hasOfficialCareersSignal(careersPageHtml), true)
})

test('extractListings maps Chitkara University first-party cards into the shared job shape', async () => {
  const chitkara = await loadModule()

  assert.deepEqual(chitkara.extractListings(careersPageHtml), [
    {
      title: 'UX/UI Associate Professor',
      company: 'Chitkara University',
      department: 'Design',
      location: 'Rajpura, Punjab, India',
      city: 'Rajpura',
      country: 'India',
      jobId: 'ux-ui-associate-professor',
      requisitionId: 'ux-ui-associate-professor',
      sourceUrl: 'https://careers.chitkara.edu.in/ux-ui-associate-professor/',
      applyUrl: 'https://careers.chitkara.edu.in/ux-ui-associate-professor/',
      employmentType: 'Full-time',
      experienceRequired: '8+ years',
      minimumQualification: "Master's Degree",
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Teach interaction design and mentor studio projects.',
      remoteStatus: 'On-site',
    },
  ])
})

test('extractJobDetail keeps the Chitkara detail page as the applyUrl and enriches the description', async () => {
  const chitkara = await loadModule()
  const sourceUrl = 'https://careers.chitkara.edu.in/ux-ui-associate-professor/'

  assert.deepEqual(chitkara.extractJobDetail(uxUiDetailHtml, {
    title: 'UX/UI Associate Professor',
    company: 'Chitkara University',
    department: 'Design',
    location: 'Rajpura, Punjab, India',
    city: 'Rajpura',
    country: 'India',
    jobId: 'ux-ui-associate-professor',
    requisitionId: 'ux-ui-associate-professor',
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: 'Full-time',
    experienceRequired: '8+ years',
    minimumQualification: "Master's Degree",
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Teach interaction design and mentor studio projects.',
    remoteStatus: 'On-site',
  }), {
    title: 'UX/UI Associate Professor',
    company: 'Chitkara University',
    department: 'Design',
    location: 'Rajpura, Punjab, India',
    city: 'Rajpura',
    country: 'India',
    jobId: 'ux-ui-associate-professor',
    requisitionId: 'ux-ui-associate-professor',
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: 'Full-time',
    experienceRequired: '8+ years',
    minimumQualification: "Master's Degree",
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Lead user experience curriculum design and industry collaborations. Mentor capstone projects. Build studio-based assessments.',
    remoteStatus: 'On-site',
  })
})

test('run paginates the Chitkara University careers board and decorates detail-page jobs', async () => {
  const chitkara = await loadModule()
  const requests = []

  const jobs = await chitkara.createChitkaraUniversityScraper().run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === chitkara.CAREERS_URL) return careersPageHtml
      if (url === 'https://careers.chitkara.edu.in/ux-ui-associate-professor/') return uxUiDetailHtml
      if (url === 'https://careers.chitkara.edu.in/page/2/') return pageTwoHtml
      if (url === 'https://careers.chitkara.edu.in/assistant-professor-data-science/') return dataScienceDetailHtml
      throw new Error(`Unexpected Chitkara fixture URL: ${url}`)
    },
    now: () => '2026-07-14T00:00:00.000Z',
  })

  assert.deepEqual(requests, [
    chitkara.CAREERS_URL,
    'https://careers.chitkara.edu.in/ux-ui-associate-professor/',
    'https://careers.chitkara.edu.in/page/2/',
    'https://careers.chitkara.edu.in/assistant-professor-data-science/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'chitkarauniversity')
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(jobs[1].title, 'Assistant Professor - Data Science')
  assert.equal(jobs[1].city, 'Chandigarh')
  assert.equal(jobs[1].scrapedAt, '2026-07-14T00:00:00.000Z')
})
