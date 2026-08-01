import assert from 'node:assert/strict'
import test from 'node:test'

const loadQuantboxResearchModule = async () => import('../../scraper/quantboxresearch/script.js')

const homepageHtml = `
<!doctype html>
<html lang="en" class="home_page">
  <head>
    <title class="s123-js-pjax">Quantbox Research</title>
    <link rel="canonical" href="https://www.quantboxresearch.com/" class="s123-js-pjax">
  </head>
  <body>
    <section
      id="section-5fa761ff93b2f"
      class="s123-module s123-module-jobs"
      data-module-type="jobs"
    >
      <h2 id="section-5fa761ff93b2f-title" class="s123-page-header">Jobs</h2>
      <div class="job-item" data-unique-id="5fa761ff76460">
        <h4 class="job-title">
          <a href="/jobs/software-developer">Software Developer</a>
        </h4>
        <div class="job-sub-title">
          <span class="section_small_text">Bangalore, Karnataka, India</span>
          -
          <span class="section_small_text">SD-01</span>
        </div>
        <div class="responsive-handler fr-view breakable box-text-primary main-description-text">
          Quantbox is a technology-driven Proprietary trading firm.
          <br>
          We are looking for a Software Developer for our Core Engineering group.
          <br>
          Quantbox is an equal opportunity employer.
        </div>
        <div class="panel-group">
          <div class="panel">
            <div class="heading">
              <span class="panel-title">Requirements</span>
            </div>
            <div class="panel-body responsive-handler fr-view breakable box-primary box-text-primary">
              Quantbox encourages bachelor's, or master's in computer science/mathematics and related fields to apply.
              <ul>
                <li>Excellent Software Development knowledge demonstrated through course work</li>
                <li>Proficiency in C++, object oriented design, GDB</li>
                <li>Experience with Linux/Unix</li>
              </ul>
            </div>
          </div>
          <div class="panel">
            <div class="heading">
              <span class="panel-title">Responsibilities</span>
            </div>
            <div class="panel-body responsive-handler fr-view breakable box-primary box-text-primary">
              Day-to-day work includes:
              <ul>
                <li>Designing, developing, and testing proprietary software</li>
                <li>Collaboration with quantitative traders and researchers</li>
              </ul>
            </div>
          </div>
        </div>
        <a class="jobsApplyBtn btn btn-primary" data-application-id="1">Apply Now</a>
      </div>

      <div class="job-item" data-unique-id="5fa761ff7f9dd">
        <h4 class="job-title">
          <a href="/jobs/quantitative-researcher-quant-trader">Quantitative Researcher / Quant Trader</a>
        </h4>
        <div class="job-sub-title">
          <span class="section_small_text">Singapore</span>
          -
          <span class="section_small_text">QT-02</span>
        </div>
        <div class="responsive-handler fr-view breakable box-text-primary main-description-text">
          Quantbox is a technology-driven Proprietary trading firm.
        </div>
        <div class="panel-group">
          <div class="panel">
            <div class="heading">
              <span class="panel-title">Requirements</span>
            </div>
            <div class="panel-body responsive-handler fr-view breakable box-primary box-text-primary">
              <ul>
                <li>Deep experience in HF Trading</li>
              </ul>
            </div>
          </div>
        </div>
        <a class="jobsApplyBtn btn btn-primary" data-application-id="2">Apply Now</a>
      </div>

      <div class="job-item" data-unique-id="5fa7906c2c6b7">
        <h4 class="job-title">
          <a href="/jobs/campus-hiring-junior-quantitative-research">Campus Hiring- Junior Quantitative Research</a>
        </h4>
        <div class="job-sub-title">
          <span class="section_small_text">Bangalore, Karnataka, India</span>
          -
          <span class="section_small_text">QT-03</span>
        </div>
        <div class="responsive-handler fr-view breakable box-text-primary main-description-text">
          Quantbox is a technology-driven Proprietary trading firm.
          <br>
          We are looking to appoint a Junior Quantitative Researcher/Trader.
          <br>
          Quantbox is an equal opportunity employer.
        </div>
        <div class="panel-group">
          <div class="panel">
            <div class="heading">
              <span class="panel-title">Requirements</span>
            </div>
            <div class="panel-body responsive-handler fr-view breakable box-primary box-text-primary">
              What you'll need:
              <ul>
                <li>You possess a bachelor's degree / Phd in mathematics, computer science, statistics, physics, or a related field</li>
                <li>Ability to think independently and use creative approach in problem solving</li>
                <li>Familiarity with python, C++, R programming languages</li>
              </ul>
            </div>
          </div>
        </div>
        <a class="jobsApplyBtn btn btn-primary" data-application-id="3">Apply Now</a>
      </div>
    </section>
  </body>
</html>
`

test('Quantbox Research validates the official first-party jobs homepage and extracts the public role cards', async () => {
  const quantboxResearch = await loadQuantboxResearchModule()

  assert.equal(quantboxResearch.CAREERS_URL, 'https://www.quantboxresearch.com/')
  assert.equal(quantboxResearch.hasOfficialCareersSignal(homepageHtml), true)
  assert.equal(quantboxResearch.hasOfficialCareersSignal('<html><body><h1>Jobs</h1></body></html>'), false)

  const jobs = quantboxResearch.extractJobCards(homepageHtml)

  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Software Developer',
    company: 'Quantbox Research',
    department: null,
    location: 'Bangalore, Karnataka, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'SD-01',
    requisitionId: 'SD-01',
    sourceUrl: 'https://www.quantboxresearch.com/jobs/software-developer',
    applyUrl: 'https://www.quantboxresearch.com/jobs/software-developer',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Excellent Software Development knowledge demonstrated through course work',
      'Proficiency in C++, object oriented design, GDB',
      'Experience with Linux/Unix',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Quantbox is a technology-driven Proprietary trading firm. We are looking for a Software Developer for our Core Engineering group. Quantbox is an equal opportunity employer. Requirements Quantbox encourages bachelor\'s, or master\'s in computer science/mathematics and related fields to apply. Excellent Software Development knowledge demonstrated through course work Proficiency in C++, object oriented design, GDB Experience with Linux/Unix Responsibilities Day-to-day work includes: Designing, developing, and testing proprietary software Collaboration with quantitative traders and researchers',
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].location, 'Singapore')
  assert.equal(jobs[2].jobId, 'QT-03')
})

test('Quantbox Research run returns only India jobs from the verified first-party public surface', async () => {
  const quantboxResearch = await loadQuantboxResearchModule()
  const requestedUrls = []

  const jobs = await quantboxResearch.createQuantboxResearchScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, quantboxResearch.CAREERS_URL)
      return homepageHtml
    },
  })

  assert.deepEqual(requestedUrls, [quantboxResearch.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => job.jobId), ['SD-01', 'QT-03'])
  assert.equal(jobs[0].source, 'quantboxresearch')
  assert.equal(jobs[0].link, 'https://www.quantboxresearch.com/jobs/software-developer')
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})

test('Quantbox Research fails closed when the verified homepage shell loses identity or no longer exposes public role cards', async () => {
  const quantboxResearch = await loadQuantboxResearchModule()

  await assert.rejects(
    quantboxResearch.createQuantboxResearchScraper().run({
      fetchText: async () => '<html><body><h1>Quantbox</h1></body></html>',
    }),
    /Quantbox Research homepage no longer matches the verified first-party public jobs surface/i,
  )

  await assert.rejects(
    quantboxResearch.createQuantboxResearchScraper().run({
      fetchText: async () => `
        <html>
          <head>
            <title>Quantbox Research</title>
            <link rel="canonical" href="https://www.quantboxresearch.com/">
          </head>
          <body>
            <section class="s123-module s123-module-jobs" data-module-type="jobs">
              <h2 class="s123-page-header">Jobs</h2>
            </section>
            <p>No openings listed right now.</p>
          </body>
        </html>
      `,
    }),
    /Quantbox Research homepage no longer exposes the verified public job cards/i,
  )
})
