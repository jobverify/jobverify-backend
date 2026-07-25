import assert from 'node:assert/strict'
import test from 'node:test'

const loadTataElectronicsModule = async () => {
  try {
    return await import('../tataelectronics/script.js')
  } catch {
    assert.fail('Expected Tata Electronics scraper module at ../tataelectronics/script.js')
  }
}

const searchPage1Html = `
<!doctype html>
<html>
  <body>
    <div class="pagination-label-row">
      <span class="paginationLabel" aria-label="Results 1 to 25">Results <b>1 to 25</b> of <b>27</b></span>
      <span class="srHelp">Page 1 of 2</span>
    </div>
    <table id="searchresults">
      <tbody>
        <tr class="data-row">
          <td class="colTitle">
            <span class="jobTitle hidden-phone">
              <a href="/job/Bengaluru-DB-Admin-KA/7038894/" class="jobTitle-link">DB Admin</a>
            </span>
            <span class="jobTitle visible-phone">
              <a href="/job/Bengaluru-DB-Admin-KA/7038894/" class="jobTitle-link">DB Admin</a>
            </span>
          </td>
          <td class="colDepartment"><span class="jobDepartment">Manufacturing IT</span></td>
          <td class="colLocation"><span class="jobLocation">Bengaluru, Karnataka, India</span></td>
          <td class="colDate"><span class="jobDate">Jul 8, 2026</span></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const searchPage2Html = `
<!doctype html>
<html>
  <body>
    <div class="pagination-label-row">
      <span class="paginationLabel">Results</span>
      <span class="srHelp">Page 2 of 2</span>
    </div>
    <table id="searchresults">
      <tbody>
        <tr class="data-row">
          <td class="colTitle">
            <span class="jobTitle hidden-phone">
              <a href="/job/Hosur-Process-Engineer-TN/7039901/" class="jobTitle-link">Process Engineer</a>
            </span>
          </td>
          <td class="colDepartment"><span class="jobDepartment">Operations</span></td>
          <td class="colLocation"><span class="jobLocation">Hosur, Tamil Nadu, India</span></td>
          <td class="colDate"><span class="jobDate">Jul 7, 2026</span></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const detailPage1Html = `
<!doctype html>
<html>
  <body>
    <div class="jobDisplayShell" itemscope="itemscope" itemtype="http://schema.org/JobPosting">
      <p id="job-location"><span class="jobGeoLocation">Bengaluru, Karnataka, India</span></p>
      <meta itemprop="datePosted" content="2026-07-08" />
      <meta itemprop="validThrough" content="2026-07-31" />
      <div class="applylink pull-right">
        <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/7038894/?locale=en_GB">Apply now</a>
      </div>
      <div class="joblayouttoken">
        <div class="inner">
          <div class="row">
            <div class="col-xs-12 fontalign-left">
              <h1>
                <span itemprop="title" data-careersite-propertyid="title">DB Admin</span>
              </h1>
            </div>
          </div>
        </div>
      </div>
      <span data-careersite-propertyid="department">Manufacturing IT</span>
      <span data-careersite-propertyid="shifttype">Full-time</span>
      <span itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Manage production databases for Tata Electronics plants.</p>
          <ul>
            <li>PostgreSQL administration</li>
            <li>Disaster recovery planning</li>
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
      <p id="job-location"><span class="jobGeoLocation">Hosur, Tamil Nadu, India</span></p>
      <meta itemprop="datePosted" content="2026-07-07" />
      <div class="applylink pull-right">
        <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/7039901/?locale=en_US">Apply now</a>
      </div>
      <h1>
        <span itemprop="title" data-careersite-propertyid="title">Process Engineer</span>
      </h1>
      <span data-careersite-propertyid="department">Operations</span>
      <span itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Improve yield and process stability across semiconductor manufacturing lines.</p>
        </span>
      </span>
    </div>
  </body>
</html>
`

test('buildSearchUrl keeps Tata Electronics listings on the official public jobs2web route', async () => {
  const { buildSearchUrl } = await loadTataElectronicsModule()

  assert.equal(
    buildSearchUrl(),
    'https://tataelectrd.valhalla44.stage.jobs2web.com/search/?createNewAlert=false&locationsearch=&q=',
  )
  assert.equal(
    buildSearchUrl(25),
    'https://tataelectrd.valhalla44.stage.jobs2web.com/search/?createNewAlert=false&locationsearch=&q=&startrow=25',
  )
})

test('extractSearchResults collapses duplicate Tata Electronics title links into one listing row', async () => {
  const { extractSearchResults } = await loadTataElectronicsModule()
  const jobs = extractSearchResults(searchPage1Html)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'DB Admin',
    department: 'Manufacturing IT',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '7038894',
    requisitionId: '7038894',
    sourceUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Bengaluru-DB-Admin-KA/7038894/',
    postingDate: 'Jul 8, 2026',
  })
})

test('extractResultsSummary tolerates malformed Tata Electronics page-two summary text', async () => {
  const { extractResultsSummary } = await loadTataElectronicsModule()

  assert.deepEqual(extractResultsSummary(searchPage1Html), {
    totalResults: 27,
    currentPage: 1,
    totalPages: 2,
    pageSize: 25,
  })
  assert.deepEqual(extractResultsSummary(searchPage2Html), {
    totalResults: null,
    currentPage: 2,
    totalPages: 2,
    pageSize: null,
  })
})

test('extractJobDetail reads Tata Electronics apply locale from the detail page instead of synthesizing it', async () => {
  const { extractJobDetail } = await loadTataElectronicsModule()
  const detail = extractJobDetail(detailPage1Html, {
    title: 'DB Admin',
    department: 'Manufacturing IT',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '7038894',
    requisitionId: '7038894',
    sourceUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Bengaluru-DB-Admin-KA/7038894/',
    postingDate: 'Jul 8, 2026',
  })

  assert.deepEqual(detail, {
    title: 'DB Admin',
    department: 'Manufacturing IT',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '7038894',
    requisitionId: '7038894',
    employmentType: 'Full-time',
    experienceRequired: null,
    jobDescription: 'Manage production databases for Tata Electronics plants. - PostgreSQL administration - Disaster recovery planning',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'PostgreSQL administration',
      'Disaster recovery planning',
    ],
    postingDate: '2026-07-08',
    closingDate: '2026-07-31',
    applyUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/talentcommunity/apply/7038894/?locale=en_GB',
    sourceUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Bengaluru-DB-Admin-KA/7038894/',
  })
})

test('run follows Tata Electronics public search pages and carries detail-derived apply URLs into final jobs', async () => {
  const tataElectronics = await loadTataElectronicsModule()
  const requestedUrls = []

  const jobs = await tataElectronics.createTataElectronicsScraper().run({
    maxPages: 2,
    maxJobs: 2,
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === tataElectronics.buildSearchUrl()) return searchPage1Html
      if (url === tataElectronics.buildSearchUrl(25)) return searchPage2Html
      if (url === 'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Bengaluru-DB-Admin-KA/7038894/') {
        return detailPage1Html
      }
      if (url === 'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Hosur-Process-Engineer-TN/7039901/') {
        return detailPage2Html
      }

      throw new Error(`Unexpected Tata Electronics URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://tataelectrd.valhalla44.stage.jobs2web.com/search/?createNewAlert=false&locationsearch=&q=',
    'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Bengaluru-DB-Admin-KA/7038894/',
    'https://tataelectrd.valhalla44.stage.jobs2web.com/search/?createNewAlert=false&locationsearch=&q=&startrow=25',
    'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Hosur-Process-Engineer-TN/7039901/',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      jobId: job.jobId,
      requisitionId: job.requisitionId,
      title: job.title,
      company: job.company,
      department: job.department,
      location: job.location,
      city: job.city,
      source: job.source,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      link: job.link,
      employmentType: job.employmentType,
      postingDate: job.postingDate,
    })),
    [
      {
        jobId: '7038894',
        requisitionId: '7038894',
        title: 'DB Admin',
        company: 'TATA Electronics Private Limited',
        department: 'Manufacturing IT',
        location: 'Bengaluru, Karnataka, India',
        city: 'Bengaluru',
        source: 'tataelectronics',
        sourceUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Bengaluru-DB-Admin-KA/7038894/',
        applyUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/talentcommunity/apply/7038894/?locale=en_GB',
        link: 'https://tataelectrd.valhalla44.stage.jobs2web.com/talentcommunity/apply/7038894/?locale=en_GB',
        employmentType: 'Full-time',
        postingDate: '2026-07-08',
      },
      {
        jobId: '7039901',
        requisitionId: '7039901',
        title: 'Process Engineer',
        company: 'TATA Electronics Private Limited',
        department: 'Operations',
        location: 'Hosur, Tamil Nadu, India',
        city: 'Hosur',
        source: 'tataelectronics',
        sourceUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/job/Hosur-Process-Engineer-TN/7039901/',
        applyUrl: 'https://tataelectrd.valhalla44.stage.jobs2web.com/talentcommunity/apply/7039901/?locale=en_US',
        link: 'https://tataelectrd.valhalla44.stage.jobs2web.com/talentcommunity/apply/7039901/?locale=en_US',
        employmentType: null,
        postingDate: '2026-07-07',
      },
    ],
  )
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
  assert.match(jobs[1].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})
