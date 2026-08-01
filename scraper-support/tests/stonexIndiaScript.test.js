import assert from 'node:assert/strict'
import test from 'node:test'

const CAREER_PAGE_URL = 'https://www.stonex.com/en/about/careers/jobs/'
const DETAIL_URL = 'https://english-stonex.icims.com/jobs/15423/senior---uat-analyst/job'
const DETAIL_FETCH_URL = `${DETAIL_URL}?in_iframe=1`
const APPLY_URL = 'https://english-stonex.icims.com/jobs/15423/senior---uat-analyst/job?apply=yes&hashed=-1834414340&mode=apply'

const listingHtml = `
  <html>
    <head>
      <title>Careers | StoneX</title>
      <meta name="description" content="Explore jobs at StoneX" />
    </head>
    <body>
      <main>
        <section class="jobs-feed">
          <article class="job-card">
            <a class="job-card__title" href="https://english-stonex.icims.com/jobs/15423/senior---uat-analyst/job">
              Senior - UAT Analyst
            </a>
            <div class="job-card__location">IN-Bangalore</div>
            <div class="job-card__req">Req ID: 2026-15423</div>
            <p class="job-card__summary">Work closely with business teams to validate payment workflows.</p>
            <div class="job-card__category">Operations</div>
            <div class="job-card__type">Experienced Professional</div>
          </article>

          <article class="job-card">
            <a class="job-card__title" href="/jobs/88888/senior-payment-analyst/job">
              Senior Payment Analyst
            </a>
            <div class="job-card__location">US-New York</div>
            <div class="job-card__req">Req ID: 2026-88888</div>
            <p class="job-card__summary">Ignore this non-India role.</p>
            <div class="job-card__category">Operations</div>
            <div class="job-card__type">Experienced Professional</div>
          </article>
        </section>
      </main>
    </body>
  </html>
`

const detailHtml = `
  <html>
    <body>
      <div class="iCIMS_JobContainer">
        <div class="iCIMS_JobContent">
          <div class="container-fluid iCIMS_JobsTable">
            <div class="row">
              <div class="col-xs-12 title">
                <div id="iCIMS_Header" tabindex="-1">
                  <h1 class="iCIMS_Header">Senior - UAT Analyst</h1>
                </div>
              </div>
              <div class="col-xs-6 header left">
                <span class="sr-only field-label">Job Locations</span>
                <span>IN-Bangalore</span>
              </div>
              <div class="col-xs-6 header right">
                <span class="sr-only field-label">Requisition ID</span>
                <span>2026-15423</span>
              </div>
              <div class="col-xs-12 additionalFields">
                <dl class="iCIMS_JobHeaderGroup">
                  <div class="iCIMS_JobHeaderTag">
                    <dt class="iCIMS_JobHeaderField">Category (Portal Searching)</dt>
                    <dd class="iCIMS_JobHeaderData"><span>Operations</span></dd>
                  </div>
                  <div class="iCIMS_JobHeaderTag">
                    <dt class="iCIMS_JobHeaderField">Position Type (Portal Searching)</dt>
                    <dd class="iCIMS_JobHeaderData"><span>Experienced Professional</span></dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview</h2>
          <div class="iCIMS_InfoMsg iCIMS_InfoMsg_Job">
            <div class="iCIMS_Expandable_Container">
              <div class="iCIMS_Expandable_Text">
                <p>Connecting clients to markets and talent to opportunity.</p>
              </div>
            </div>
          </div>

          <h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Responsibilities</h2>
          <div class="iCIMS_InfoMsg iCIMS_InfoMsg_Job">
            <div class="iCIMS_Expandable_Container">
              <div class="iCIMS_Expandable_Text">
                <ul>
                  <li>Lead user acceptance testing for payment products.</li>
                  <li>Coordinate defect triage with engineering and business teams.</li>
                </ul>
              </div>
            </div>
          </div>

          <h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Qualifications</h2>
          <div class="iCIMS_InfoMsg iCIMS_InfoMsg_Job">
            <div class="iCIMS_Expandable_Container">
              <div class="iCIMS_Expandable_Text">
                <ul>
                  <li>Payments domain experience</li>
                  <li>Project Management qualification</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="iCIMS_JobOptions">
            <a
              href="https://english-stonex.icims.com/jobs/15423/senior---uat-analyst/job?mode=apply&apply=yes&in_iframe=1&hashed=-1834414340"
              class="iCIMS_Anchor iCIMS_Action_Button iCIMS_ApplyOnlineButton iCIMS_PrimaryButton"
              title="Apply for this job online"
            >
              Apply for this job online
            </a>
          </div>
        </div>
      </div>
    </body>
  </html>
`

const loadStoneXIndiaModule = async () => {
  try {
    return await import('../../scraper/stonexindia/script.js')
  } catch {
    assert.fail('Expected StoneX India scraper module at ../../scraper/stonexindia/script.js')
  }
}

test('buildCareerPageUrl and detail helpers stay on the official StoneX India surfaces', async () => {
  const stoneXIndia = await loadStoneXIndiaModule()

  assert.equal(stoneXIndia.CAREER_PAGE_URL, CAREER_PAGE_URL)
  assert.equal(stoneXIndia.ICIMS_HOST, 'https://english-stonex.icims.com')
  assert.equal(stoneXIndia.buildCareerPageUrl(), CAREER_PAGE_URL)
  assert.equal(
    stoneXIndia.buildDetailUrl({ jobId: '15423', slug: 'senior---uat-analyst' }),
    DETAIL_URL,
  )
  assert.equal(
    stoneXIndia.buildDetailFetchUrl({ jobId: '15423', slug: 'senior---uat-analyst' }),
    DETAIL_FETCH_URL,
  )
  assert.equal(stoneXIndia.hasOfficialJobsPageSignal(listingHtml), true)
  assert.equal(stoneXIndia.hasOfficialJobsPageSignal('<html><title>Other Company Jobs</title></html>'), false)
})

test('StoneX India default fetch is bounded by a timeout signal', async () => {
  const stoneXIndia = await loadStoneXIndiaModule()
  let capturedInit = null

  const html = await stoneXIndia.defaultFetchText(stoneXIndia.CAREER_PAGE_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init

      return {
        ok: true,
        status: 200,
        text: async () => listingHtml,
      }
    },
  })

  assert.equal(html, listingHtml)
  assert.equal(capturedInit.headers.Accept, 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('extractJobCards keeps only India jobs from the official StoneX careers page', async () => {
  const stoneXIndia = await loadStoneXIndiaModule()
  const jobs = stoneXIndia.extractJobCards(listingHtml)

  assert.deepEqual(jobs, [{
    title: 'Senior - UAT Analyst',
    company: 'StoneX India',
    department: 'Operations',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '15423',
    requisitionId: '2026-15423',
    sourceUrl: DETAIL_URL,
    applyUrl: DETAIL_URL,
    employmentType: 'Experienced Professional',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Work closely with business teams to validate payment workflows.',
  }])
})

test('extractJobDetail reads StoneX iCIMS metadata, job description, and canonical apply URL from the detail page', async () => {
  const stoneXIndia = await loadStoneXIndiaModule()
  const detail = stoneXIndia.extractJobDetail(detailHtml, {
    title: 'Senior - UAT Analyst',
    company: 'StoneX India',
    department: 'Operations',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '15423',
    requisitionId: '2026-15423',
    sourceUrl: DETAIL_URL,
    applyUrl: DETAIL_URL,
    employmentType: 'Experienced Professional',
    jobDescription: 'Work closely with business teams to validate payment workflows.',
  })

  assert.deepEqual(detail, {
    title: 'Senior - UAT Analyst',
    company: 'StoneX India',
    department: 'Operations',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '15423',
    requisitionId: '2026-15423',
    sourceUrl: DETAIL_URL,
    applyUrl: APPLY_URL,
    employmentType: 'Experienced Professional',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Payments domain experience',
      'Project Management qualification',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Connecting clients to markets and talent to opportunity. Lead user acceptance testing for payment products. Coordinate defect triage with engineering and business teams. Payments domain experience Project Management qualification',
  })
})

test('run fetches the official StoneX page, enriches India detail pages, and decorates shared runner fields', async () => {
  const stoneXIndia = await loadStoneXIndiaModule()
  const requestedUrls = []

  const jobs = await stoneXIndia.createStoneXIndiaScraper({
    now: () => '2026-07-09T12:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREER_PAGE_URL) return listingHtml
      if (url === DETAIL_FETCH_URL) return detailHtml
      throw new Error(`Unexpected StoneX India fixture URL: ${url}`)
    },
    maxJobs: 1,
  })

  assert.deepEqual(requestedUrls, [
    CAREER_PAGE_URL,
    DETAIL_FETCH_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior - UAT Analyst',
    company: 'StoneX India',
    department: 'Operations',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '15423',
    requisitionId: '2026-15423',
    sourceUrl: DETAIL_URL,
    applyUrl: APPLY_URL,
    employmentType: 'Experienced Professional',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Payments domain experience',
      'Project Management qualification',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Connecting clients to markets and talent to opportunity. Lead user acceptance testing for payment products. Coordinate defect triage with engineering and business teams. Payments domain experience Project Management qualification',
    link: APPLY_URL,
    source: 'stonexindia',
    scrapedAt: '2026-07-09T12:00:00.000Z',
  })
})
