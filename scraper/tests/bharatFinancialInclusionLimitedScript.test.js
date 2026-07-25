import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <html>
    <body>
      <h2>APPLY FOR A JOB</h2>
      <h2>Join Our Mission to Empower India</h2>
      <p>At Bharat Financial Inclusion Limited (BFIL), we are building a stronger, financially inclusive India.</p>
      <h4>Current Opportunities at BFIL</h4>
      <p>We are hiring across multiple verticals. Explore the roles below and apply as per your interest, location preference and experience:</p>
      <h5>Microfinance Business Unit (MFI)</h5>
      <ul>
        <li>Field Assistant Trainee (Sangam Manager Trainee)</li>
        <li>Branch Manager</li>
      </ul>
      <h5>Bharat Super Shop (BSS)</h5>
      <ul>
        <li>Loan Officer</li>
      </ul>
      <h5>Support Functions</h5>
      <p>We are also hiring for Associate/Executive roles across departments:</p>
      <ul>
        <li>Accounts &amp; Finance</li>
        <li>Information Technology (IT)</li>
      </ul>
      <h2>How to Apply</h2>
      <p>If interested, please send us your application with the subject line in the following format:</p>
      <p>[Vertical Name] / [Preferred Location] / [Role]</p>
      <p>Example: BSS / Mysore / Loan Officer</p>
      <h4>Email your updated resume to: careers@bfil.co.in</h4>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../bharatfinancialinclusionlimited/script.js')
  } catch {
    assert.fail('Expected Bharat Financial Inclusion Limited scraper module at ../bharatfinancialinclusionlimited/script.js')
  }
}

test('BFIL validates the verified first-party careers surface and extracts role listings', async () => {
  const bfil = await loadModule()

  assert.equal(bfil.SOURCE, 'bharatfinancialinclusionlimited')
  assert.equal(bfil.COMPANY, 'Bharat Financial Inclusion Limited')
  assert.equal(bfil.CAREERS_URL, 'https://www.bfil.co.in/apply-for-job.php')
  assert.equal(bfil.APPLICATION_EMAIL, 'careers@bfil.co.in')
  assert.equal(
    bfil.APPLICATION_URL,
    'mailto:careers@bfil.co.in?subject=%5BVertical%20Name%5D%20%2F%20%5BPreferred%20Location%5D%20%2F%20%5BRole%5D',
  )
  assert.equal(bfil.hasOfficialCareersSignal(careersHtml), true)

  const jobs = bfil.extractRoleListings(careersHtml)

  assert.equal(jobs.length, 5)
  assert.deepEqual(jobs[0], {
    title: 'Field Assistant Trainee (Sangam Manager Trainee)',
    company: 'Bharat Financial Inclusion Limited',
    department: 'Microfinance Business Unit (MFI)',
    location: null,
    city: null,
    country: 'India',
    jobId: 'microfinance-business-unit-mfi-field-assistant-trainee-sangam-manager-trainee',
    requisitionId: 'microfinance-business-unit-mfi-field-assistant-trainee-sangam-manager-trainee',
    sourceUrl: 'https://www.bfil.co.in/apply-for-job.php',
    applyUrl: 'mailto:careers@bfil.co.in?subject=%5BVertical%20Name%5D%20%2F%20%5BPreferred%20Location%5D%20%2F%20%5BRole%5D',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Apply with subject format: [Vertical Name] / [Preferred Location] / [Role]. Example: BSS / Mysore / Loan Officer.',
  })
})

test('run returns the BFIL first-party role list with shared email apply metadata', async () => {
  const bfil = await loadModule()
  const requestedUrls = []

  const jobs = await bfil.createBharatFinancialInclusionLimitedScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [bfil.CAREERS_URL])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'bharatfinancialinclusionlimited')
  assert.equal(jobs[0].link, bfil.APPLICATION_URL)
  assert.equal(jobs[4].department, 'Support Functions')
  assert.equal(jobs[4].title, 'Information Technology (IT)')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
