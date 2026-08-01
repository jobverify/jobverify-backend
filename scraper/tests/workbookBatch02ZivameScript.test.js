import assert from 'node:assert/strict'
import test from 'node:test'

const loadZivameModule = async () => {
  try {
    return await import('../workbookbatch02/zivame.js')
  } catch {
    assert.fail('Expected Zivame scraper module at ../workbookbatch02/zivame.js')
  }
}

const officialCareersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Zivame Careers</title>
  </head>
  <body>
    <section>
      <h2>About US</h2>
      <p>We believe that every woman deserves to be comfortable and confident at all times.</p>
      <h2>Why Join Zivame?</h2>
      <h2>Department Job Openings</h2>
      <div class="jobs">
        <a class="opening-card" href="https://careers.zivame.com/job-openings/frontend-developer/">
          <span>Frontend Developer</span>
        </a>
        <a class="opening-card" href="https://careers.zivame.com/job-openings/ios-developer/">
          <span>iOS Developer</span>
        </a>
        <a class="opening-card" href="https://careers.zivame.com/job-openings/qa-engineer-automation/">
          <span>QA Engineer - Automation</span>
        </a>
      </div>
      <h2>Life @ Zivame</h2>
      <p>Zivame HQ, Indiranagar, Bengaluru | Email: careers@zivame.com</p>
    </section>
  </body>
</html>
`

const frontendDeveloperDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Frontend Developer - Zivame Careers</title>
  </head>
  <body>
    <article>
      <h1>Frontend Developer</h1>
      <p>Job Category: Technology</p>
      <p>Job Type: Full Time</p>
      <p>Job Location: Bangalore</p>
      <p>
        Being the leaders in our category, we're the trailblazers. We're a tech-first organization
        and that manifests itself into everything at Zivame.
      </p>
      <p>You MUST:</p>
      <ul>
        <li>Be fluent in jQuery, React, and Node.</li>
        <li>Have 2-4 years of experience.</li>
      </ul>
      <a href="https://forms.zivame.com/frontend-developer/apply">Click here to apply for this role</a>
      <p>Zivame HQ, Indiranagar, Bengaluru | Email: careers@zivame.com</p>
    </article>
  </body>
</html>
`

const iosDeveloperDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>iOS Developer - Zivame Careers</title>
  </head>
  <body>
    <article>
      <h1>iOS Developer</h1>
      <p>Job Category: Technology</p>
      <p>Job Type: Full Time</p>
      <p>Job Location: Bangalore</p>
      <p>
        Work closely with product management and UX to execute an idea from concept to delivery
        using excellent software design, coding, and processes.
      </p>
      <p>Skills &amp; Experience required</p>
      <ul>
        <li>Extensive knowledge with both Swift and Objective-C development.</li>
        <li>2-4 years of work experience with an Ecommerce/Product Based Organization.</li>
      </ul>
      <a href="https://forms.zivame.com/ios-developer/apply">Click here to apply for this role</a>
      <p>Zivame HQ, Indiranagar, Bengaluru | Email: careers@zivame.com</p>
    </article>
  </body>
</html>
`

const qaEngineerAutomationDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>QA Engineer - Automation - Zivame Careers</title>
  </head>
  <body>
    <article>
      <h1>QA Engineer - Automation</h1>
      <p>Job Category: Technology</p>
      <p>Job Type: Full Time</p>
      <p>Job Location: Bangalore</p>
      <p>
        We're a tech-first organization and that manifests itself into everything at Zivame.
        We solve difficult problems and build world-class platforms.
      </p>
      <p>Skills:</p>
      <ul>
        <li>Solid knowledge on Java Selenium.</li>
        <li>2-3 years' experience in Automation testing.</li>
      </ul>
      <a href="https://forms.zivame.com/qa-engineer-automation/apply">Click here to apply for this role</a>
      <p>Zivame HQ, Indiranagar, Bengaluru | Email: careers@zivame.com</p>
    </article>
  </body>
</html>
`

test('Zivame pins the verified first-party careers page and same-origin role pages', async () => {
  const zivame = await loadZivameModule()

  assert.equal(zivame.SOURCE, 'zivame')
  assert.equal(zivame.COMPANY, 'Zivame')
  assert.equal(zivame.VERIFIED_ON, '2026-07-30')
  assert.equal(zivame.CAREERS_URL, 'https://careers.zivame.com/')
  assert.equal(zivame.hasOfficialCareersPageSignal(officialCareersPageHtml), true)
  assert.equal(zivame.hasOfficialDetailPageSignal(frontendDeveloperDetailHtml), true)
})

test('Zivame run validates the official careers page and maps the current India role pages', async () => {
  const zivame = await loadZivameModule()
  const requestedUrls = []

  const jobs = await zivame.createZivameScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === zivame.CAREERS_URL) return officialCareersPageHtml
      if (url === 'https://careers.zivame.com/job-openings/frontend-developer/') {
        return frontendDeveloperDetailHtml
      }
      if (url === 'https://careers.zivame.com/job-openings/ios-developer/') {
        return iosDeveloperDetailHtml
      }
      if (url === 'https://careers.zivame.com/job-openings/qa-engineer-automation/') {
        return qaEngineerAutomationDetailHtml
      }

      throw new Error(`Unexpected Zivame fixture URL: ${url}`)
    },
    now: () => '2026-07-30T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    zivame.CAREERS_URL,
    'https://careers.zivame.com/job-openings/frontend-developer/',
    'https://careers.zivame.com/job-openings/ios-developer/',
    'https://careers.zivame.com/job-openings/qa-engineer-automation/',
  ])

  assert.deepEqual(jobs, [
    {
      title: 'Frontend Developer',
      company: 'Zivame',
      department: 'Technology',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      link: 'https://careers.zivame.com/job-openings/frontend-developer/',
      applyUrl: 'https://forms.zivame.com/frontend-developer/apply',
      sourceUrl: 'https://careers.zivame.com/job-openings/frontend-developer/',
      source: 'zivame',
      jobId: 'frontend-developer',
      requisitionId: 'frontend-developer',
      employmentType: 'Full Time',
      experienceRequired: '2-4 years of experience.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        "Being the leaders in our category, we're the trailblazers. We're a tech-first organization and that manifests itself into everything at Zivame. Be fluent in jQuery, React, and Node. Have 2-4 years of experience.",
      remoteStatus: null,
      scrapedAt: '2026-07-30T00:00:00.000Z',
    },
    {
      title: 'iOS Developer',
      company: 'Zivame',
      department: 'Technology',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      link: 'https://careers.zivame.com/job-openings/ios-developer/',
      applyUrl: 'https://forms.zivame.com/ios-developer/apply',
      sourceUrl: 'https://careers.zivame.com/job-openings/ios-developer/',
      source: 'zivame',
      jobId: 'ios-developer',
      requisitionId: 'ios-developer',
      employmentType: 'Full Time',
      experienceRequired: '2-4 years of work experience with an Ecommerce/Product Based Organization.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        'Work closely with product management and UX to execute an idea from concept to delivery using excellent software design, coding, and processes. Extensive knowledge with both Swift and Objective-C development. 2-4 years of work experience with an Ecommerce/Product Based Organization.',
      remoteStatus: null,
      scrapedAt: '2026-07-30T00:00:00.000Z',
    },
    {
      title: 'QA Engineer - Automation',
      company: 'Zivame',
      department: 'Technology',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      link: 'https://careers.zivame.com/job-openings/qa-engineer-automation/',
      applyUrl: 'https://forms.zivame.com/qa-engineer-automation/apply',
      sourceUrl: 'https://careers.zivame.com/job-openings/qa-engineer-automation/',
      source: 'zivame',
      jobId: 'qa-engineer-automation',
      requisitionId: 'qa-engineer-automation',
      employmentType: 'Full Time',
      experienceRequired: "2-3 years' experience in Automation testing.",
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        "We're a tech-first organization and that manifests itself into everything at Zivame. We solve difficult problems and build world-class platforms. Solid knowledge on Java Selenium. 2-3 years' experience in Automation testing.",
      remoteStatus: null,
      scrapedAt: '2026-07-30T00:00:00.000Z',
    },
  ])
})
