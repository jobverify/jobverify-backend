import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Career With us</h2>
    <p>Job Title - Accounting Assistance</p>
    <p>Company - Ashiana Clothings Pvt. Ltd. (Ashiana Group)</p>
    <p>City - Patna, Bihar</p>
    <p>Job Description :</p>
    <p>Candidate must have good knowledge of Tally / ERP.</p>
    <p>Managing &amp; Overseeing the daily operations of the accounting Dept.</p>
    <p>Manage Month and end year process, Accounts payable/receivable, cash receipts, general ledger and expenditure variance analysis.</p>
    <p>Coordinate and complete annual audits.</p>
    <p>Establish and maintain fiscal files and records to document transactions.</p>
    <p>I.Com / B.Com. with proficiency in computer work.</p>
    <p>Salary - As per Industries</p>
    <p>Industries - Retails</p>
    <p>Role - Account Assistant / Office Assistant</p>
    <p>Gender - Male</p>
    <p>Age - 20 - 28 Years</p>
    <p>Contact :</p>
    <p>Mr. Shahbaz</p>
    <p>Manager</p>
    <p>Email - admin@ashianagroup.com</p>
  </body>
</html>
`

const LIVE_SPACED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Career With us</h2>
    <p>Job Title&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Accounting Assistance</p>
    <p>Company&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ashiana Clothings Pvt. Ltd.&nbsp;(Ashiana Group)</p>
    <p>City&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Patna, Bihar</p>
    <p>Job Description :</p>
    <p>Candidate must have good knowledge of Tally / ERP.</p>
    <p>I.Com / B.Com. with proficiency in computer work.</p>
    <p>Industries&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Retails</p>
    <p>Contact :</p>
    <p>Email - admin@ashianagroup.com</p>
  </body>
</html>
`

const LIVE_TABLE_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Career With us</h2>
    <table>
      <tr><td>Job Title</td><td>-</td><td>Accounting Assistance</td></tr>
      <tr><td>Company</td><td>-</td><td>Ashiana <span>Clothings</span> Pvt. Ltd. (Ashiana Group)</td></tr>
      <tr><td>City</td><td>-</td><td>Patna, Bihar</td></tr>
      <tr><td>Job Description :</td></tr>
      <tr><td>Candidate must have good knowledge of Tally / ERP.</td></tr>
      <tr><td>I.Com / B.Com. with proficiency in computer work.</td></tr>
      <tr><td>Industries</td><td>-</td><td>Retails</td></tr>
      <tr><td>Contact :</td></tr>
      <tr><td>Email - admin@ashianagroup.com</td></tr>
    </table>
  </body>
</html>
`

const loadAshianaModule = async () => {
  try {
    return await import('../ashianagroup/script.js')
  } catch {
    assert.fail('Expected Ashiana Group scraper module at ../ashianagroup/script.js')
  }
}

test('pageIndicatesAshianaGroupCareers validates the verified official careers surface', async () => {
  const ashiana = await loadAshianaModule()

  assert.equal(ashiana.pageIndicatesAshianaGroupCareers(CAREERS_HTML), true)
})

test('Ashiana Group parser accepts the live entity-spaced careers markup', async () => {
  const ashiana = await loadAshianaModule()

  assert.equal(ashiana.pageIndicatesAshianaGroupCareers(LIVE_SPACED_CAREERS_HTML), true)
  assert.equal(ashiana.extractCareerJobs(LIVE_SPACED_CAREERS_HTML)[0].title, 'Accounting Assistance')
})

test('Ashiana Group sentinel accepts tag-separated live label text', async () => {
  const ashiana = await loadAshianaModule()

  assert.equal(ashiana.pageIndicatesAshianaGroupCareers(LIVE_TABLE_CAREERS_HTML), true)
})

test('extractCareerJobs maps Ashiana Group jobs from the official careers page', async () => {
  const ashiana = await loadAshianaModule()

  assert.equal(ashiana.CAREERS_PAGE_URL, 'https://www.ashianagroup.com/career.html')
  assert.deepEqual(ashiana.extractCareerJobs(CAREERS_HTML), [{
    title: 'Accounting Assistance',
    company: 'Ashiana Group',
    department: 'Retails',
    location: 'Patna, Bihar, India',
    city: 'Patna',
    country: 'India',
    jobId: 'ashianagroup-accounting-assistance',
    requisitionId: 'ashianagroup-accounting-assistance',
    sourceUrl: 'https://www.ashianagroup.com/career.html',
    applyUrl: 'mailto:admin@ashianagroup.com',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: 'I.Com / B.Com. with proficiency in computer work.',
    preferredQualification: null,
    requiredSkills: [
      'Candidate must have good knowledge of Tally / ERP.',
      'Managing & Overseeing the daily operations of the accounting Dept.',
      'Manage Month and end year process, Accounts payable/receivable, cash receipts, general ledger and expenditure variance analysis.',
      'Coordinate and complete annual audits.',
      'Establish and maintain fiscal files and records to document transactions.',
      'I.Com / B.Com. with proficiency in computer work.',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Candidate must have good knowledge of Tally / ERP. Managing & Overseeing the daily operations of the accounting Dept. Manage Month and end year process, Accounts payable/receivable, cash receipts, general ledger and expenditure variance analysis. Coordinate and complete annual audits. Establish and maintain fiscal files and records to document transactions. I.Com / B.Com. with proficiency in computer work.',
    remoteStatus: 'On-site',
  }])
})

test('run fetches the Ashiana Group careers page and decorates runner fields', async () => {
  const ashiana = await loadAshianaModule()
  const requestedUrls = []

  const jobs = await ashiana.createAshianaGroupScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return CAREERS_HTML
    },
    now: () => '2026-07-09T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, ['https://www.ashianagroup.com/career.html'])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'ashianagroup')
  assert.equal(jobs[0].link, 'mailto:admin@ashianagroup.com')
  assert.equal(jobs[0].scrapedAt, '2026-07-09T12:00:00.000Z')
})

test('run fails closed when the Ashiana Group careers surface changes', async () => {
  const ashiana = await loadAshianaModule()

  await assert.rejects(
    ashiana.createAshianaGroupScraper().run({
      fetchText: async () => '<html><body>No public jobs here</body></html>',
    }),
    /verified official careers surface/i,
  )
})
