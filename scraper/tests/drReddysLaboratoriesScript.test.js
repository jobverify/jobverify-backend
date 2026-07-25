import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Dr. Reddy's - Good Health Can't Wait</title>
  </head>
  <body>
    <nav>
      <h2>Work with us</h2>
      <a href="https://careers.drreddys.com/">Careers</a>
    </nav>
  </body>
</html>
`

const careersLandingPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>We believe in the power of unity, where diverse skills, a common purpose, and shared values spark magic | Dr Reddy</title>
  </head>
  <body>
    <h1>We believe in the power of unity, where diverse skills, a common purpose, and shared values <span>spark magic</span></h1>
    <a href="/jobs">Global Job Search</a>
  </body>
</html>
`

const jobsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job results | Dr Reddy</title>
  </head>
  <body>
    <h1>Job results</h1>
    <p>56 result(s)</p>
    <div class="attrax-vacancy-tile sector-people-analytics sector-analytics attrax-vacancy-tile--corporate attrax-vacancy-tile--full-time attrax-vacancy-tile--hyderabad attrax-vacancy-tile--telangana attrax-vacancy-tile--india attrax-vacancy-tile--no-author" data-jobid="5118">
      <div class="attrax-vacancy-tile__expand-btn" role="button" aria-label="click here to expand"></div>
      <a aria-level="3" class="attrax-vacancy-tile__title attrax-vacancy-tile__item attrax-button" href="/job/data-analyst-hr-analytics-in-hyderabad-jid-5118" role="heading" tabindex="0">Data Analyst - HR Analytics</a>
      <div class="attrax-vacancy-tile__salary attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__salary-label attrax-vacancy-tile__item-label">Salary</p>
        <p class="attrax-vacancy-tile__salary-value attrax-vacancy-tile__item-value"></p>
      </div>
      <div class="attrax-vacancy-tile__location-freetext attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__item-label">Location</p>
        <p class="attrax-vacancy-tile__item-value">Hyderabad</p>
      </div>
      <div class="attrax-vacancy-tile__option-type-of-working attrax-vacancy-tile__option-type-of-working--full-time attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__option-type-of-working-label attrax-vacancy-tile__item-label">Type of Working</p>
        <div class="attrax-vacancy-tile__option-type-of-working-valueset attrax-vacancy-tile__item-valueset">
          <p class="attrax-vacancy-tile__item-value">Full Time</p>
        </div>
      </div>
      <div class="attrax-vacancy-tile__option-job-family attrax-vacancy-tile__option-job-family--people-analytics attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__option-job-family-label attrax-vacancy-tile__item-label">Job Family</p>
        <div class="attrax-vacancy-tile__option-job-family-valueset attrax-vacancy-tile__item-valueset">
          <p class="attrax-vacancy-tile__item-value">People Analytics</p>
        </div>
      </div>
      <div class="attrax-vacancy-tile__option-business-unit attrax-vacancy-tile__option-business-unit--corporate attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__option-business-unit-label attrax-vacancy-tile__item-label">Business Unit</p>
        <div class="attrax-vacancy-tile__option-business-unit-valueset attrax-vacancy-tile__item-valueset">
          <p class="attrax-vacancy-tile__item-value">Corporate</p>
        </div>
      </div>
      <div class="attrax-vacancy-tile__description attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__description-label attrax-vacancy-tile__item-label">Description</p>
        <p class="attrax-vacancy-tile__description-value attrax-vacancy-tile__item-value">
          We are seeking an experienced and dynamic HR Tech Analyst to be an integral part of a dynamic team, supporting complex and high-visibility HR process improvement and technology implementation initiati
        </p>
      </div>
      <div class="attrax-vacancy-tile__reference attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__reference-label attrax-vacancy-tile__item-label">Reference</p>
        <p class="attrax-vacancy-tile__reference-value attrax-vacancy-tile__item-value">2266f60b-55b6-4e11-abba-fd5b8c76424a</p>
      </div>
      <div class="attrax-vacancy-tile__expiry attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__expiry-label attrax-vacancy-tile__item-label">Expiry Date</p>
        <p class="attrax-vacancy-tile__expiry-value attrax-vacancy-tile__item-value"></p>
      </div>
    </div>
    <div class="attrax-vacancy-tile attrax-vacancy-tile--new-jersey attrax-vacancy-tile--united-states-of-america" data-jobid="4001">
      <a class="attrax-vacancy-tile__title attrax-vacancy-tile__item attrax-button" href="/job/senior-manager-in-new-jersey-jid-4001">Senior Manager</a>
      <div class="attrax-vacancy-tile__location-freetext attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__item-label">Location</p>
        <p class="attrax-vacancy-tile__item-value">Princeton</p>
      </div>
    </div>
    <div class="attrax-pagination__container">
      <a href="javascript:pagination(1)">1</a>
      <a href="javascript:pagination(2)">2</a>
      <a href="javascript:pagination(5)">5</a>
    </div>
  </body>
</html>
`

const secondJobsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job results | Dr Reddy</title>
    <link rel="canonical" href="https://careers.drreddys.com/jobs" />
  </head>
  <body>
    <h1>Job results</h1>
    <div class="attrax-vacancy-tile sector-production-sterile sector-manufacturing attrax-vacancy-tile--full-time attrax-vacancy-tile--pydibimavaram attrax-vacancy-tile--andhra-pradesh attrax-vacancy-tile--india attrax-vacancy-tile--gmo attrax-vacancy-tile--no-author" data-jobid="5105">
      <div class="attrax-vacancy-tile__expand-btn" role="button" aria-label="click here to expand"></div>
      <a aria-level="3" class="attrax-vacancy-tile__title attrax-vacancy-tile__item attrax-button" href="/job/team-member-manufacturing-qms-in-pydibimavaram-jid-5105" role="heading" tabindex="0">Team Member - Manufacturing QMS</a>
      <div class="attrax-vacancy-tile__location-freetext attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__item-label">Location</p>
        <p class="attrax-vacancy-tile__item-value">Pydibimavaram</p>
      </div>
      <div class="attrax-vacancy-tile__option-type-of-working attrax-vacancy-tile__option-type-of-working--full-time attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__option-type-of-working-label attrax-vacancy-tile__item-label">Type of Working</p>
        <div class="attrax-vacancy-tile__option-type-of-working-valueset attrax-vacancy-tile__item-valueset">
          <p class="attrax-vacancy-tile__item-value">Full Time</p>
        </div>
      </div>
      <div class="attrax-vacancy-tile__option-job-family attrax-vacancy-tile__option-job-family--production-sterile attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__option-job-family-label attrax-vacancy-tile__item-label">Job Family</p>
        <div class="attrax-vacancy-tile__option-job-family-valueset attrax-vacancy-tile__item-valueset">
          <p class="attrax-vacancy-tile__item-value">Production - Sterile</p>
        </div>
      </div>
      <div class="attrax-vacancy-tile__option-business-unit attrax-vacancy-tile__option-business-unit--gmo attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__option-business-unit-label attrax-vacancy-tile__item-label">Business Unit</p>
        <div class="attrax-vacancy-tile__option-business-unit-valueset attrax-vacancy-tile__item-valueset">
          <p class="attrax-vacancy-tile__item-value">GMO</p>
        </div>
      </div>
      <div class="attrax-vacancy-tile__description attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__description-label attrax-vacancy-tile__item-label">Description</p>
        <p class="attrax-vacancy-tile__description-value attrax-vacancy-tile__item-value">
          Job Summary &#xA;We are looking for an individual to oversee day-to-day production operations, including guiding and coaching employees, ensuring equipment safety and maintenance, and executing batch manu
        </p>
      </div>
      <div class="attrax-vacancy-tile__reference attrax-vacancy-tile__item">
        <p class="attrax-vacancy-tile__reference-label attrax-vacancy-tile__item-label">Reference</p>
        <p class="attrax-vacancy-tile__reference-value attrax-vacancy-tile__item-value">91f7c9d4-2746-4e01-8e1b-9fd5105abcd1</p>
      </div>
    </div>
    <div class="attrax-pagination__container">
      <a href="javascript:pagination(1)">1</a>
      <a href="javascript:pagination(2)">2</a>
      <a href="javascript:pagination(5)">5</a>
    </div>
  </body>
</html>
`

const detailPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Data Analyst - HR Analytics job in Hyderabad | Dr Reddy</title>
  </head>
  <body>
    <div class="vacancy-buttons-widget">
      <a class="jobApplyBtn btn btn-default" href="/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&amp;vacancyId=5118">
        Apply
      </a>
    </div>
    <div class="description-widget" data-type="DescriptionWidget" id="59f8e155-f719-44f2-8836-23ad4bcf4fe9">
      <div aria-label="Job description"><br/><div class='jobad-jobdescription'>Job Description</div><br/><p>We are seeking an experienced and dynamic HR Tech Analyst to be an integral part of a dynamic team, supporting complex and high-visibility HR process improvement and technology implementation initiatives across multiple regions. Your role will require a combination of expertise in HR process improvement and technology implementation, contributing to the enhancement of the overall employee experience through digital solutions.</p><p><strong>Roles &amp; Responsibilities</strong></p><ul><li>You will be responsible for owning end-to-end employee data with support from business, COE, and partner teams.</li><li>You will be responsible for ensuring data integrity for accurate HR processes across systems and supporting audit processes.</li><li>You will be responsible for implementing effective check processes to enhance data quality, including error detection and correction.</li><li>You will be responsible for supporting COE data requirements, collaborating with People Analytics teams to publish dashboards.</li><li>You will be responsible for optimizing processes through collaboration with IT and business teams, focusing on simplification and automation.</li><li>You will be responsible for executing and delivering data services according to defined Service Level Agreements (TAT, quality, and Customer satisfaction).</li><li>You will be responsible for ensuring master data integrity in key systems and identifying areas for data quality improvements.</li><li>You will be responsible for conducting data cleaning, central creation, and maintenance of master data across systems.</li><li>You will be responsible for enforcing compliance with corporate data standards and creating an audit trail for master data changes.</li></ul><br/><div class='jobad-qualifications'>Qualifications</div><br/><p><strong>Educational qualification</strong></p><p>Post Graduation in Management/ MBA</p><p><strong>Minimum work Experience</strong></p><p>5-8 years of experience in HR and SAP</p><p><strong>Skills &amp; attributes Technical Skills</strong></p><ul><li>Knowledge of other human resource Management System (HRMS) &amp; Success Factors.</li><li>Must be skilled at MS Office Suite with advanced Excel and PowerPoint skills</li><li>Experience in Planning &amp; Project Management</li><li>Ability to create minimal and meaningful presentation to communicate your findings</li><li>Good Experience of data crunching in Excel</li></ul><p><strong>Behavioural Skills</strong></p><ul><li>Excellent communication and interpersonal skills.</li><li>Collaborative Skill sets and result oriented.</li><li>Strong analytical and problem-solving abilities.</li><li>Excellent Time Management and organisation skills</li></ul></div>
    </div>
  </body>
</html>
`

const loadDrReddysModule = async () => {
  try {
    return await import('../drreddyslaboratories/script.js')
  } catch {
    assert.fail('Expected Dr. Reddy\'s Laboratories scraper module at ../drreddyslaboratories/script.js')
  }
}

test('Dr. Reddy\'s Laboratories scraper stays pinned to the verified first-party careers handoff and Attrax jobs pages', async () => {
  const drReddys = await loadDrReddysModule()

  assert.equal(drReddys.COMPANY_NAME, 'Dr. Reddy\'s Laboratories')
  assert.equal(drReddys.SOURCE, 'drreddyslaboratories')
  assert.equal(drReddys.VERIFIED_AT, '2026-07-15')
  assert.equal(drReddys.HOMEPAGE_URL, 'https://www.drreddys.com/')
  assert.equal(drReddys.CAREERS_LANDING_PAGE_URL, 'https://careers.drreddys.com/')
  assert.equal(drReddys.JOBS_PAGE_URL, 'https://careers.drreddys.com/jobs')
  assert.equal(
    drReddys.VERIFIED_JOB_URL,
    'https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118',
  )
  assert.equal(
    drReddys.VERIFIED_APPLY_URL,
    'https://careers.drreddys.com/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5118',
  )
  assert.equal(drReddys.buildJobsPageUrl(1), 'https://careers.drreddys.com/jobs')
  assert.equal(drReddys.buildJobsPageUrl(2), 'https://careers.drreddys.com/jobs?page=2')
  assert.equal(drReddys.extractCareersHandoffUrl(officialHomepageHtml), 'https://careers.drreddys.com/')
  assert.equal(drReddys.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(drReddys.hasOfficialCareersLandingSignal(careersLandingPageHtml), true)
  assert.equal(drReddys.hasOfficialJobsPageSignal(jobsPageHtml), true)
  assert.equal(drReddys.hasOfficialDetailPageSignal(detailPageHtml), true)
  assert.equal(drReddys.extractTotalPages(jobsPageHtml), 5)
})

test('extractSearchResults keeps India Attrax vacancies and normalizes Dr. Reddy\'s listing fields', async () => {
  const drReddys = await loadDrReddysModule()

  assert.deepEqual(drReddys.extractSearchResults(jobsPageHtml), [{
    title: 'Data Analyst - HR Analytics',
    company: 'Dr. Reddy\'s Laboratories',
    department: 'People Analytics',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: '5118',
    requisitionId: '2266f60b-55b6-4e11-abba-fd5b8c76424a',
    sourceUrl: 'https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118',
    applyUrl: 'https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'We are seeking an experienced and dynamic HR Tech Analyst to be an integral part of a dynamic team, supporting complex and high-visibility HR process improvement and technology implementation initiati',
  }])

  const [pageTwoJob] = drReddys.extractSearchResults(secondJobsPageHtml)
  assert.equal(pageTwoJob.jobId, '5105')
  assert.equal(pageTwoJob.title, 'Team Member - Manufacturing QMS')
  assert.equal(pageTwoJob.location, 'Pydibimavaram, India')
  assert.equal(pageTwoJob.department, 'Production - Sterile')
  assert.equal(pageTwoJob.employmentType, 'Full Time')
})

test('extractJobDetail enriches Dr. Reddy\'s detail pages with workflow apply links and qualification fields', async () => {
  const drReddys = await loadDrReddysModule()
  const [listing] = drReddys.extractSearchResults(jobsPageHtml)

  const job = drReddys.extractJobDetail(detailPageHtml, listing)

  assert.equal(
    job.applyUrl,
    'https://careers.drreddys.com/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5118',
  )
  assert.equal(job.minimumQualification, 'Post Graduation in Management/ MBA')
  assert.equal(job.experienceRequired, '5-8 years of experience in HR and SAP')
  assert.deepEqual(job.requiredSkills, [
    'Knowledge of other human resource Management System (HRMS) & Success Factors.',
    'Must be skilled at MS Office Suite with advanced Excel and PowerPoint skills',
    'Experience in Planning & Project Management',
    'Ability to create minimal and meaningful presentation to communicate your findings',
    'Good Experience of data crunching in Excel',
    'Excellent communication and interpersonal skills.',
    'Collaborative Skill sets and result oriented.',
    'Strong analytical and problem-solving abilities.',
    'Excellent Time Management and organisation skills',
  ])
  assert.match(job.jobDescription, /^Job Description We are seeking an experienced and dynamic HR Tech Analyst/i)
  assert.match(job.jobDescription, /Roles & Responsibilities/i)
  assert.match(job.jobDescription, /Qualifications/i)
})

test('run verifies the Dr. Reddy\'s handoff pages, crawls paginated India listings, and enriches detail pages', async () => {
  const drReddys = await loadDrReddysModule()
  const requestedUrls = []

  const secondDetailPageHtml = detailPageHtml
    .replaceAll('5118', '5105')
    .replace('Data Analyst - HR Analytics job in Hyderabad | Dr Reddy', 'Team Member - Manufacturing QMS job in Pydibimavaram | Dr Reddy')
    .replace(/HR Tech Analyst/g, 'manufacturing QMS team member')
    .replace(/HR process improvement and technology implementation initiatives across multiple regions\./g, 'production quality management activities across the sterile manufacturing site.')
    .replace(/Post Graduation in Management\/ MBA/g, 'B.Pharm or M.Sc')
    .replace(/5-8 years of experience in HR and SAP/g, '2-6 years of experience in sterile manufacturing quality systems')
    .replace(/Knowledge of other human resource Management System \(HRMS\) &amp; Success Factors\./g, 'Knowledge of GMP documentation and quality management systems.')
    .replace(/Must be skilled at MS Office Suite with advanced Excel and PowerPoint skills/g, 'Must be skilled in batch record review and deviation handling')
    .replace(/Experience in Planning &amp; Project Management/g, 'Experience in line clearance and shop-floor coordination')
    .replace(/Ability to create minimal and meaningful presentation to communicate your findings/g, 'Ability to communicate observations to production and quality stakeholders')
    .replace(/Good Experience of data crunching in Excel/g, 'Good experience with sterile manufacturing documentation')

  const jobs = await drReddys.createDrReddysLaboratoriesScraper({
    maxPages: 2,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === drReddys.HOMEPAGE_URL) return officialHomepageHtml
      if (url === drReddys.CAREERS_LANDING_PAGE_URL) return careersLandingPageHtml
      if (url === drReddys.JOBS_PAGE_URL) return jobsPageHtml
      if (url === drReddys.buildJobsPageUrl(2)) return secondJobsPageHtml
      if (url === drReddys.VERIFIED_JOB_URL) return detailPageHtml
      if (url === 'https://careers.drreddys.com/job/team-member-manufacturing-qms-in-pydibimavaram-jid-5105') return secondDetailPageHtml

      throw new Error(`Unexpected Dr. Reddy's URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.drreddys.com/',
    'https://careers.drreddys.com/',
    'https://careers.drreddys.com/jobs',
    'https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118',
    'https://careers.drreddys.com/jobs?page=2',
    'https://careers.drreddys.com/job/team-member-manufacturing-qms-in-pydibimavaram-jid-5105',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'drreddyslaboratories')
  assert.equal(jobs[0].company, 'Dr. Reddy\'s Laboratories')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[1].city, 'Pydibimavaram')
  assert.equal(
    jobs[1].applyUrl,
    'https://careers.drreddys.com/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5105',
  )
})

test('Dr. Reddy\'s scraper fails closed when the verified handoff or Attrax detail page drifts', async () => {
  const drReddys = await loadDrReddysModule()

  await assert.rejects(
    drReddys.createDrReddysLaboratoriesScraper().run({
      fetchText: async (url) => {
        if (url === drReddys.HOMEPAGE_URL) {
          return '<html><body><a href="https://example.com/jobs">Careers</a></body></html>'
        }

        throw new Error(`Unexpected Dr. Reddy's URL: ${url}`)
      },
    }),
    /verified Dr\. Reddy's homepage careers handoff|verified official homepage|official Dr\. Reddy's homepage/i,
  )

  await assert.rejects(
    drReddys.createDrReddysLaboratoriesScraper({ maxPages: 1 }).run({
      fetchText: async (url) => {
        if (url === drReddys.HOMEPAGE_URL) return officialHomepageHtml
        if (url === drReddys.CAREERS_LANDING_PAGE_URL) return careersLandingPageHtml
        if (url === drReddys.JOBS_PAGE_URL) return jobsPageHtml
        if (url === drReddys.VERIFIED_JOB_URL) {
          return '<html><body><h1>Data Analyst - HR Analytics</h1></body></html>'
        }

        throw new Error(`Unexpected Dr. Reddy's URL: ${url}`)
      },
    }),
    /Dr\. Reddy's verified detail page|verified Dr\. Reddy's detail page/i,
  )
})
