import assert from 'node:assert/strict'
import test from 'node:test'

const loadPanaceaModule = async () => {
  try {
    return await import('../panaceamedicaltechnologiespvtltd/script.js')
  } catch {
    assert.fail(
      'Expected Panacea Medical Technologies scraper module at ../panaceamedicaltechnologiespvtltd/script.js',
    )
  }
}

const homepageHtml = `
  <html>
    <head>
      <title>Panacea</title>
    </head>
    <body>
      <nav>
        <a href="https://www.panaceamedical.in/life-at-pmt/">Life at PMT</a>
        <a href="https://www.panaceamedical.in/join-us/">Join Us</a>
      </nav>
      <main>
        <h1>Since 1999... Defeating Cancer</h1>
        <p>
          Panacea Medical Technologies Pvt. Ltd. is a technology centric company which manufactures top
          notch medical equipment to meet the needs of today’s radiotherapy and radiology centres.
        </p>
        <p>Copyright © 2026 Panacea Medical Technologies Pvt. Ltd. All Rights Reserved.</p>
      </main>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head>
      <title>Join Us - Panacea</title>
    </head>
    <body>
      <h2>
        Kindly send an email mentioning your Name, Contact Number, Job Position along with your resume attached to
      </h2>
      <a href="mailto:careers@panaceamedical.com">careers@panaceamedical.com</a>
      <div class="eael-adv-accordion">
        <div class="eael-accordion-list">
          <div
            id="pmt-2026-27-001-electrical-testing-engineer"
            class="elementor-tab-title eael-accordion-header"
          >
            <span class="eael-accordion-tab-title">PMT_2026-27-001 : Electrical testing Engineer</span>
          </div>
          <div class="eael-accordion-content clearfix">
            <p>Job Code : PMT_2026-27-001</p>
            <p>Job Position : 10</p>
            <p>Qualification : BE / B Tech / M Tech in Electrical &amp; Electronics Engineering / Electrical Engineering</p>
            <p>Location : Malur (Kolar District) 25 Km from Bangalore</p>
            <p>Experience : 0 to 3 years</p>
            <p>Job Function, Key Responsibilities and Duties :</p>
            <ul>
              <li>PCB assembly</li>
              <li>Quality Verification</li>
              <li>Unit Assembly Testing</li>
            </ul>
          </div>
        </div>
        <div class="eael-accordion-list">
          <div
            id="pmt-2026-27-013-financial-controller"
            class="elementor-tab-title eael-accordion-header"
          >
            <span class="eael-accordion-tab-title">PMT_2026-27-013 : Financial Controller</span>
          </div>
          <div class="eael-accordion-content clearfix">
            <p>Job Code : PMT_2026-27-013</p>
            <p>Job Position : 1</p>
            <p>Qualification : CA</p>
            <p>Location : Whitefield - Bangalore / Malur (Kolar District) 25 Km from Bangalore</p>
            <p>Experience : Post CA 2.5 Years in financial planning &amp; analysis and significant experience in Accounting, Finance, Commercial &amp; taxation roles.</p>
            <p>Job Function, Key Responsibilities and Duties :</p>
            <p><strong>Accountabilities</strong></p>
            <ul>
              <li>Proactive management of the P&amp;L, in partnership with the Founders and Commercial teams.</li>
              <li>Lead the core Business Performance &amp; Analysis (BPA) processes.</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
  </html>
`

test('Panacea scraper validates the verified homepage and Join Us surface', async () => {
  const panacea = await loadPanaceaModule()

  assert.equal(panacea.SOURCE, 'panaceamedicaltechnologiespvtltd')
  assert.equal(panacea.COMPANY, 'Panacea Medical Technologies Pvt. Ltd.')
  assert.equal(panacea.HOMEPAGE_URL, 'https://www.panaceamedical.in/')
  assert.equal(panacea.CAREERS_URL, 'https://www.panaceamedical.in/join-us/')
  assert.equal(panacea.APPLY_URL, 'mailto:careers@panaceamedical.com')
  assert.equal(panacea.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(panacea.hasOfficialCareersSignal(careersHtml), true)
})

test('extractPublicJobs normalizes Panacea inline accordion postings into shared job fields', async () => {
  const panacea = await loadPanaceaModule()
  const jobs = panacea.extractPublicJobs(careersHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Electrical testing Engineer',
    company: 'Panacea Medical Technologies Pvt. Ltd.',
    department: null,
    location: 'Malur (Kolar District) 25 Km from Bangalore',
    city: 'Malur',
    state: null,
    country: 'India',
    jobId: 'PMT_2026-27-001',
    requisitionId: 'PMT_2026-27-001',
    sourceUrl: 'https://www.panaceamedical.in/join-us/#pmt-2026-27-001-electrical-testing-engineer',
    applyUrl: 'mailto:careers@panaceamedical.com',
    employmentType: null,
    experienceRequired: '0 to 3 years',
    minimumQualification: 'BE / B Tech / M Tech in Electrical & Electronics Engineering / Electrical Engineering',
    preferredQualification: null,
    requiredSkills: [
      'PCB assembly',
      'Quality Verification',
      'Unit Assembly Testing',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'PCB assembly Quality Verification Unit Assembly Testing',
  })

  assert.equal(jobs[1].title, 'Financial Controller')
  assert.equal(jobs[1].jobId, 'PMT_2026-27-013')
  assert.equal(jobs[1].city, null)
  assert.equal(jobs[1].applyUrl, 'mailto:careers@panaceamedical.com')
  assert.match(jobs[1].jobDescription, /Accountabilities/i)
})

test('run fetches the homepage and Join Us page, then decorates Panacea jobs with scraper metadata', async () => {
  const panacea = await loadPanaceaModule()
  const requestedUrls = []

  const jobs = await panacea.createPanaceaMedicalTechnologiesScraper({
    now: () => '2026-07-11T03:45:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === panacea.HOMEPAGE_URL) return homepageHtml
      if (url === panacea.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    panacea.HOMEPAGE_URL,
    panacea.CAREERS_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'panaceamedicaltechnologiespvtltd')
  assert.equal(
    jobs[0].link,
    'mailto:careers@panaceamedical.com',
  )
  assert.equal(jobs[0].companyCareerPage, 'https://www.panaceamedical.in/join-us/')
  assert.equal(jobs[0].companyDomain, 'panaceamedical.in')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T03:45:00.000Z')

  await assert.rejects(
    panacea.createPanaceaMedicalTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === panacea.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected homepage</h1></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    panacea.createPanaceaMedicalTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === panacea.HOMEPAGE_URL) return homepageHtml
        if (url === panacea.CAREERS_URL) {
          return `
            <html>
              <body>
                <h2>Kindly send an email mentioning your Name</h2>
                <p>No structured jobs here anymore.</p>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /Join Us page|job cards/i,
  )
})
