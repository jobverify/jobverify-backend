import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Travel Tech Jobs & Careers at Infiniti Software Solutions</title>
  </head>
  <body>
    <h1>Dream Bold. Fly Higher. With Infiniti.</h1>
    <h2>Explore Job Opportunities</h2>
    <section class="job">
      <h2>Customer Success Manager</h2>
      <p>Build long-term customer relationships by driving product adoption, ensuring client success, identifying growth opportunities, and delivering exceptional experiences that create lasting business value.</p>
      <p>10+ Years</p>
      <p>Chennai</p>
      <a href="https://app.goodfit.so/apply/CUSTOMER-SUCCESS">Apply</a>
    </section>
    <section class="job">
      <h2>Security Compliance Lead</h2>
      <p>Responsible for managing the organization’s security, risk, and compliance programs, ensuring adherence to standards like SOC 2, ISO 27001, PCI DSS, and GDPR.</p>
      <p>1 - 3 Years</p>
      <p>Chennai</p>
      <a href="https://app.goodfit.so/apply/SECURITY-COMPLIANCE">Apply</a>
    </section>
    <section class="job">
      <h2>London Partnerships Lead</h2>
      <p>Grow our UK travel partnerships.</p>
      <p>8+ Years</p>
      <p>London</p>
      <a href="https://app.goodfit.so/apply/LONDON-PARTNERSHIPS">Apply</a>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../infinitisoftwaresolutions/script.js')
  } catch {
    assert.fail('Expected Infiniti Software Solutions scraper module at ../infinitisoftwaresolutions/script.js')
  }
}

test('Infiniti Software Solutions helpers stay pinned to the verified first-party careers page and Goodfit apply links', async () => {
  const infiniti = await loadModule()

  assert.equal(infiniti.SOURCE, 'infinitisoftwaresolutions')
  assert.equal(infiniti.COMPANY, 'Infiniti Software Solutions')
  assert.equal(infiniti.CAREERS_URL, 'https://www.infinitisoftware.net/careers/')
  assert.equal(infiniti.VERIFIED_ON, '2026-07-17')
  assert.equal(infiniti.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(infiniti.hasOfficialCareersSignal('<html><body><h1>Explore Job Opportunities</h1></body></html>'), false)
  assert.deepEqual(infiniti.extractJobs(careersHtml), [
    {
      title: 'Customer Success Manager',
      company: 'Infiniti Software Solutions',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'CUSTOMER-SUCCESS',
      requisitionId: 'CUSTOMER-SUCCESS',
      sourceUrl: 'https://app.goodfit.so/apply/CUSTOMER-SUCCESS',
      applyUrl: 'https://app.goodfit.so/apply/CUSTOMER-SUCCESS',
      employmentType: null,
      experienceRequired: '10+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        'Build long-term customer relationships by driving product adoption, ensuring client success, identifying growth opportunities, and delivering exceptional experiences that create lasting business value.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Security Compliance Lead',
      company: 'Infiniti Software Solutions',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'SECURITY-COMPLIANCE',
      requisitionId: 'SECURITY-COMPLIANCE',
      sourceUrl: 'https://app.goodfit.so/apply/SECURITY-COMPLIANCE',
      applyUrl: 'https://app.goodfit.so/apply/SECURITY-COMPLIANCE',
      employmentType: null,
      experienceRequired: '1 - 3 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        'Responsible for managing the organization’s security, risk, and compliance programs, ensuring adherence to standards like SOC 2, ISO 27001, PCI DSS, and GDPR.',
      remoteStatus: 'On-site',
    },
  ])
})

test('Infiniti Software Solutions run validates the verified careers page before decorating extracted jobs', async () => {
  const infiniti = await loadModule()
  const requestedUrls = []

  const jobs = await infiniti.createInfinitiSoftwareSolutionsScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === infiniti.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected Infiniti URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [infiniti.CAREERS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'infinitisoftwaresolutions')
  assert.equal(jobs[0].link, 'https://app.goodfit.so/apply/CUSTOMER-SUCCESS')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Infiniti Software Solutions run fails closed when the verified careers surface drifts', async () => {
  const infiniti = await loadModule()

  await assert.rejects(
    infiniti.createInfinitiSoftwareSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified infiniti software solutions careers surface/i,
  )
})
