import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Suryoday Small Finance Bank. Join Our Family</title>
  </head>
  <body>
    <main>
      <h1>Shape your career with a growing Bank</h1>
      <p>Browse open positions</p>
      <section>
        <h2>Explore Open Positions</h2>
        <a href="https://suryoday.workline.hr/Candidate/GeneralOpening.aspx?Flag=C" target="_blank" rel="noopener noreferrer">
          <button type="button">
            <span>Find the right-fit job role for you</span>
          </button>
        </a>
      </section>
    </main>
  </body>
</html>
`

const jobsBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Suryoday - Workline - Possibilities Infinite</title>
  </head>
  <body>
    <div class="page-title"><h3>General Openings</h3></div>
    <table id="openpositions" class="table table-striped table-bordered" width="100%">
      <thead>
        <tr>
          <th>Reference No.</th>
          <th>Position</th>
          <th>Product</th>
          <th>Function</th>
          <th>Location</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>96910</td>
          <td>Relationship Officer</td>
          <td>JLG</td>
          <td>Sales</td>
          <td>Pune</td>
          <td><a href="../Candidate/CanPRFApplyBL.aspx?PRFCode=54923&amp;Flag=C" class="btn btn-primary">Apply</a></td>
        </tr>
        <tr>
          <td>85866</td>
          <td>Customer Care Executive</td>
          <td>Support</td>
          <td>Customer Service</td>
          <td>CO Belapur ST</td>
          <td><a href="../Candidate/CanPRFApplyBL.aspx?PRFCode=49210&amp;Flag=C" class="btn btn-primary">Apply</a></td>
        </tr>
        <tr>
          <td>84868</td>
          <td>Branch Manager</td>
          <td>Branch Banking</td>
          <td>Sales</td>
          <td>Panvel</td>
          <td><a href="../Candidate/CanPRFApplyBL.aspx?PRFCode=48845&amp;Flag=C" class="btn btn-primary">Apply</a></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/suryoday/script.js')
  } catch {
    assert.fail('Expected Suryoday scraper module at ../../scraper/suryoday/script.js')
  }
}

test('Suryoday parses verified public Workline listing rows into normalized jobs', async () => {
  const suryoday = await loadScriptModule()
  const pageRequests = []

  assert.equal(suryoday.SOURCE, 'suryoday')
  assert.equal(suryoday.COMPANY, 'Suryoday')
  assert.equal(suryoday.CAREERS_URL, 'https://suryoday.bank.in/careers/')
  assert.equal(suryoday.JOBS_BOARD_URL, 'https://suryoday.workline.hr/Candidate/GeneralOpening.aspx?Flag=C')
  assert.equal(suryoday.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(suryoday.extractJobsBoardUrl(careersHtml), suryoday.JOBS_BOARD_URL)
  assert.equal(suryoday.hasOfficialJobsBoardSignal(jobsBoardHtml), true)

  assert.deepEqual(suryoday.extractListingRows(jobsBoardHtml), [
    {
      referenceNumber: '96910',
      title: 'Relationship Officer',
      product: 'JLG',
      functionName: 'Sales',
      locationName: 'Pune',
      applyUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=54923&Flag=C',
    },
    {
      referenceNumber: '85866',
      title: 'Customer Care Executive',
      product: 'Support',
      functionName: 'Customer Service',
      locationName: 'CO Belapur ST',
      applyUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=49210&Flag=C',
    },
    {
      referenceNumber: '84868',
      title: 'Branch Manager',
      product: 'Branch Banking',
      functionName: 'Sales',
      locationName: 'Panvel',
      applyUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=48845&Flag=C',
    },
  ])

  const jobs = await suryoday.createSuryodayScraper({
    now: () => '2026-07-25T11:45:00.000Z',
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === suryoday.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === suryoday.JOBS_BOARD_URL) {
        return { status: 200, url, html: jobsBoardHtml }
      }

      throw new Error(`Unexpected Suryoday URL: ${url}`)
    },
  })

  assert.deepEqual(pageRequests, [
    suryoday.CAREERS_URL,
    suryoday.JOBS_BOARD_URL,
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
    publicExperienceChecked: job.publicExperienceChecked,
    link: job.link,
    scrapedAt: job.scrapedAt,
  })), [
    {
      title: 'Relationship Officer',
      department: 'Sales',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      sourceUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=54923&Flag=C',
      applyUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=54923&Flag=C',
      jobId: 'suryoday-96910',
      requisitionId: '96910',
      publicExperienceChecked: true,
      link: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=54923&Flag=C',
      scrapedAt: '2026-07-25T11:45:00.000Z',
    },
    {
      title: 'Customer Care Executive',
      department: 'Customer Service',
      location: 'CO Belapur ST, India',
      city: 'CO Belapur ST',
      country: 'India',
      sourceUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=49210&Flag=C',
      applyUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=49210&Flag=C',
      jobId: 'suryoday-85866',
      requisitionId: '85866',
      publicExperienceChecked: true,
      link: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=49210&Flag=C',
      scrapedAt: '2026-07-25T11:45:00.000Z',
    },
    {
      title: 'Branch Manager',
      department: 'Sales',
      location: 'Panvel, India',
      city: 'Panvel',
      country: 'India',
      sourceUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=48845&Flag=C',
      applyUrl: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=48845&Flag=C',
      jobId: 'suryoday-84868',
      requisitionId: '84868',
      publicExperienceChecked: true,
      link: 'https://suryoday.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=48845&Flag=C',
      scrapedAt: '2026-07-25T11:45:00.000Z',
    },
  ])
  assert.ok(jobs.every((job) => job.company === 'Suryoday' && job.source === 'suryoday'))
  assert.ok(jobs.every((job) => job.jobDescription?.includes('Reference No.:')))
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
})

test('Suryoday fails closed with no jobs when the verified Workline table contract is absent', async () => {
  const suryoday = await loadScriptModule()

  const jobs = await suryoday.createSuryodayScraper().run({
    fetchPage: async (url) => {
      if (url === suryoday.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === suryoday.JOBS_BOARD_URL) {
        return {
          status: 200,
          url,
          html: `
            <html>
              <head><title>Suryoday - Workline - Possibilities Infinite</title></head>
              <body><main><h1>General Openings</h1><p>No public listing table here.</p></main></body>
            </html>
          `,
        }
      }

      throw new Error(`Unexpected Suryoday URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})
