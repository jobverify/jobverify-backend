import assert from 'node:assert/strict'
import test from 'node:test'

const loadTataPowerModule = async () => {
  try {
    return await import('../../scraper/tatapower/script.js')
  } catch {
    assert.fail('Expected Tata Power scraper module at ../../scraper/tatapower/script.js')
  }
}

const searchPage1Html = `
<!doctype html>
<html>
  <body>
    <h1>Jobs at Tata Power</h1>
    <div class="pagination-label-row">
      <span class="paginationLabel" aria-label="Results 1 to 2">Results <b>1 to 2</b> of <b>2</b></span>
      <span class="srHelp">Page 1 of 1</span>
    </div>
    <table id="searchresults">
      <tbody>
        <tr class="data-row">
          <td class="colTitle">
            <span class="jobTitle hidden-phone">
              <a href="/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/" class="jobTitle-link">Manager - Grid Strategy</a>
            </span>
            <span class="jobTitle visible-phone">
              <a href="/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/" class="jobTitle-link">Manager - Grid Strategy</a>
            </span>
          </td>
          <td class="colDepartment"><span class="jobDepartment">Digital &amp; IT</span></td>
          <td class="colLocation"><span class="jobLocation">Mumbai, Maharashtra, India</span></td>
          <td class="colDate"><span class="jobDate">Jul 10, 2026</span></td>
        </tr>
        <tr class="data-row">
          <td class="colTitle">
            <span class="jobTitle hidden-phone">
              <a href="/job/Bengaluru-Senior-Engineer-Solar-Analytics-KA/1410001001/" class="jobTitle-link">Senior Engineer - Solar Analytics</a>
            </span>
          </td>
          <td class="colDepartment"><span class="jobDepartment">Solar Manufacturing</span></td>
          <td class="colLocation"><span class="jobLocation">Bengaluru, Karnataka, India</span></td>
          <td class="colDate"><span class="jobDate">Jul 9, 2026</span></td>
        </tr>
      </tbody>
    </table>
    <p>Tata Power. All Rights Reserved.</p>
  </body>
</html>
`

const detailPage1Html = `
<!doctype html>
<html>
  <body>
    <div class="jobDisplayShell" itemscope="itemscope" itemtype="http://schema.org/JobPosting">
      <p id="job-location"><span class="jobGeoLocation">Mumbai, Maharashtra, India</span></p>
      <meta itemprop="datePosted" content="2026-07-10" />
      <meta itemprop="validThrough" content="2026-07-25" />
      <div class="applylink pull-right">
        <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/1410001000/?locale=en_GB">Apply now</a>
      </div>
      <h1>
        <span itemprop="title" data-careersite-propertyid="title">Manager - Grid Strategy</span>
      </h1>
      <span data-careersite-propertyid="department">Digital &amp; IT</span>
      <span data-careersite-propertyid="shifttype">Full-time</span>
      <span itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Lead grid strategy planning for next-generation clean energy operations.</p>
          <ul>
            <li>Power systems modeling</li>
            <li>Cross-functional stakeholder management</li>
          </ul>
        </span>
      </span>
    </div>
  </body>
</html>
`

const detailPage2Html = `
<!doctype html>
<html>
  <body>
    <div class="jobDisplayShell" itemscope="itemscope" itemtype="http://schema.org/JobPosting">
      <p id="job-location"><span class="jobGeoLocation">Bengaluru, Karnataka, India</span></p>
      <meta itemprop="datePosted" content="2026-07-09" />
      <div class="applylink pull-right">
        <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/1410001001/?locale=en_US">Apply now</a>
      </div>
      <h1>
        <span itemprop="title" data-careersite-propertyid="title">Senior Engineer - Solar Analytics</span>
      </h1>
      <span data-careersite-propertyid="department">Solar Manufacturing</span>
      <span itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Build analytics workflows for solar manufacturing quality and yield.</p>
        </span>
      </span>
    </div>
  </body>
</html>
`

test('buildSearchUrl stays pinned to the official Tata Power public jobs2web route', async () => {
  const { buildSearchUrl } = await loadTataPowerModule()

  assert.equal(
    buildSearchUrl(),
    'https://careers.tatapower.com/search/?createNewAlert=false&locationsearch=&optionsFacetsDD_customfield1=&optionsFacetsDD_customfield2=&optionsFacetsDD_dept=&q=',
  )
  assert.equal(
    buildSearchUrl(25),
    'https://careers.tatapower.com/search/?createNewAlert=false&locationsearch=&optionsFacetsDD_customfield1=&optionsFacetsDD_customfield2=&optionsFacetsDD_dept=&q=&startrow=25',
  )
})

test('extractSearchResults parses Tata Power search rows from the official jobs2web surface', async () => {
  const { extractSearchResults, hasOfficialSearchResultsSignal } = await loadTataPowerModule()

  assert.equal(hasOfficialSearchResultsSignal(searchPage1Html), true)
  assert.deepEqual(extractSearchResults(searchPage1Html), [
    {
      title: 'Manager - Grid Strategy',
      department: 'Digital & IT',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: '1410001000',
      requisitionId: '1410001000',
      sourceUrl: 'https://careers.tatapower.com/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/',
      postingDate: 'Jul 10, 2026',
    },
    {
      title: 'Senior Engineer - Solar Analytics',
      department: 'Solar Manufacturing',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      jobId: '1410001001',
      requisitionId: '1410001001',
      sourceUrl: 'https://careers.tatapower.com/job/Bengaluru-Senior-Engineer-Solar-Analytics-KA/1410001001/',
      postingDate: 'Jul 9, 2026',
    },
  ])
})

test('extractResultsSummary reads Tata Power result counts from pagination chrome', async () => {
  const { extractResultsSummary } = await loadTataPowerModule()

  assert.deepEqual(extractResultsSummary(searchPage1Html), {
    totalResults: 2,
    currentPage: 1,
    totalPages: 1,
    pageSize: 2,
  })
})

test('extractJobDetail reads Tata Power detail metadata and apply URLs from the official job page', async () => {
  const { extractJobDetail } = await loadTataPowerModule()
  const detail = extractJobDetail(detailPage1Html, {
    title: 'Manager - Grid Strategy',
    department: 'Digital & IT',
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    jobId: '1410001000',
    requisitionId: '1410001000',
    sourceUrl: 'https://careers.tatapower.com/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/',
    postingDate: 'Jul 10, 2026',
  })

  assert.deepEqual(detail, {
    title: 'Manager - Grid Strategy',
    department: 'Digital & IT',
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    jobId: '1410001000',
    requisitionId: '1410001000',
    employmentType: 'Full-time',
    experienceRequired: null,
    jobDescription: 'Lead grid strategy planning for next-generation clean energy operations. - Power systems modeling - Cross-functional stakeholder management',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Power systems modeling',
      'Cross-functional stakeholder management',
    ],
    postingDate: '2026-07-10',
    closingDate: '2026-07-25',
    applyUrl: 'https://careers.tatapower.com/talentcommunity/apply/1410001000/?locale=en_GB',
    sourceUrl: 'https://careers.tatapower.com/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/',
  })
})

test('run validates the official Tata Power search page and decorates parsed jobs', async () => {
  const tataPower = await loadTataPowerModule()
  const requestedUrls = []

  const jobs = await tataPower.createTataPowerScraper().run({
    maxPages: 1,
    maxJobs: 2,
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === tataPower.buildSearchUrl()) return searchPage1Html
      if (url === 'https://careers.tatapower.com/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/') {
        return detailPage1Html
      }
      if (url === 'https://careers.tatapower.com/job/Bengaluru-Senior-Engineer-Solar-Analytics-KA/1410001001/') {
        return detailPage2Html
      }

      throw new Error(`Unexpected Tata Power URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    tataPower.buildSearchUrl(),
    'https://careers.tatapower.com/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/',
    'https://careers.tatapower.com/job/Bengaluru-Senior-Engineer-Solar-Analytics-KA/1410001001/',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    jobId: '1410001000',
    requisitionId: '1410001000',
    title: 'Manager - Grid Strategy',
    company: 'Tata Power',
    department: 'Digital & IT',
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    link: 'https://careers.tatapower.com/talentcommunity/apply/1410001000/?locale=en_GB',
    applyUrl: 'https://careers.tatapower.com/talentcommunity/apply/1410001000/?locale=en_GB',
    sourceUrl: 'https://careers.tatapower.com/job/Mumbai-Manager-Grid-Strategy-MH/1410001000/',
    source: 'tatapower',
    employmentType: 'Full-time',
    experienceRequired: null,
    jobDescription: 'Lead grid strategy planning for next-generation clean energy operations. - Power systems modeling - Cross-functional stakeholder management',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Power systems modeling',
      'Cross-functional stakeholder management',
    ],
    postingDate: '2026-07-10',
    closingDate: '2026-07-25',
    scrapedAt: '2026-07-10T00:00:00.000Z',
  })
  assert.equal(jobs[1].company, 'Tata Power')
  assert.equal(jobs[1].source, 'tatapower')
  assert.equal(jobs[1].scrapedAt, '2026-07-10T00:00:00.000Z')
})

test('run fails closed when the Tata Power official search signal disappears', async () => {
  const { createTataPowerScraper } = await loadTataPowerModule()

  await assert.rejects(
    createTataPowerScraper().run({
      fetchText: async () => '<html><body>Unexpected page</body></html>',
    }),
    /official Tata Power jobs page/i,
  )
})
