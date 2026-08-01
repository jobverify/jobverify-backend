import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected scraper module at ${relativePath}`)
  }
}

const excelraCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <p>Excelra job opportunities</p>
    <h1>A more fulfilling career</h1>
    <h2>Current openings</h2>
    <div class="job-card">
      <h4 class="display-2 m-0 p-0 custom-theme-color"><span class="title">Senior Business Analyst </span></h4>
      <div class="iwithtext"><div class="iwt-text"><strong>Full Time Employment</strong></div></div>
      <div class="iwithtext"><div class="iwt-text"><strong>Hyderabad, India</strong></div></div>
      <div class="iwithtext"><div class="iwt-text"><strong>5-10 Years</strong></div></div>
      <a class="nectar-button large regular m-extra-color-gradient-1" href="https://excelra.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a44b39717416"><span>Apply now</span></a>
    </div>
    <div class="job-card">
      <h4 class="display-2 m-0 p-0 custom-theme-color"><span class="title">Data Engineer</span></h4>
      <div class="iwithtext"><div class="iwt-text"><strong>Consultant</strong></div></div>
      <div class="iwithtext"><div class="iwt-text"><strong>Germany</strong></div></div>
      <div class="iwithtext"><div class="iwt-text"><strong>5-12 Years</strong></div></div>
      <a class="nectar-button large regular m-extra-color-gradient-1" href="https://excelra.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3bc08f1459b"><span>Apply now</span></a>
    </div>
  </body>
</html>
`

const blazeclanCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Join us to grow your career by doing what you love to do and treading the path where you want to go.</h2>
    <a href="https://blazeclan.zohorecruit.in/jobs/Careers" class="cta-btn" target="_blank"><span>Current Openings</span></a>
  </body>
</html>
`

const blazeclanBrokenBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>blazeclan.zohorecruit.in does not exist.</h1>
    <a href="https://recruit.zoho.in/">click here</a>
    <a href="https://www.zoho.in/">Powered by</a>
  </body>
</html>
`

const rebitCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title> Join Us | Reserve Bank Information Technology Private Limited (ReBIT)</title>
  </head>
  <body>
    <div class="career-ajax-result"></div>
    <div class="career-bx">
      <div class="col-lg-4 col-md-6 col-sm-12">
        <div class=" requirement-data ">
          <div class="card-bx">
            <p class="position-title">Sr/Lead Engineer Development- Angular</p>
            <p class="dept-nm">Dept: Project Management Location: Multiple locations</p>
          </div>
          <a href="https://rebithr.darwinbox.in/ms/candidate/careers/a6389925ce6f1d" target="_blank" rel="noopener noreferrer" class="apply-now">Apply Now</a>
        </div>
      </div>
      <div class="col-lg-4 col-md-6 col-sm-12">
        <div class=" requirement-data ">
          <div class="card-bx">
            <p class="position-title">Lead - SOC & Blue Teaming</p>
            <p class="dept-nm">Dept: Cyber Security Location: Hyderabad, Telangna</p>
          </div>
          <a href="https://rebithr.darwinbox.in/ms/candidate/careers/a66698045ca954" target="_blank" rel="noopener noreferrer" class="apply-now">Apply Now</a>
        </div>
      </div>
    </div>
    <div class="view-footer">
      <a href="https://rebithr.darwinbox.in/ms/candidate/careers" target="_blank">Click here to apply for other Roles</a>
    </div>
  </body>
</html>
`

const amtexCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2 class="amtex-form-title">Join Our Team</h2>
    <div class="tiles3a tiles3color1">
      <a class="tiles3A randomise" href="/career-list/business-analyst"></a>
      <a class="tiles3A randomise" href="#"></a>
      <a class="tiles3A randomise" href="#"></a>
    </div>
    <label class="amtex-label">Position Applying For <span class="required">*</span></label>
    <select>
      <option value="Software Engineer">Software Engineer</option>
      <option value="Senior Software Engineer">Senior Software Engineer</option>
      <option value="Business Analyst">Business Analyst</option>
    </select>
  </body>
</html>
`

const amtexBusinessAnalystDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2 class="amtex-form-title">Apply for Business Intelligence Analyst/Developer</h2>
    <p class="amtex-form-subtitle">Join our team in New York, NY</p>
    <label class="amtex-label">Position Applying For <span class="required">*</span></label>
  </body>
</html>
`

const nucsoftCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Unlock Your Potential with</h1>
    <h2>NUCSOFT</h2>
    <a href="https://nucsoft.com/openings">View career opportunities</a>
    <div class="career-card">
      <p class="card-header">Flutter Developer</p>
      <p>Review software specs and UI mockups to develop cross-platform Flutter apps using Dart.</p>
      <a href="https://nucsoft.com/openings?job=Flutter%20Developer" class="apply-button">Apply Now</a>
    </div>
    <div class="career-card">
      <p class="card-header">DBA/SQL Developer</p>
      <p>Develop and maintain secure, high-availability SQL databases with MySQL expertise.</p>
      <a href="https://nucsoft.com/openings?job=DBA%2FSQL%20Developer" class="apply-button">Apply Now</a>
    </div>
  </body>
</html>
`

test('Excelra Knowledge Solutions run returns only India jobs from the verified first-party careers cards', async () => {
  const excelra = await loadModule('../../scraper/excelraknowledgesolutions/script.js')

  assert.equal(excelra.hasOfficialCareersSignal(excelraCareersHtml), true)
  assert.equal(excelra.extractVisibleJobCards(excelraCareersHtml).length, 2)

  const jobs = await excelra.createExcelraKnowledgeSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, excelra.CAREERS_URL)
      return excelraCareersHtml
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Senior Business Analyst')
  assert.equal(jobs[0].location, 'Hyderabad, India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].experienceRequired, '5-10 Years')
  assert.equal(jobs[0].applyUrl, 'https://excelra.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a44b39717416')
})

test('Blazeclan Technologies sentinel validates the broken Zoho handoff before returning []', async () => {
  const blazeclan = await loadModule('../../scraper/blazeclantechnologies/script.js')
  const requestedUrls = []

  assert.equal(blazeclan.hasOfficialCareersSignal(blazeclanCareersHtml), true)
  assert.equal(blazeclan.isBrokenZohoBoardPage(blazeclanBrokenBoardHtml), true)

  const jobs = await blazeclan.createBlazeclanTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === blazeclan.CAREERS_URL) return blazeclanCareersHtml
      if (url === blazeclan.BROKEN_BOARD_URL) return blazeclanBrokenBoardHtml
      throw new Error(`Unexpected Blazeclan URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [blazeclan.CAREERS_URL, blazeclan.BROKEN_BOARD_URL])
  assert.deepEqual(jobs, [])
})

test('Reserve Bank Information Technology run returns visible first-party jobs from the join-us page', async () => {
  const rebit = await loadModule('../../scraper/reservebankinformationtechnology/script.js')

  assert.equal(rebit.hasOfficialCareersSignal(rebitCareersHtml), true)
  assert.equal(rebit.extractVisibleJobCards(rebitCareersHtml).length, 2)

  const jobs = await rebit.createReserveBankInformationTechnologyScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, rebit.CAREERS_URL)
      return rebitCareersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Lead - SOC & Blue Teaming')
  assert.equal(jobs[0].location, 'Hyderabad, Telangna, India')
  assert.equal(jobs[0].department, 'Cyber Security')
  assert.equal(jobs[1].title, 'Sr/Lead Engineer Development- Angular')
  assert.equal(jobs[1].location, 'Multiple locations, India')
})

test('Amtex Systems run verifies the live detail-link shell and filters out the current non-India opening', async () => {
  const amtex = await loadModule('../../scraper/amtexsystems/script.js')
  const requestedUrls = []

  assert.equal(amtex.hasOfficialCareersSignal(amtexCareersHtml), true)
  assert.deepEqual(amtex.extractRealCareerLinks(amtexCareersHtml), [
    'https://www.amtexsystems.com/career-list/business-analyst',
  ])

  const jobs = await amtex.createAmtexSystemsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === amtex.CAREERS_URL) return amtexCareersHtml
      if (url === 'https://www.amtexsystems.com/career-list/business-analyst') {
        return amtexBusinessAnalystDetailHtml
      }
      throw new Error(`Unexpected Amtex URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    amtex.CAREERS_URL,
    'https://www.amtexsystems.com/career-list/business-analyst',
  ])
  assert.deepEqual(jobs, [])
})

test('Nucsoft run returns normalized openings from the verified first-party careers cards', async () => {
  const nucsoft = await loadModule('../../scraper/nucsoft/script.js')

  assert.equal(nucsoft.hasOfficialCareersSignal(nucsoftCareersHtml), true)
  assert.equal(nucsoft.extractVisibleJobCards(nucsoftCareersHtml).length, 2)

  const jobs = await nucsoft.createNucsoftScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, nucsoft.CAREERS_URL)
      return nucsoftCareersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'DBA/SQL Developer')
  assert.equal(jobs[0].location, 'India')
  assert.equal(jobs[0].applyUrl, 'https://nucsoft.com/openings?job=DBA%2FSQL%20Developer')
  assert.equal(jobs[1].title, 'Flutter Developer')
  assert.equal(jobs[1].location, 'India')
})
