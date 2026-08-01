import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Life At Varthana | Apply For Education Loan | Student Loans</title>
  </head>
  <body>
    <main>
      <h1>An opportunity to create long term impact and change</h1>
      <p>
        Search and apply for open positions that match your skills and interest.
        Come join our Varthana Team to transform education with us.
      </p>
      <a href="https://app79.workline.hr/Candidate/GeneralOpening.aspx" target="_blank">Search Jobs</a>
    </main>
  </body>
</html>
`

const jobsBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Varthana - Workline - Possibilities Infinite</title>
  </head>
  <body>
    <div class="page-title"><h3>General</h3></div>
    <table id="openpositions" class="table table-striped table-bordered" width="100%">
      <thead>
        <tr>
          <th>Reference No.</th>
          <th>Position</th>
          <th>Business Unit</th>
          <th>Function</th>
          <th>Branch</th>
          <th>Work Location</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>6613</td>
          <td>Relationship Manager</td>
          <td>School Loans</td>
          <td>Sales</td>
          <td>Vijayawada</td>
          <td>Prakasam</td>
          <td><a href="../../scraper/Candidate/CanPRFApplyBL.aspx?PRFCode=3328&amp;Flag=C" class="btn btn-primary">Apply</a></td>
        </tr>
        <tr>
          <td>6588</td>
          <td>Branch Manager</td>
          <td>School Loans</td>
          <td>Sales</td>
          <td>Nagpur</td>
          <td>Nagpur</td>
          <td><a href="../../scraper/Candidate/CanPRFApplyBL.aspx?PRFCode=3317&amp;Flag=C" class="btn btn-primary">Apply</a></td>
        </tr>
        <tr>
          <td>6536</td>
          <td>Cluster Business Manager</td>
          <td>School Loans</td>
          <td>Sales</td>
          <td>Coimbatore</td>
          <td>Coimbatore</td>
          <td><a href="../../scraper/Candidate/CanPRFApplyBL.aspx?PRFCode=3302&amp;Flag=C" class="btn btn-primary">Apply</a></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/varthana/script.js')
  } catch {
    assert.fail('Expected Varthana scraper module at ../../scraper/varthana/script.js')
  }
}

test('Varthana parses verified public Workline listing rows into normalized jobs', async () => {
  const varthana = await loadScriptModule()
  const pageRequests = []

  assert.equal(varthana.SOURCE, 'varthana')
  assert.equal(varthana.COMPANY, 'Varthana')
  assert.equal(varthana.CAREERS_URL, 'https://varthana.com/student/life-at-varthana/')
  assert.equal(varthana.JOBS_BOARD_URL, 'https://app79.workline.hr/Candidate/GeneralOpening.aspx')
  assert.equal(varthana.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(varthana.extractJobsBoardUrl(careersHtml), varthana.JOBS_BOARD_URL)
  assert.equal(varthana.hasOfficialJobsBoardSignal(jobsBoardHtml), true)

  assert.deepEqual(varthana.extractListingRows(jobsBoardHtml), [
    {
      referenceNumber: '6613',
      title: 'Relationship Manager',
      businessUnit: 'School Loans',
      functionName: 'Sales',
      branch: 'Vijayawada',
      workLocation: 'Prakasam',
      applyUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3328&Flag=C',
    },
    {
      referenceNumber: '6588',
      title: 'Branch Manager',
      businessUnit: 'School Loans',
      functionName: 'Sales',
      branch: 'Nagpur',
      workLocation: 'Nagpur',
      applyUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3317&Flag=C',
    },
    {
      referenceNumber: '6536',
      title: 'Cluster Business Manager',
      businessUnit: 'School Loans',
      functionName: 'Sales',
      branch: 'Coimbatore',
      workLocation: 'Coimbatore',
      applyUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3302&Flag=C',
    },
  ])

  const jobs = await varthana.createVarthanaScraper({
    now: () => '2026-07-25T10:30:00.000Z',
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === varthana.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === varthana.JOBS_BOARD_URL) {
        return { status: 200, url, html: jobsBoardHtml }
      }

      throw new Error(`Unexpected Varthana URL: ${url}`)
    },
  })

  assert.deepEqual(pageRequests, [
    varthana.CAREERS_URL,
    varthana.JOBS_BOARD_URL,
  ])
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    department: job.department,
    location: job.location,
    city: job.city,
    country: job.country,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    jobId: job.jobId,
    requisitionId: job.requisitionId,
    link: job.link,
    scrapedAt: job.scrapedAt,
  })), [
    {
      title: 'Relationship Manager',
      department: 'Sales',
      location: 'Vijayawada, Prakasam, India',
      city: 'Vijayawada',
      country: 'India',
      sourceUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3328&Flag=C',
      applyUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3328&Flag=C',
      jobId: 'varthana-6613',
      requisitionId: '6613',
      link: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3328&Flag=C',
      scrapedAt: '2026-07-25T10:30:00.000Z',
    },
    {
      title: 'Branch Manager',
      department: 'Sales',
      location: 'Nagpur, India',
      city: 'Nagpur',
      country: 'India',
      sourceUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3317&Flag=C',
      applyUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3317&Flag=C',
      jobId: 'varthana-6588',
      requisitionId: '6588',
      link: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3317&Flag=C',
      scrapedAt: '2026-07-25T10:30:00.000Z',
    },
    {
      title: 'Cluster Business Manager',
      department: 'Sales',
      location: 'Coimbatore, India',
      city: 'Coimbatore',
      country: 'India',
      sourceUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3302&Flag=C',
      applyUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3302&Flag=C',
      jobId: 'varthana-6536',
      requisitionId: '6536',
      link: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3302&Flag=C',
      scrapedAt: '2026-07-25T10:30:00.000Z',
    },
  ])
  assert.ok(jobs.every((job) => job.company === 'Varthana' && job.source === 'varthana'))
  assert.ok(jobs.every((job) => job.jobDescription?.includes('Reference No.:')))
})

test('Varthana fails closed with no jobs when the verified Workline table contract is absent', async () => {
  const varthana = await loadScriptModule()

  const jobs = await varthana.createVarthanaScraper().run({
    fetchPage: async (url) => {
      if (url === varthana.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === varthana.JOBS_BOARD_URL) {
        return {
          status: 200,
          url,
          html: `
            <html>
              <head><title>Varthana - Workline - Possibilities Infinite</title></head>
              <body><main><h1>General</h1><p>No listing table here.</p></main></body>
            </html>
          `,
        }
      }

      throw new Error(`Unexpected Varthana URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})
