import assert from 'node:assert/strict'
import test from 'node:test'

const loadSolitonModule = async () => {
  try {
    return await import('../../scraper/solitontechnologies/script.js')
  } catch {
    assert.fail('Expected Soliton Technologies scraper module at ../../scraper/solitontechnologies/script.js')
  }
}

const listingHtml = `
  <html>
    <head>
      <title>Job Openings | Soliton Technologies | Apply Now</title>
    </head>
    <body>
      <h2>CAREER OPPORTUNITIES WITH SOLITON</h2>
      <div class="job-card">
        <h4>Senior Embedded Engineer</h4>
        <p>We are looking for a Senior Embedded Engineer with 3-5 years of experience to design and develop embedded software.</p>
        <a href="https://www.solitontech.com/jobs/senior-embedded-engineer/">VIEW JOB DETAILS</a>
      </div>
      <div class="job-card">
        <h4>Senior Project Engineer - Python</h4>
        <p>Design and implement software for multiple platforms.</p>
        <a href="/jobs/senior-project-engineer-python/">VIEW JOB DETAILS</a>
      </div>
    </body>
  </html>
`

const currentListingHtml = `
  <html>
    <head>
      <title>Careers | Soliton Technologies</title>
    </head>
    <body>
      <p>Careers at Soliton</p>
      <a href="#open-positions">View open positions →</a>
      <h3>Open Positions Available</h3>
      <p>We are always in need of passionate individuals who seek learning and growth.</p>
      <h3>Information Technology</h3>
      <div class="op-grid">
        <div class="op-card">
          <h4>System Administrator – Applications</h4>
          <a href="/careers/159">Apply →</a>
        </div>
        <div class="op-card">
          <h4>System Administrator – Support</h4>
          <a href="/careers/160">Apply →</a>
        </div>
      </div>
      <h3>Engineering</h3>
      <div class="op-grid">
        <div class="op-card">
          <h4>Senior Embedded Engineer</h4>
          <a href="/careers/154">Apply →</a>
        </div>
      </div>
    </body>
  </html>
`

const detailHtml = `
  <html>
    <head>
      <title>Senior Embedded Engineer | Soliton Technologies</title>
    </head>
    <body>
      <h1>Senior Embedded Engineer</h1>
      <h4>Summary:</h4>
      <p>We are looking for a Senior Embedded Engineer with 3-5 years of experience to design and develop embedded software/firmware for IOT and Robotic solutions.</p>
      <h4>Key Responsibilities:</h4>
      <ul>
        <li>Design and develop embedded firmware using Embedded C/C++.</li>
        <li>Develop and integrate communication interfaces like UART, SPI, I2C, USB, PCIe, Ethernet.</li>
      </ul>
      <h4>Qualification:</h4>
      <ul>
        <li>Strong programming skills in Embedded C/C++/Python.</li>
        <li>Working Experience with Linux/RTOS.</li>
      </ul>
      <h4>Additional Details:</h4>
      <ul>
        <li>Work Location (Bangalore/Coimbatore/Chennai): This role will require working from the office for the first 12 months.</li>
      </ul>
      <div class="apply"><button>APPLY NOW</button></div>
    </body>
  </html>
`

const currentDetailHtml = `
  <html>
    <head>
      <title>System Administrator – Applications | Soliton Careers | Soliton Technologies</title>
      <meta name="description" content="Information Technology · Full Time" />
    </head>
    <body>
      <section class="jd-hero">
        <a class="jd-breadcrumb" href="/careers#open-positions">← Back to Careers</a>
        <h1 class="jd-title">System Administrator – Applications</h1>
        <div class="jd-meta-row">
          <span class="jd-chip">Information Technology</span>
          <span class="jd-chip">Full Time</span>
        </div>
        <button type="button" disabled="" class="jd-apply-hero">Apply for this role →</button>
      </section>
      <div class="jd-prose">
        <h4><strong>Summary:</strong></h4>
        <p>A mix of two things: helping with everyday IT support and looking after some of the internal tools and applications the company uses.</p>
        <h4><strong>Position Overview: </strong></h4>
        <p>This role sits within the IT team and covers two areas: supporting employees with their everyday tech needs and keeping the company's internal tools and applications in good shape.</p>
        <h4><strong>Key Responsibilities: </strong></h4>
        <ul>
          <li><p>Split time between general IT support and managing internal applications.</p></li>
          <li><p>Write simple scripts to automate repetitive tasks.</p></li>
        </ul>
        <h4><strong>Qualification : </strong></h4>
        <ul>
          <li><p>Diploma, BCA, B.Sc., or B.E. (Postgraduate candidates will not be considered.)</p></li>
        </ul>
        <h4><strong>Additional Details: </strong></h4>
        <ul>
          <li><p>Work Location (Bangalore/Coimbatore): This role will require working from the office (WFO).</p></li>
        </ul>
      </div>
      <aside class="jd-sidebar-card">
        <span class="jd-sidebar-label">Department</span><span class="jd-sidebar-value">Information Technology</span>
        <span class="jd-sidebar-label">Job Type</span><span class="jd-sidebar-value">Full Time</span>
      </aside>
    </body>
  </html>
`

test('Soliton Technologies validates the official careers surface and extracts public detail links', async () => {
  const soliton = await loadSolitonModule()

  assert.equal(soliton.CAREER_PAGE_URL, 'https://www.solitontech.com/careers')
  assert.equal(typeof soliton.hasOfficialCareersSignal, 'function')
  assert.equal(typeof soliton.extractListings, 'function')
  assert.equal(typeof soliton.extractJobDetail, 'function')
  assert.equal(typeof soliton.createSolitonTechnologiesScraper, 'function')
  assert.equal(typeof soliton.run, 'function')

  assert.equal(soliton.hasOfficialCareersSignal(listingHtml), true)
  assert.equal(soliton.hasOfficialCareersSignal(currentListingHtml), true)

  assert.deepEqual(soliton.extractListings(listingHtml), [
    {
      title: 'Senior Embedded Engineer',
      company: 'Soliton Technologies',
      department: null,
      jobId: 'senior-embedded-engineer',
      requisitionId: 'senior-embedded-engineer',
      sourceUrl: 'https://www.solitontech.com/jobs/senior-embedded-engineer/',
      applyUrl: 'https://www.solitontech.com/jobs/senior-embedded-engineer/',
      jobDescription: 'We are looking for a Senior Embedded Engineer with 3-5 years of experience to design and develop embedded software.',
    },
    {
      title: 'Senior Project Engineer - Python',
      company: 'Soliton Technologies',
      department: null,
      jobId: 'senior-project-engineer-python',
      requisitionId: 'senior-project-engineer-python',
      sourceUrl: 'https://www.solitontech.com/jobs/senior-project-engineer-python/',
      applyUrl: 'https://www.solitontech.com/jobs/senior-project-engineer-python/',
      jobDescription: 'Design and implement software for multiple platforms.',
    },
  ])

  assert.deepEqual(soliton.extractListings(currentListingHtml), [
    {
      title: 'System Administrator – Applications',
      company: 'Soliton Technologies',
      department: 'Information Technology',
      jobId: '159',
      requisitionId: '159',
      sourceUrl: 'https://www.solitontech.com/careers/159',
      applyUrl: 'https://www.solitontech.com/careers/159',
      jobDescription: null,
    },
    {
      title: 'System Administrator – Support',
      company: 'Soliton Technologies',
      department: 'Information Technology',
      jobId: '160',
      requisitionId: '160',
      sourceUrl: 'https://www.solitontech.com/careers/160',
      applyUrl: 'https://www.solitontech.com/careers/160',
      jobDescription: null,
    },
    {
      title: 'Senior Embedded Engineer',
      company: 'Soliton Technologies',
      department: 'Engineering',
      jobId: '154',
      requisitionId: '154',
      sourceUrl: 'https://www.solitontech.com/careers/154',
      applyUrl: 'https://www.solitontech.com/careers/154',
      jobDescription: null,
    },
  ])
})

test('extractJobDetail maps Soliton detail pages into shared scraper fields', async () => {
  const soliton = await loadSolitonModule()

  const listing = soliton.extractListings(listingHtml)[0]
  const detail = soliton.extractJobDetail(detailHtml, listing)

  assert.equal(detail.title, 'Senior Embedded Engineer')
  assert.equal(detail.company, 'Soliton Technologies')
  assert.equal(detail.location, 'Bangalore/Coimbatore/Chennai, India')
  assert.equal(detail.city, 'Bangalore')
  assert.equal(detail.country, 'India')
  assert.equal(detail.applyUrl, 'https://www.solitontech.com/jobs/senior-embedded-engineer/')
  assert.equal(detail.experienceRequired, '3-5 years')
  assert.match(detail.jobDescription, /embedded firmware using Embedded C\/C\+\+/i)
  assert.match(detail.jobDescription, /UART, SPI, I2C, USB, PCIe, Ethernet/i)
  assert.equal(detail.minimumQualification, 'Strong programming skills in Embedded C/C++/Python.')

  const currentDetail = soliton.extractJobDetail(currentDetailHtml, {
    title: 'System Administrator – Applications',
    company: 'Soliton Technologies',
    department: 'Information Technology',
    jobId: '159',
    requisitionId: '159',
    sourceUrl: 'https://www.solitontech.com/careers/159',
    applyUrl: 'https://www.solitontech.com/careers/159',
    jobDescription: null,
  })

  assert.equal(currentDetail.title, 'System Administrator – Applications')
  assert.equal(currentDetail.department, 'Information Technology')
  assert.equal(currentDetail.employmentType, 'Full Time')
  assert.equal(currentDetail.location, 'Bangalore/Coimbatore, India')
  assert.equal(currentDetail.city, 'Bangalore')
  assert.equal(currentDetail.applyUrl, 'https://www.solitontech.com/careers/159')
  assert.match(currentDetail.jobDescription, /supporting employees with their everyday tech needs/i)
  assert.match(currentDetail.jobDescription, /Write simple scripts to automate repetitive tasks/i)
  assert.equal(
    currentDetail.minimumQualification,
    'Diploma, BCA, B.Sc., or B.E. (Postgraduate candidates will not be considered.)',
  )
})

test('run fetches Soliton listing and detail pages and decorates runner fields', async () => {
  const soliton = await loadSolitonModule()
  const requestedUrls = []

  const jobs = await soliton.createSolitonTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === soliton.CAREER_PAGE_URL) return currentListingHtml
      if (url === 'https://www.solitontech.com/careers/159') return currentDetailHtml
      if (url === 'https://www.solitontech.com/careers/160') return currentDetailHtml
        .replaceAll('System Administrator – Applications', 'System Administrator – Support')
      if (url === 'https://www.solitontech.com/careers/154') return currentDetailHtml
        .replaceAll('System Administrator – Applications', 'Senior Embedded Engineer')
        .replaceAll('Information Technology', 'Engineering')

      throw new Error(`Unexpected Soliton URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.solitontech.com/careers',
    'https://www.solitontech.com/careers/159',
    'https://www.solitontech.com/careers/160',
    'https://www.solitontech.com/careers/154',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'solitontechnologies')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('run fails closed when the Soliton official careers surface changes', async () => {
  const soliton = await loadSolitonModule()

  await assert.rejects(
    () => soliton.createSolitonTechnologiesScraper().run({
      fetchText: async () => '<html><body>No job board here</body></html>',
    }),
    /Soliton official careers surface changed/i,
  )
})
