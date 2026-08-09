import assert from 'node:assert/strict'
import test from 'node:test'

const loadBceGlobalTechModule = async () => {
  try {
    return await import('../../scraper/bceglobaltech/script.js')
  } catch {
    assert.fail('Expected BCE Global Tech scraper module at ../../scraper/scraper/bceglobaltech/script.js')
  }
}

const buildWrappedPayload = (records) => ({
  statusCode: 200,
  body: JSON.stringify({
    data: JSON.stringify(records),
  }),
})

const sampleRecords = [
  {
    Job_Opening_Name: 'Desktop Engineer',
    Job_Type: 'Full time',
    Country: 'India',
    City: 'Bengaluru',
    Department: 'IT Infrastructure',
    Date_Opened: '2026-07-01',
    Job_Description: '<p>Support end-user devices and workplace tooling.</p>',
    Skill_Set: 'Windows, SCCM, Endpoint Management',
    id: '147575000033601315',
    $url: 'https://bceglobaltech.zohorecruit.in/jobs/Careers/147575000033601315/Desktop-Engineer?source=CareerSite&$apply=true',
  },
  {
    Job_Opening_Name: 'Systems Analyst',
    Job_Type: 'Contract',
    Country: 'Canada',
    City: 'Toronto',
    Department: 'Enterprise Systems',
    Date_Opened: '2026-07-02',
    Job_Description: '<div>Improve internal platforms.</div>',
    Skill_Set: ['SQL', 'Power BI'],
    id: '147575000033601400',
    $url: 'https://bceglobaltech.zohorecruit.in/jobs/Careers/147575000033601400/Systems-Analyst?source=CareerSite&$apply=true',
  },
]

const careerPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <script defer="defer" src="/static/js/main.1e784ffe.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const bundleJs = `
  window.__env = {
    jobsApiUrl: "https://uh2nqa8l04.execute-api.ca-central-1.amazonaws.com/prod/joblist"
  };
  axios.get("https://uh2nqa8l04.execute-api.ca-central-1.amazonaws.com/prod/joblist",{
    headers:{authorizationToken:"frontend-bundle-token"}
  });
`

test('BCE Global Tech scraper constants stay pinned to the public careers and jobs API surfaces', async () => {
  const bceglobaltech = await loadBceGlobalTechModule()

  assert.equal(bceglobaltech.CAREER_PAGE_URL, 'https://bceglobaltech.com/career')
  assert.equal(
    bceglobaltech.JOBS_API_URL,
    'https://uh2nqa8l04.execute-api.ca-central-1.amazonaws.com/prod/joblist',
  )
  assert.equal(bceglobaltech.AUTHORIZATION_HEADER_NAME, 'authorizationToken')
  assert.deepEqual(
    bceglobaltech.buildRequestHeaders({ authorizationToken: 'frontend-token' }),
    {
      Accept: 'application/json,text/plain,*/*',
      authorizationToken: 'frontend-token',
    },
  )
})

test('BCE Global Tech can resolve the public React bundle URL and extract the shipped authorization token', async () => {
  const bceglobaltech = await loadBceGlobalTechModule()

  assert.equal(
    bceglobaltech.extractBundleScriptUrl(careerPageHtml, bceglobaltech.CAREER_PAGE_URL),
    'https://bceglobaltech.com/static/js/main.1e784ffe.js',
  )
  assert.equal(
    bceglobaltech.extractAuthorizationToken(bundleJs),
    'frontend-bundle-token',
  )
})

test('extractSearchResults unwraps the double-encoded API payload and normalizes BCE Global Tech jobs', async () => {
  const bceglobaltech = await loadBceGlobalTechModule()
  const jobs = bceglobaltech.extractSearchResults(buildWrappedPayload(sampleRecords))

  assert.deepEqual(jobs, [
    {
      title: 'Desktop Engineer',
      company: 'BCE Global Tech',
      department: 'IT Infrastructure',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '147575000033601315',
      requisitionId: '147575000033601315',
      sourceUrl: 'https://bceglobaltech.zohorecruit.in/jobs/Careers/147575000033601315/Desktop-Engineer?source=CareerSite&$apply=true',
      applyUrl: 'https://bceglobaltech.zohorecruit.in/jobs/Careers/147575000033601315/Desktop-Engineer?source=CareerSite&$apply=true',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Windows', 'SCCM', 'Endpoint Management'],
      postingDate: '2026-07-01',
      closingDate: null,
      jobDescription: 'Support end-user devices and workplace tooling.',
    },
    {
      title: 'Systems Analyst',
      company: 'BCE Global Tech',
      department: 'Enterprise Systems',
      location: 'Toronto, Canada',
      city: 'Toronto',
      country: 'Canada',
      jobId: '147575000033601400',
      requisitionId: '147575000033601400',
      sourceUrl: 'https://bceglobaltech.zohorecruit.in/jobs/Careers/147575000033601400/Systems-Analyst?source=CareerSite&$apply=true',
      applyUrl: 'https://bceglobaltech.zohorecruit.in/jobs/Careers/147575000033601400/Systems-Analyst?source=CareerSite&$apply=true',
      employmentType: 'Contract',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['SQL', 'Power BI'],
      postingDate: '2026-07-02',
      closingDate: null,
      jobDescription: 'Improve internal platforms.',
    },
  ])
})

test('run fetches the official BCE Global Tech jobs API with an injectable authorization token and decorates jobs', async () => {
  const bceglobaltech = await loadBceGlobalTechModule()
  const requests = []
  const scraper = bceglobaltech.createBceGlobalTechScraper({ authorizationToken: 'test-token', maxJobs: 1 })

  const jobs = await scraper.run({
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })
      return buildWrappedPayload(sampleRecords)
    },
  })

  assert.deepEqual(requests, [
    {
      url: bceglobaltech.JOBS_API_URL,
      options: {
        headers: {
          Accept: 'application/json,text/plain,*/*',
          authorizationToken: 'test-token',
        },
      },
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'bceglobaltech')
  assert.equal(jobs[0].company, 'BCE Global Tech')
  assert.equal(
    jobs[0].link,
    'https://bceglobaltech.zohorecruit.in/jobs/Careers/147575000033601315/Desktop-Engineer?source=CareerSite&$apply=true',
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('run can discover the public authorization token from the BCE Global Tech careers bundle when no secret is injected', async () => {
  const bceglobaltech = await loadBceGlobalTechModule()
  const requests = []
  const textRequests = []
  const scraper = bceglobaltech.createBceGlobalTechScraper({ authorizationToken: null, maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      textRequests.push(url)
      if (url === bceglobaltech.CAREER_PAGE_URL) return careerPageHtml
      if (url === 'https://bceglobaltech.com/static/js/main.1e784ffe.js') return bundleJs
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })
      return buildWrappedPayload(sampleRecords)
    },
  })

  assert.deepEqual(textRequests, [
    'https://bceglobaltech.com/career',
    'https://bceglobaltech.com/static/js/main.1e784ffe.js',
  ])
  assert.deepEqual(requests, [
    {
      url: bceglobaltech.JOBS_API_URL,
      options: {
        headers: {
          Accept: 'application/json,text/plain,*/*',
          authorizationToken: 'frontend-bundle-token',
        },
      },
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'bceglobaltech')
})
