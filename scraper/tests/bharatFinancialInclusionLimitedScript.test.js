import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <html>
    <head>
      <title>About Bharat Financial Inclusion Limited </title>
    </head>
    <body>
      <h1>APPLY FOR A JOB</h1>
      <section>
        <h2>Current Opportunities at BFIL</h2>
        <p>How to Apply</p>
        <p>Email your resume to careers@bfil.co.in.</p>
        <p>Use the subject line format [Vertical Name] / [Preferred Location] / [Role]</p>
        <p>Example: BSS / Mysore / Loan Officer</p>
      </section>
      <h5>Microfinance Business Unit (MFI)</h5>
      <ul>
        <li>Loan Officer</li>
        <li>Collections Executive</li>
      </ul>
      <h5>Bharat Super Shop (BSS)</h5>
      <ul>
        <li>Retail Sales Officer</li>
      </ul>
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

test('BFIL recognizes the verified first-party email-apply careers page and extracts role listings', async () => {
  const bfil = await loadModule()

  assert.equal(bfil.SOURCE, 'bharatfinancialinclusionlimited')
  assert.equal(bfil.COMPANY, 'Bharat Financial Inclusion Limited')
  assert.equal(bfil.CAREERS_URL, 'https://www.bfil.co.in/apply-for-job.php')
  assert.equal(bfil.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(bfil.extractRoleListings(careersHtml), [
    {
      title: 'Loan Officer',
      company: 'Bharat Financial Inclusion Limited',
      department: 'Microfinance Business Unit (MFI)',
      location: null,
      city: null,
      country: 'India',
      jobId: 'microfinance-business-unit-mfi-loan-officer',
      requisitionId: 'microfinance-business-unit-mfi-loan-officer',
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
    },
    {
      title: 'Collections Executive',
      company: 'Bharat Financial Inclusion Limited',
      department: 'Microfinance Business Unit (MFI)',
      location: null,
      city: null,
      country: 'India',
      jobId: 'microfinance-business-unit-mfi-collections-executive',
      requisitionId: 'microfinance-business-unit-mfi-collections-executive',
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
    },
    {
      title: 'Retail Sales Officer',
      company: 'Bharat Financial Inclusion Limited',
      department: 'Bharat Super Shop (BSS)',
      location: null,
      city: null,
      country: 'India',
      jobId: 'bharat-super-shop-bss-retail-sales-officer',
      requisitionId: 'bharat-super-shop-bss-retail-sales-officer',
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
    },
  ])
})

test('BFIL run adds scraper metadata to extracted jobs', async () => {
  const bfil = await loadModule()
  const jobs = await bfil.createBharatFinancialInclusionLimitedScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'bharatfinancialinclusionlimited')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('BFIL can recover with a browser-backed careers page when direct requests are rejected with HTTP 406', async () => {
  const bfil = await loadModule()
  const browserUrls = []

  const jobs = await bfil.createBharatFinancialInclusionLimitedScraper().run({
    fetchText: async () => {
      throw new Error(`HTTP 406 for ${bfil.CAREERS_URL}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(browserUrls, [bfil.CAREERS_URL])
  assert.equal(jobs.length, 3)
})

test('BFIL fails closed when the verified first-party careers surface drifts', async () => {
  const bfil = await loadModule()

  await assert.rejects(
    bfil.createBharatFinancialInclusionLimitedScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified first-party email-apply surface/i,
  )
})
