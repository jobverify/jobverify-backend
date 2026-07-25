import assert from 'node:assert/strict'
import test from 'node:test'

const loadProviderModule = async () => {
  try {
    return await import('../specindia/provider.js')
  } catch {
    assert.fail('Expected SPEC INDIA provider module at ../specindia/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../specindia/script.js')
  } catch {
    assert.fail('Expected SPEC INDIA scraper module at ../specindia/script.js')
  }
}

const careersHtml = `
  <html>
    <head>
      <title>Join Our Team | SPEC INDIA</title>
      <link rel="canonical" href="https://www.spec-india.com/about/career" />
    </head>
    <body>
      <a href="https://www.spec-india.com/current-opening">Current Opening</a>
      <div class="curent_op_bx wht_bx w-100">
        <div class="curent_op_bx_head"><h4>Java Developer (APL)</h4></div>
        <p><strong>Experience:</strong>10-12 Years</p>
        <p><strong>Skills:</strong>Core Java, JSP/ Servlet, Spring, Web API(REST/SOAP), JavaScript, JDBC</p>
        <a href="https://www.spec-india.com/current-opening/java-developer-associate-project-lead">Apply Now</a>
        <a href="https://www.spec-india.com/current-opening/java-developer-associate-project-lead">Read More</a>
      </div>
      <div class="curent_op_bx wht_bx w-100">
        <div class="curent_op_bx_head"><h4>Senior Java Developer</h4></div>
        <p><strong>Experience:</strong>4-6 Years</p>
        <p><strong>Skills:</strong>Core Java, JSP/Servlet, Spring, Web API (REST/SOAP)</p>
        <a href="https://www.spec-india.com/current-opening/senior-java-developer">Apply Now</a>
      </div>
      <div class="curent_op_bx wht_bx w-100">
        <div class="curent_op_bx_head"><h4>HR Executive</h4></div>
        <p><strong>Experience:</strong>3-4</p>
        <p><strong>Skills:</strong>Communication, Leadership, Talent Management</p>
        <a href="https://www.spec-india.com/current-opening/hr-executive">Apply Now</a>
      </div>
    </body>
  </html>
`

test('SPEC INDIA exports local provider metadata for the verified first-party careers page', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'specindia',
    companyName: 'SPEC INDIA',
    officialBrandName: 'SPEC INDIA',
    adapter: 'script',
    modulePath: '../specindia/script.js',
    homepageUrl: 'https://www.spec-india.com/',
    companyCareerPage: 'https://www.spec-india.com/career/',
    atsPlatform: 'official-company-careers',
    countryFilter: 'India',
    paginationStrategy: 'single-careers-page-current-opening-cards',
    extractionStrategy: 'verified-first-party-careers-page+public-current-opening-cards',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'spec-india.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://www.spec-india.com/career/ is the live first-party SPEC INDIA careers page and that it exposes public Current Openings cards linking to first-party role pages such as Java Developer (APL), Senior Java Developer, and HR Executive.',
    dryRunFile: 'specindia/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('SPEC INDIA parses current opening cards from the first-party careers page', async () => {
  const specIndia = await loadScriptModule()

  assert.equal(specIndia.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await specIndia.run({
    fetchText: async () => careersHtml,
  })

  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => job.title),
    ['Java Developer (APL)', 'Senior Java Developer', 'HR Executive'],
  )
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].experienceRequired, '10-12 Years')
  assert.deepEqual(jobs[2].requiredSkills, ['Communication', 'Leadership', 'Talent Management'])
})
