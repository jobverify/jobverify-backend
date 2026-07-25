import assert from 'node:assert/strict'
import test from 'node:test'

const loadNexdigmModule = async () => {
  try {
    return await import('../nexdigm/script.js')
  } catch {
    assert.fail('Expected Nexdigm scraper module at ../nexdigm/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Nexdigm</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <h2>Job Search</h2>
      <a href="https://www.nexdigm.com/careers/current-openings/">View All</a>
    </main>
  </body>
</html>
`

const currentOpeningsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Opportunities | Job Openings | Nexdigm</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <div class="result-col">
        <div class="result-heading result-heading3 dgdfg">
          <a href="https://www.nexdigm.com/career-details?id=a69c23b6d80360">Consultant - Bengaluru - Indirect Tax</a>
        </div>
        <div class="result-col2">
          <div class="result-heading2"><span><b>Location City</b></span> <span>Bengaluru</span></div>
          <div class="result-heading2"><span><b>Employee Type</b></span> <span>Consultant</span></div>
          <div class="result-heading2"><span><b>Posted</b></span> <span>4 month(s) ago </span></div>
        </div>
        <div class="result-content">
          <p><span><b>Office Location : </b></span>HM Towers, Bengaluru, Karnataka, India ,<br/></p>
          <p><span><b>Department : </b></span>Indirect Tax</p>
          <div class="tags-area"></div>
        </div>
      </div>
      <div class="result-col">
        <div class="result-heading result-heading3 dgdfg">
          <a href="https://www.nexdigm.com/career-details?id=a6a41fd44cb9e9">Process Specialist - Third Party Risk Assessment &amp; Compliance</a>
        </div>
        <div class="result-col2">
          <div class="result-heading2"><span><b>Location City</b></span> <span>Gurugram</span></div>
          <div class="result-heading2"><span><b>Employee Type</b></span> <span>Permanent</span></div>
          <div class="result-heading2"><span><b>Posted</b></span> <span>18 day(s) ago </span></div>
        </div>
        <div class="result-content">
          <p><span><b>Office Location : </b></span>Udyog Vihar Phase IV, Gurugram, Haryana, India ,<br/></p>
          <p><span><b>Department : </b></span>Contract Management Services</p>
          <div class="tags-area"></div>
        </div>
      </div>
    </main>
  </body>
</html>
`

const consultantDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Details - Nexdigm</title>
  </head>
  <body>
    <h1 class="main-hd" style="display:none;">Career Details</h1>
    <div class="join-container">
      <div class="main-hd result-heading"><a href="#">Consultant - Bengaluru - Indirect Tax</a></div>
      <div class="result-container">
        <div class="result-container-top2 result-container-top3">
          <div class="result-detailarea">
            <div class="detail-col border-left">
              <div class="result-left">Location City</div>
              <div class="result-right">Bengaluru</div>
            </div>
            <div class="detail-col border-left">
              <div class="result-left">Department</div>
              <div class="result-right">Indirect Tax</div>
            </div>
            <div class="detail-col">
              <div class="result-left">Experience</div>
              <div class="result-right">1 - 2 Years</div>
            </div>
            <div class="detail-col border-left">
              <div class="result-left">Salary</div>
              <div class="result-right"> - INR</div>
            </div>
            <div class="detail-col border-left">
              <div class="result-left">Designation</div>
              <div class="result-right">Consultant</div>
            </div>
            <div class="detail-col">
              <div class="result-left">Total Position</div>
              <div class="result-right">1</div>
            </div>
          </div>
          <div class="result-inside result-inside2">
            <div class="result-col">
              <div class="result-detailarea2">
                <div class="result-inside2">
                  <div class="job-title">Employee Type</div>
                  Consultant
                </div>
                <div class="result-inside2">
                  <div class="job-title">Job Description</div>
                  <div>About Us:</div>
                  <div>JOB DESCRIPTION:</div>
                  <div>Manage GST and allied indirect tax compliance for client engagements.</div>
                  <div>Coordinate with clients and internal reviewers on filings and assessments.</div>
                  <div>DESIRED CANDIDATE PROFILE:</div>
                  <div>Strong interest in indirect tax.</div>
                </div>
              </div>
            </div>
          </div>
          <input class="btn" type="button" value="Apply" onclick="apply('https://gene.darwinbox.in/ms/candidate/careers/a69c23b6d80360?apply=1');" />
          <a href="https://www.nexdigm.com/careers/current-openings/">Current Openings</a>
        </div>
      </div>
    </div>
  </body>
</html>
`

const processSpecialistDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Details - Nexdigm</title>
  </head>
  <body>
    <h1 class="main-hd" style="display:none;">Career Details</h1>
    <div class="join-container">
      <div class="main-hd result-heading"><a href="#">Process Specialist - Third Party Risk Assessment &amp; Compliance</a></div>
      <div class="result-container">
        <div class="result-container-top2 result-container-top3">
          <div class="result-detailarea">
            <div class="detail-col border-left">
              <div class="result-left">Location City</div>
              <div class="result-right">Gurugram</div>
            </div>
            <div class="detail-col border-left">
              <div class="result-left">Department</div>
              <div class="result-right">Contract Management Services</div>
            </div>
            <div class="detail-col">
              <div class="result-left">Experience</div>
              <div class="result-right">3 - 5 Years</div>
            </div>
          </div>
          <div class="result-inside result-inside2">
            <div class="result-col">
              <div class="result-detailarea2">
                <div class="result-inside2">
                  <div class="job-title">Employee Type</div>
                  Permanent
                </div>
                <div class="result-inside2">
                  <div class="job-title">Job Description</div>
                  <div>Assess third-party compliance controls and document remediation follow-through.</div>
                  <div>Partner with stakeholders across delivery and governance teams.</div>
                </div>
              </div>
            </div>
          </div>
          <input class="btn" type="button" value="Apply" onclick="apply('https://gene.darwinbox.in/ms/candidate/careers/a6a41fd44cb9e9?apply=1');" />
          <a href="https://www.nexdigm.com/careers/current-openings/">Current Openings</a>
        </div>
      </div>
    </div>
  </body>
</html>
`

test('Nexdigm helpers stay pinned to the verified careers page, current openings page, and redirected detail route', async () => {
  const nexdigm = await loadNexdigmModule()

  assert.equal(nexdigm.SOURCE, 'nexdigm')
  assert.equal(nexdigm.COMPANY, 'Nexdigm')
  assert.equal(nexdigm.VERIFIED_ON, '2026-07-16')
  assert.equal(nexdigm.HOMEPAGE_URL, 'https://www.nexdigm.com/')
  assert.equal(nexdigm.CAREERS_URL, 'https://www.nexdigm.com/careers/')
  assert.equal(
    nexdigm.CURRENT_OPENINGS_URL,
    'https://www.nexdigm.com/careers/current-openings/',
  )
  assert.equal(
    nexdigm.CAREER_DETAILS_BASE_URL,
    'https://www.nexdigm.com/careers/career-details/',
  )
  assert.equal(nexdigm.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(nexdigm.hasCurrentOpeningsSignal(currentOpeningsHtml), true)
  assert.equal(
    nexdigm.extractCurrentOpeningsUrl(careersHtml),
    'https://www.nexdigm.com/careers/current-openings/',
  )
  assert.equal(
    nexdigm.normalizeDetailUrl('https://www.nexdigm.com/career-details?id=a69c23b6d80360'),
    'https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360',
  )
})

test('extractListings parses the visible Nexdigm current openings page into conservative detail listings', async () => {
  const nexdigm = await loadNexdigmModule()
  const listings = nexdigm.extractListings(currentOpeningsHtml)

  assert.equal(listings.length, 2)
  assert.deepEqual(listings[0], {
    title: 'Consultant - Bengaluru - Indirect Tax',
    company: 'Nexdigm',
    department: 'Indirect Tax',
    location: 'HM Towers, Bengaluru, Karnataka, India',
    city: 'Bangalore',
    locations: ['HM Towers, Bengaluru, Karnataka, India'],
    sourceUrl: 'https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360',
    applyUrl: 'https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360',
    jobId: 'a69c23b6d80360',
    requisitionId: 'a69c23b6d80360',
    employmentType: 'Consultant',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '4 month(s) ago',
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
  })
})

test('extractJobDetail lifts Nexdigm detail fields and the public Darwinbox apply target conservatively', async () => {
  const nexdigm = await loadNexdigmModule()
  const listing = nexdigm.extractListings(currentOpeningsHtml)[0]
  const job = nexdigm.extractJobDetail(consultantDetailHtml, listing)

  assert.deepEqual(job, {
    title: 'Consultant - Bengaluru - Indirect Tax',
    company: 'Nexdigm',
    department: 'Indirect Tax',
    location: 'HM Towers, Bengaluru, Karnataka, India',
    city: 'Bangalore',
    locations: ['HM Towers, Bengaluru, Karnataka, India'],
    sourceUrl: 'https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360',
    applyUrl: 'https://gene.darwinbox.in/ms/candidate/careers/a69c23b6d80360?apply=1',
    jobId: 'a69c23b6d80360',
    requisitionId: 'a69c23b6d80360',
    employmentType: 'Consultant',
    experienceRequired: '1 - 2 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '4 month(s) ago',
    closingDate: null,
    jobDescription:
      'About Us: JOB DESCRIPTION: Manage GST and allied indirect tax compliance for client engagements. Coordinate with clients and internal reviewers on filings and assessments. DESIRED CANDIDATE PROFILE: Strong interest in indirect tax.',
    remoteStatus: 'On-site',
  })
})

test('run validates the verified Nexdigm careers surfaces and enriches listings with first-party detail pages', async () => {
  const nexdigm = await loadNexdigmModule()
  const requestedUrls = []

  const jobs = await nexdigm.createNexdigmScraper({
    now: () => '2026-07-16T12:30:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === nexdigm.CAREERS_URL) return careersHtml
      if (url === nexdigm.CURRENT_OPENINGS_URL) return currentOpeningsHtml
      if (url === 'https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360') {
        return consultantDetailHtml
      }
      if (url === 'https://www.nexdigm.com/careers/career-details/?id=a6a41fd44cb9e9') {
        return processSpecialistDetailHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.nexdigm.com/careers/',
    'https://www.nexdigm.com/careers/current-openings/',
    'https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360',
    'https://www.nexdigm.com/careers/career-details/?id=a6a41fd44cb9e9',
  ])

  assert.deepEqual(jobs, [
    {
      jobId: 'a69c23b6d80360',
      requisitionId: 'a69c23b6d80360',
      title: 'Consultant - Bengaluru - Indirect Tax',
      company: 'Nexdigm',
      department: 'Indirect Tax',
      location: 'HM Towers, Bengaluru, Karnataka, India',
      city: 'Bangalore',
      locations: ['HM Towers, Bengaluru, Karnataka, India'],
      link: 'https://gene.darwinbox.in/ms/candidate/careers/a69c23b6d80360?apply=1',
      applyUrl: 'https://gene.darwinbox.in/ms/candidate/careers/a69c23b6d80360?apply=1',
      sourceUrl: 'https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360',
      source: 'nexdigm',
      employmentType: 'Consultant',
      experienceRequired: '1 - 2 Years',
      jobDescription:
        'About Us: JOB DESCRIPTION: Manage GST and allied indirect tax compliance for client engagements. Coordinate with clients and internal reviewers on filings and assessments. DESIRED CANDIDATE PROFILE: Strong interest in indirect tax.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '4 month(s) ago',
      closingDate: null,
      remoteStatus: 'On-site',
      scrapedAt: '2026-07-16T12:30:00.000Z',
    },
    {
      jobId: 'a6a41fd44cb9e9',
      requisitionId: 'a6a41fd44cb9e9',
      title: 'Process Specialist - Third Party Risk Assessment & Compliance',
      company: 'Nexdigm',
      department: 'Contract Management Services',
      location: 'Udyog Vihar Phase IV, Gurugram, Haryana, India',
      city: 'Gurgaon',
      locations: ['Udyog Vihar Phase IV, Gurugram, Haryana, India'],
      link: 'https://gene.darwinbox.in/ms/candidate/careers/a6a41fd44cb9e9?apply=1',
      applyUrl: 'https://gene.darwinbox.in/ms/candidate/careers/a6a41fd44cb9e9?apply=1',
      sourceUrl: 'https://www.nexdigm.com/careers/career-details/?id=a6a41fd44cb9e9',
      source: 'nexdigm',
      employmentType: 'Permanent',
      experienceRequired: '3 - 5 Years',
      jobDescription:
        'Assess third-party compliance controls and document remediation follow-through. Partner with stakeholders across delivery and governance teams.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '18 day(s) ago',
      closingDate: null,
      remoteStatus: 'On-site',
      scrapedAt: '2026-07-16T12:30:00.000Z',
    },
  ])
})

test('run fails closed when the verified Nexdigm careers surfaces drift materially', async () => {
  const nexdigm = await loadNexdigmModule()

  await assert.rejects(
    nexdigm.createNexdigmScraper().run({
      fetchText: async (url) => {
        if (url === nexdigm.CAREERS_URL) {
          return '<html><body><h1>Careers</h1><a href="/apply">Apply</a></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified careers page no longer matches/i,
  )

  await assert.rejects(
    nexdigm.createNexdigmScraper().run({
      fetchText: async (url) => {
        if (url === nexdigm.CAREERS_URL) return careersHtml
        if (url === nexdigm.CURRENT_OPENINGS_URL) {
          return '<html><body><h1>Current Openings</h1><p>No cards.</p></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified current openings page no longer matches/i,
  )
})
