import assert from 'node:assert/strict'
import test from 'node:test'

const JOBS_HOST_HTML = `
<!doctype html>
<html>
  <head><title>Bentley Systems</title></head>
  <body>
    <a href="https://www.bentley.com/company/careers/">Careers</a>
    <a href="https://jobs.bentley.com/search/?searchby=location&amp;q=&amp;locationsearch=&amp;geolocation=">Search Jobs</a>
  </body>
</html>
`

const INDIA_SEARCH_HTML = `
<html>
  <body>
    locationsearch=India
    <table>
      <tr class="data-row">
        <td class="colTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Pune-Senior-Software-Engineer/1409448100/" class="jobTitle-link">Senior Software Engineer</a>
          </span>
        </td>
        <td class="colLocation"><span class="jobLocation">Pune, IN</span></td>
        <td class="colDate"><span class="jobDate">Jul 16, 2026</span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Kolkata-User-Engagement-Advocate/1405551000/" class="jobTitle-link">User Engagement Advocate</a>
          </span>
        </td>
        <td class="colLocation"><span class="jobLocation">Kolkata, WB, IN</span></td>
        <td class="colDate"><span class="jobDate">Jul 15, 2026</span></td>
      </tr>
    </table>
  </body>
</html>
`

const DETAIL_HTML = `
<html>
  <body>
    <div class="jobTitle">
      <h1 id="job-title" itemprop="title">Senior Software Engineer</h1>
      <div class="applylink pull-right">
        <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn" href="/talentcommunity/apply/1409448100/?locale=en_US">Apply now »</a>
      </div>
    </div>
    <p class="jobDate"><strong>Date: </strong>Jul 16, 2026</p>
    <p class="jobLocation"><strong>Location:</strong><span class="jobGeoLocation">Pune, IN</span></p>
    <meta itemprop="validThrough" content="Mon Aug 31 18:30:00 UTC 2026">
    <div itemprop="description" class="jobdescription">
      <p><strong>Position Summary:</strong></p>
      <p>We are looking for a Senior Software Engineer with an experience in Data Engineering.</p>
    </div>
    <aside></aside>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../bentleysystems/script.js')
  } catch {
    assert.fail('Expected Bentley Systems scraper module at ../bentleysystems/script.js')
  }
}

test('Bentley Systems extracts India search results and detail metadata from the first-party jobs host', async () => {
  const bentley = await loadScriptModule()

  assert.equal(bentley.hasOfficialJobsHostSignal(JOBS_HOST_HTML), true)
  assert.equal(bentley.hasIndiaSearchResultsSignal(INDIA_SEARCH_HTML), true)
  const listings = bentley.extractSearchResults(INDIA_SEARCH_HTML)

  assert.equal(listings.length, 2)
  assert.deepEqual(listings[0], {
    title: 'Senior Software Engineer',
    company: 'Bentley Systems',
    department: null,
    location: 'Pune, IN',
    city: 'Pune',
    country: 'India',
    jobId: '1409448100',
    requisitionId: '1409448100',
    sourceUrl: 'https://jobs.bentley.com/job/Pune-Senior-Software-Engineer/1409448100/',
    applyUrl: 'https://jobs.bentley.com/job/Pune-Senior-Software-Engineer/1409448100/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: 'Jul 16, 2026',
    closingDate: null,
    jobDescription: null,
  })

  const detail = bentley.extractJobDetail(DETAIL_HTML, listings[0])
  assert.equal(detail.applyUrl, 'https://jobs.bentley.com/talentcommunity/apply/1409448100/?locale=en_US')
  assert.equal(detail.closingDate, '2026-08-31')
  assert.match(detail.jobDescription, /Data Engineering/i)
})

test('Bentley Systems run stitches search and detail pages into runnable jobs', async () => {
  const bentley = await loadScriptModule()
  const requestedUrls = []

  const jobs = await bentley.createBentleySystemsScraper({
    now: () => '2026-07-18T12:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === bentley.JOBS_HOST_URL) return JOBS_HOST_HTML
      if (url === bentley.INDIA_SEARCH_URL) return INDIA_SEARCH_HTML
      return DETAIL_HTML
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'bentleysystems')
  assert.equal(jobs[0].companyCareerPage, 'https://www.bentley.com/company/careers/')
  assert.equal(jobs[0].companyDomain, 'bentley.com')
  assert.equal(jobs[0].atsPlatform, 'successfactors')
  assert.deepEqual(requestedUrls, [
    bentley.JOBS_HOST_URL,
    bentley.INDIA_SEARCH_URL,
    'https://jobs.bentley.com/job/Pune-Senior-Software-Engineer/1409448100/',
    'https://jobs.bentley.com/job/Kolkata-User-Engagement-Advocate/1405551000/',
  ])
})

test('Bentley Systems fails closed when the jobs host drifts materially', async () => {
  const bentley = await loadScriptModule()

  await assert.rejects(
    bentley.createBentleySystemsScraper().run({
      fetchText: async () => '<html><body>Unexpected</body></html>',
    }),
    /verified first-party jobs host/i,
  )
})
