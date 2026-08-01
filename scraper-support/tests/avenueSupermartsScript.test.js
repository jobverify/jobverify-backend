import assert from 'node:assert/strict'
import test from 'node:test'

const loadAvenueSupermartsModule = async () => {
  try {
    return await import('../../scraper/avenuesupermarts/script.js')
  } catch {
    assert.fail('Expected Avenue Supermarts scraper module at ../../scraper/avenuesupermarts/script.js')
  }
}

const buildOfficialCareersHtml = () => `
<!doctype html>
<html>
  <head>
    <title>Careers | DMart</title>
  </head>
  <body>
    <h1>CAREERS</h1>
    <p>DMart is constantly expanding and opening new stores every year.</p>
    <h2>CURRENT OPENINGS</h2>
    <p>Explore our current openings below. Good Luck!</p>
    <a href="https://career10.successfactors.com/career?company=avenuesupe">APPLY NOW</a>
  </body>
</html>
`

const buildCurrentCareersShellHtml = () => `
<!doctype html>
<html>
  <head>
    <title>Careers | DMart</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <nav>
      <a href="/about-us">About us</a>
      <a href="/categories">Categories</a>
      <a href="/social-outreach">Social Outreach</a>
      <a href="/partner-with-us">Partner with us</a>
      <a href="/careers">Careers</a>
      <a href="/investor-relations">Investor Relations</a>
    </nav>
    <a href="https://career10.successfactors.com/career?company=avenuesupe">APPLY NOW</a>
  </body>
</html>
`

const buildSummaryHtml = () => `
<!doctype html>
<html>
  <head>
    <title>Career Opportunities</title>
  </head>
  <body>
    <div>24 Jobs match the selections</div>
    <table>
      <tbody>
        <tr class="jobResultItem">
          <td>
            <div role="heading" aria-level="3">
              <a
                class="jobTitle"
                href="/career?career%5fns=job%5flisting&amp;company=avenuesupe&amp;navBarLevel=JOB%5fSEARCH&amp;rcm%5fsite%5flocale=en%5fGB&amp;career_job_req_id=110923&amp;selected_lang=en_GB&amp;jobAlertController_jobAlertId=&amp;jobAlertController_jobAlertName=&amp;browserTimeZone=Asia/Calcutta"
              >
                PURCHASE OFFICERS
              </a>
            </div>
            <div class="noteSection" role="note">
              <div>
                Requisition ID: <span class="jobContentEM">110923</span> -
                <span class="jobContentEM">Posted on 13/07/2026</span> -
                <span class="jobContentEM">Avenue Supermart Ltd</span> -
                <span class="jobContentEM">Karnataka</span> -
                <span class="jobContentEM">Bangalore</span>
              </div>
              <div><span class="jobContentEM">Category Garments</span></div>
            </div>
          </td>
        </tr>
        <tr class="jobResultItem">
          <td>
            <div role="heading" aria-level="3">
              <a
                class="jobTitle"
                href="/career?career%5fns=job%5flisting&amp;company=avenuesupe&amp;navBarLevel=JOB%5fSEARCH&amp;rcm%5fsite%5flocale=en%5fGB&amp;career_job_req_id=96584&amp;selected_lang=en_GB&amp;jobAlertController_jobAlertId=&amp;jobAlertController_jobAlertName=&amp;browserTimeZone=Asia/Calcutta"
              >
                Circle HR Manager
              </a>
            </div>
            <div class="noteSection" role="note">
              <div>
                Requisition ID: <span class="jobContentEM">96584</span> -
                <span class="jobContentEM">Posted on 10/07/2026</span> -
                <span class="jobContentEM">Avenue Supermart Ltd</span> -
                <span class="jobContentEM">Rajastan</span> -
                <span class="jobContentEM">Jaipur</span>
              </div>
              <div><span class="jobContentEM">Human Resources</span></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <a id="40:_next_link" title="Next Page" class="paginationArrow" href="javascript:void(0);"> </a>
  </body>
</html>
`

const buildSummaryPageTwoHtml = () => `
<!doctype html>
<html>
  <head>
    <title>Career Opportunities</title>
  </head>
  <body>
    <div>24 Jobs match the selections</div>
    <table>
      <tbody>
        <tr class="jobResultItem">
          <td>
            <div role="heading" aria-level="3">
              <a
                class="jobTitle"
                href="/career?career%5fns=job%5flisting&amp;company=avenuesupe&amp;navBarLevel=JOB%5fSEARCH&amp;rcm%5fsite%5flocale=en%5fGB&amp;career_job_req_id=77644&amp;selected_lang=en_GB&amp;jobAlertController_jobAlertId=&amp;jobAlertController_jobAlertName=&amp;browserTimeZone=Asia/Calcutta"
              >
                EXECUTIVE ACCOUNTS
              </a>
            </div>
            <div class="noteSection" role="note">
              <div>
                Requisition ID: <span class="jobContentEM">77644</span> -
                <span class="jobContentEM">Posted on 13/12/2025</span> -
                <span class="jobContentEM">Avenue Supermart Ltd</span> -
                <span class="jobContentEM">Karnataka</span> -
                <span class="jobContentEM">Bangalore</span>
              </div>
              <div><span class="jobContentEM">Finance &amp; Accounts</span></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const buildDetailHtml = ({
  requisitionId,
  title,
  postingDate,
  state,
  city,
  department,
  body,
}) => `
<!doctype html>
<html>
  <head>
    <title>Career Opportunities: ${title} (${requisitionId})</title>
  </head>
  <body>
    <h1 id="candidateProfileTitle">Career Opportunities: ${title} (${requisitionId})</h1>
    <div>
      Requisition ID ${requisitionId} - Posted ${postingDate} - Avenue Supermart Ltd - ${state} - ${city} - ${department}
    </div>
    <div class="jobdescription">
      ${body}
    </div>
    <div>Apply Save Job Email Job to Friend Return to List</div>
  </body>
</html>
`

test('Avenue Supermarts scraper exports the verified first-party DMart and SuccessFactors contract', async () => {
  const avenueSupermarts = await loadAvenueSupermartsModule()

  assert.equal(avenueSupermarts.COMPANY_NAME, 'Avenue Supermarts')
  assert.equal(avenueSupermarts.CAREERS_PAGE_URL, 'https://www.dmartindia.com/careers')
  assert.equal(avenueSupermarts.SUCCESSFACTORS_BOARD_URL, 'https://career10.successfactors.com/career?company=avenuesupe')
  assert.equal(
    avenueSupermarts.SUCCESSFACTORS_SEARCH_URL,
    'https://career10.successfactors.com/career?company=avenuesupe&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  )
  assert.equal(
    avenueSupermarts.buildDetailUrl('110923'),
    'https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=110923&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  )
  assert.equal(avenueSupermarts.hasOfficialCareersPageSignal(buildOfficialCareersHtml()), true)
  assert.equal(avenueSupermarts.hasOfficialCareersPageSignal(buildCurrentCareersShellHtml()), true)
  assert.equal(
    avenueSupermarts.extractSuccessFactorsHandoffUrl(buildOfficialCareersHtml()),
    avenueSupermarts.SUCCESSFACTORS_BOARD_URL,
  )
})

test('extractSearchResults parses the verified Avenue Supermarts SuccessFactors results rows', async () => {
  const avenueSupermarts = await loadAvenueSupermartsModule()

  const jobs = avenueSupermarts.extractSearchResults(buildSummaryHtml())

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'PURCHASE OFFICERS',
    company: 'Avenue Supermarts',
    hiringEntity: 'Avenue Supermart Ltd',
    department: 'Category Garments',
    location: 'Bangalore, Karnataka, India',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    jobId: '110923',
    requisitionId: '110923',
    sourceUrl: 'https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=110923&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
    applyUrl: 'https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=110923&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
    link: 'https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=110923&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
    postingDate: '2026-07-13',
    jobDescription: null,
  })
})

test('extractJobDetail parses the verified Avenue Supermarts detail-page text', async () => {
  const avenueSupermarts = await loadAvenueSupermartsModule()

  const job = avenueSupermarts.extractJobDetail(
    buildDetailHtml({
      requisitionId: '110923',
      title: 'PURCHASE OFFICERS',
      postingDate: '13/07/2026',
      state: 'Karnataka',
      city: 'Bangalore',
      department: 'Category Garments',
      body: `
        <p>FUNCTION : OPERATIONS</p>
        <p>JOB TITLE : PURCHASE OFFICER</p>
        <p>Job Description Is responsible for preparing the vendor schedule and ensuring stock availability.</p>
        <p>Experience F1 to F3</p>
        <p>Skills needed Listening, Written Communication</p>
        <p>Education Graduates</p>
      `,
    }),
    {
      requisitionId: '110923',
      title: 'PURCHASE OFFICERS',
      department: 'Category Garments',
    },
  )

  assert.equal(job.title, 'PURCHASE OFFICERS')
  assert.equal(job.requisitionId, '110923')
  assert.equal(job.applyUrl, avenueSupermarts.buildDetailUrl('110923'))
  assert.equal(job.postingDate, '2026-07-13')
  assert.match(job.jobDescription, /vendor schedule/i)
  assert.match(job.jobDescription, /Education Graduates/i)
})

test('run verifies the DMart careers page, paginates the public SuccessFactors board, and enriches detail pages', async () => {
  const avenueSupermarts = await loadAvenueSupermartsModule()

  const requestedUrls = []
  const detailPages = {
    [avenueSupermarts.buildDetailUrl('110923')]: buildDetailHtml({
      requisitionId: '110923',
      title: 'PURCHASE OFFICERS',
      postingDate: '13/07/2026',
      state: 'Karnataka',
      city: 'Bangalore',
      department: 'Category Garments',
      body: `
        <p>FUNCTION : OPERATIONS</p>
        <p>Job Description Is responsible for preparing the vendor schedule and optimum utilisation of space.</p>
      `,
    }),
    [avenueSupermarts.buildDetailUrl('96584')]: buildDetailHtml({
      requisitionId: '96584',
      title: 'Circle HR Manager',
      postingDate: '10/07/2026',
      state: 'Rajastan',
      city: 'Jaipur',
      department: 'Human Resources',
      body: `
        <p>FUNCTION : HUMAN RESOURCES</p>
        <p>Job Description Lead circle hiring and store HR operations across Jaipur.</p>
      `,
    }),
    [avenueSupermarts.buildDetailUrl('77644')]: buildDetailHtml({
      requisitionId: '77644',
      title: 'EXECUTIVE ACCOUNTS',
      postingDate: '13/12/2025',
      state: 'Karnataka',
      city: 'Bangalore',
      department: 'Finance &amp; Accounts',
      body: `
        <p>FUNCTION : FINANCE</p>
        <p>Job Description Handle reconciliations, daily cash books, and reporting.</p>
      `,
    }),
  }

  let currentStage = 'careers'

  const fakePage = {
    goto: async (url) => {
      requestedUrls.push(url)

      if (url === avenueSupermarts.CAREERS_PAGE_URL) {
        currentStage = 'careers'
        return
      }

      if (url === avenueSupermarts.SUCCESSFACTORS_SEARCH_URL) {
        currentStage = 'summary-1'
        return
      }

      if (detailPages[url]) {
        currentStage = url
        return
      }

      throw new Error(`Unexpected page.goto URL: ${url}`)
    },
    waitForSelector: async () => {},
    waitForFunction: async () => {},
    waitForTimeout: async () => {},
    evaluate: async () => {
      if (currentStage === 'summary-1') {
        currentStage = 'summary-2'
        return
      }

      throw new Error(`Unexpected evaluate stage: ${currentStage}`)
    },
    content: async () => {
      if (currentStage === 'careers') return buildOfficialCareersHtml()
      if (currentStage === 'summary-1') return buildSummaryHtml()
      if (currentStage === 'summary-2') return buildSummaryPageTwoHtml()
      if (detailPages[currentStage]) return detailPages[currentStage]
      throw new Error(`Unexpected content stage: ${currentStage}`)
    },
  }

  const jobs = await avenueSupermarts.run({
    launchBrowser: async () => ({
      close: async () => {},
    }),
    createOptimizedPage: async () => fakePage,
    now: () => '2026-07-15T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls.slice(0, 2), [
    'https://www.dmartindia.com/careers',
    'https://career10.successfactors.com/career?company=avenuesupe&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'avenuesupermarts')
  assert.equal(jobs[0].company, 'Avenue Supermarts')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].atsPlatform, 'successfactors')
  assert.equal(jobs[0].applyUrl, avenueSupermarts.buildDetailUrl('110923'))
  assert.equal(jobs[0].postingDate, '2026-07-13')
  assert.equal(jobs[0].scrapedAt, '2026-07-15T12:00:00.000Z')
  assert.match(jobs[0].jobDescription, /vendor schedule/i)
  assert.equal(jobs[2].title, 'EXECUTIVE ACCOUNTS')
  assert.match(jobs[2].jobDescription, /reconciliations/i)
})

test('run fails closed when the verified DMart careers handoff disappears', async () => {
  const avenueSupermarts = await loadAvenueSupermartsModule()

  await assert.rejects(
    avenueSupermarts.run({
      launchBrowser: async () => ({
        close: async () => {},
      }),
      createOptimizedPage: async () => ({
        goto: async () => {},
        waitForSelector: async () => {},
        content: async () => `
          <html>
            <head><title>Careers | DMart</title></head>
            <body>
              <h1>CAREERS</h1>
              <p>DMart is constantly expanding and opening new stores every year.</p>
              <h2>CURRENT OPENINGS</h2>
              <p>Explore our current openings below. Good Luck!</p>
            </body>
          </html>
        `,
      }),
    }),
    /verified DMart careers page no longer exposes the known SuccessFactors handoff/i,
  )
})
