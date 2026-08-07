import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_PAGE_HTML = `
<!doctype html>
<html>
  <head>
    <title>Softura Careers - Explore Opportunities</title>
  </head>
  <body>
    <h1>Softura - Careers</h1>
    <p>Building a Culture of Software Excellence and Creating an Open, Fair and Transparent Workplace.</p>
    <p>Find a Position</p>
    <a href="https://www.softura.com/java-senior-developer-job-in-ahmedabad/">Apply Now</a>
    <a href="https://www.softura.com/us-job-details-1/">Apply Now</a>
    <a href="https://softura.zohorecruit.in/jobs/Careers/217787000000954033/Java-Developer?source=CareerSite">Apply Now</a>
    <a href="https:/">Apply Now</a>
    <a href="https://www.softura.com/business-development-executive/">Apply Now</a>
  </body>
</html>
`

const INDIA_DETAIL_HTML = `
<!doctype html>
<html>
  <head>
    <title>Java Senior Developer Job in Ahmedabad | Softura</title>
  </head>
  <body>
    <div>Softura - Careers</div>
    <div>Experience 3+ years Work Location Ahmedabad No. of Positions 2 Industry Type Information Technology</div>
  </body>
</html>
`

const US_DETAIL_HTML = `
<!doctype html>
<html>
  <head>
    <title>Lead Software Engineer Jobs - IoT Solutions Job | Softura</title>
  </head>
  <body>
    <div>Softura - Careers</div>
    <div>Experience 5+ years Work Location Detroit No. of Positions 1 Industry Type Information Technology</div>
  </body>
</html>
`

const AMBIGUOUS_REMOTE_DETAIL_HTML = `
<!doctype html>
<html>
  <head>
    <title>Business Development Executive | Softura</title>
  </head>
  <body>
    <div>Softura - Careers</div>
    <div>Experience 2-4 Years Location Remote/Hybrid Employment Full-Time Compensation Competitive base salary</div>
  </body>
</html>
`

const ZOHO_DETAIL_HTML = `
<!doctype html>
<html>
  <head>
    <title>Softura Private Limited - Java Developer in Chennai</title>
    <meta name="description" content="Softura Private Limited Job Title Software Engineer - Java Experience- 3 - 5 Years Location -Chennai Key Responsibilities Design and develop services" />
  </head>
  <body></body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/softura/script.js')
  } catch {
    assert.fail('Expected Softura scraper module at ../../scraper/softura/script.js')
  }
}

test('Softura recognizes the verified public careers page and extracts valid Apply Now links', async () => {
  const softura = await loadScriptModule()

  assert.equal(softura.hasOfficialCareersSignal(CAREERS_PAGE_HTML), true)
  assert.deepEqual(softura.extractApplyUrls(CAREERS_PAGE_HTML), [
    'https://www.softura.com/java-senior-developer-job-in-ahmedabad',
    'https://www.softura.com/us-job-details-1',
    'https://softura.zohorecruit.in/jobs/Careers/217787000000954033/Java-Developer?source=CareerSite',
    'https://www.softura.com/business-development-executive',
  ])
})

test('Softura detail helpers keep only India jobs from first-party and Zoho detail pages', async () => {
  const softura = await loadScriptModule()

  assert.deepEqual(
    softura.extractFirstPartyJob({
      url: 'https://www.softura.com/java-senior-developer-job-in-ahmedabad',
      html: INDIA_DETAIL_HTML,
    }),
    {
      title: 'Java Senior Developer Job in Ahmedabad',
      company: 'Softura',
      department: null,
      location: 'Ahmedabad',
      city: 'Ahmedabad',
      state: null,
      country: 'India',
      jobId: 'java-senior-developer-job-in-ahmedabad',
      requisitionId: 'java-senior-developer-job-in-ahmedabad',
      sourceUrl: 'https://www.softura.com/java-senior-developer-job-in-ahmedabad',
      applyUrl: 'https://www.softura.com/java-senior-developer-job-in-ahmedabad',
      employmentType: null,
      experienceRequired: '3+ years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      workplaceType: null,
    },
  )
  assert.equal(
    softura.extractFirstPartyJob({
      url: 'https://www.softura.com/us-job-details-1',
      html: US_DETAIL_HTML,
    }),
    null,
  )
  assert.equal(
    softura.extractFirstPartyJob({
      url: 'https://www.softura.com/business-development-executive',
      html: AMBIGUOUS_REMOTE_DETAIL_HTML,
    }),
    null,
  )
  assert.deepEqual(
    softura.extractZohoJob({
      url: 'https://softura.zohorecruit.in/jobs/Careers/217787000000954033/Java-Developer?source=CareerSite',
      html: ZOHO_DETAIL_HTML,
    }),
    {
      title: 'Java Developer',
      company: 'Softura',
      department: null,
      location: 'Chennai',
      city: 'Chennai',
      state: null,
      country: 'India',
      jobId: '217787000000954033',
      requisitionId: '217787000000954033',
      sourceUrl: 'https://softura.zohorecruit.in/jobs/Careers/217787000000954033/Java-Developer?source=CareerSite',
      applyUrl: 'https://softura.zohorecruit.in/jobs/Careers/217787000000954033/Java-Developer?source=CareerSite',
      employmentType: null,
      experienceRequired: '3 - 5 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Softura Private Limited Job Title Software Engineer - Java Experience- 3 - 5 Years Location -Chennai Key Responsibilities Design and develop services',
      workplaceType: null,
    },
  )
})

test('Softura scraper returns only India jobs from the verified public careers page', async () => {
  const softura = await loadScriptModule()
  const requests = []

  const jobs = await softura.createSofturaScraper().run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === softura.CAREERS_URL) return CAREERS_PAGE_HTML
      if (url === 'https://www.softura.com/java-senior-developer-job-in-ahmedabad') return INDIA_DETAIL_HTML
      if (url === 'https://www.softura.com/us-job-details-1') return US_DETAIL_HTML
      if (url === 'https://softura.zohorecruit.in/jobs/Careers/217787000000954033/Java-Developer?source=CareerSite') return ZOHO_DETAIL_HTML
      if (url === 'https://www.softura.com/business-development-executive') return AMBIGUOUS_REMOTE_DETAIL_HTML
      throw new Error(`Unexpected URL ${url}`)
    },
    now: () => '2026-08-04T15:30:00.000Z',
  })

  assert.deepEqual(requests, [
    softura.CAREERS_URL,
    'https://www.softura.com/java-senior-developer-job-in-ahmedabad',
    'https://www.softura.com/us-job-details-1',
    'https://softura.zohorecruit.in/jobs/Careers/217787000000954033/Java-Developer?source=CareerSite',
    'https://www.softura.com/business-development-executive',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'softura')
  assert.equal(jobs[0].link, 'https://www.softura.com/java-senior-developer-job-in-ahmedabad')
  assert.equal(jobs[0].companyCareerPage, 'https://www.softura.com/careers/')
  assert.equal(jobs[0].companyDomain, 'softura.com')
  assert.equal(jobs[0].atsPlatform, 'first-party-detail-pages-plus-zoho-links')
  assert.equal(jobs[0].scrapedAt, '2026-08-04T15:30:00.000Z')
  assert.equal(jobs[1].title, 'Java Developer')
  assert.equal(jobs[1].country, 'India')
})

test('Softura scraper skips stale detail links that now return 404', async () => {
  const softura = await loadScriptModule()

  const jobs = await softura.createSofturaScraper().run({
    fetchText: async (url) => {
      if (url === softura.CAREERS_URL) {
        return `
          <!doctype html>
          <html>
            <head><title>Softura Careers - Explore Opportunities</title></head>
            <body>
              <h1>Softura - Careers</h1>
              <p>Building a Culture of Software Excellence and Creating an Open, Fair and Transparent Workplace.</p>
              <p>Find a Position</p>
              <a href="https://www.softura.com/senior-qa-pune">Apply Now</a>
              <a href="https://www.softura.com/python-senior-software-engineer-chennai/">Apply Now</a>
            </body>
          </html>
        `
      }

      if (url === 'https://www.softura.com/senior-qa-pune') {
        const error = new Error(`HTTP 404 for ${url}`)
        error.status = 404
        throw error
      }

      if (url === 'https://www.softura.com/python-senior-software-engineer-chennai') {
        return `
          <!doctype html>
          <html>
            <head><title>Python Senior Software Engineer Chennai | Softura</title></head>
            <body>
              <div>Softura - Careers</div>
              <div>Experience 5-6 years Location Chennai Employment Full-Time</div>
            </body>
          </html>
        `
      }

      throw new Error(`Unexpected URL ${url}`)
    },
    now: () => '2026-08-04T16:00:00.000Z',
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Python Senior Software Engineer Chennai')
  assert.equal(jobs[0].location, 'Chennai')
  assert.equal(jobs[0].country, 'India')
})

test('Softura fails closed if the verified public careers page disappears', async () => {
  const softura = await loadScriptModule()

  await assert.rejects(
    softura.createSofturaScraper().run({
      fetchText: async () => '<html><body>unexpected</body></html>',
    }),
    /verified public first-party careers page/i,
  )
})
