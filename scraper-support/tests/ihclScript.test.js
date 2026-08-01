import assert from 'node:assert/strict'
import test from 'node:test'

const searchPage1Html = `
<!doctype html>
<html lang="en-GB">
  <body>
    <span id="tile-search-results-label">Showing 1 to 25 of 27 Jobs</span>
    <ul id="job-tile-list">
      <li class="job-tile job-id-3248480" data-url="/IHCL/job/Kolkata-Housekeeping-Executive-WB-700027/3248480/">
        <a class="jobTitle-link" href="/IHCL/job/Kolkata-Housekeeping-Executive-WB-700027/3248480/">Housekeeping Executive</a>
        <span class="section-label">Business Unit</span>
        <div>Taj Bengal, Kolkata</div>
        <span class="section-label">Department</span>
        <div>Housekeeping</div>
        <span class="section-label">Date</span>
        <div>15 Jul 2026</div>
        <span class="section-label">Job Req ID</span>
        <div>15421</div>
      </li>
      <li class="job-tile job-id-53623980" data-url="/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/">
        <a class="jobTitle-link" href="/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/">Duty Manager</a>
        <span class="section-label">Business Unit</span>
        <div>Taj Hampi Resort &amp; Spa, Karnataka</div>
        <span class="section-label">Department</span>
        <div>Front Office</div>
        <span class="section-label">Date</span>
        <div>16 Jul 2026</div>
        <span class="section-label">Job Req ID</span>
        <div>16368</div>
      </li>
    </ul>
    <script>
      jobRecordsPerPage: parseInt("25"),
      jobRecordsFound: parseInt("27")
      var brand = 'IHCL';
      "ssoCompanyId"   : 'theindianhP2'
    </script>
  </body>
</html>
`

const searchPage2Html = `
<!doctype html>
<html lang="en-GB">
  <body>
    <span id="tile-search-results-label">Showing 26 to 25 of 27 Jobs</span>
    <ul id="job-tile-list">
      <li class="job-tile job-id-53758980" data-url="/IHCL/job/Goa-Front-Office-Supervisor-GA-403004/53758980/">
        <a class="jobTitle-link" href="/IHCL/job/Goa-Front-Office-Supervisor-GA-403004/53758980/">Front Office Supervisor</a>
        <span class="section-label">Business Unit</span>
        <div>Taj Cidade de Goa Horizon, Goa</div>
        <span class="section-label">Department</span>
        <div>Front Office</div>
        <span class="section-label">Date</span>
        <div>16 Jul 2026</div>
        <span class="section-label">Job Req ID</span>
        <div>17004</div>
      </li>
    </ul>
    <script>
      jobRecordsPerPage: parseInt("25"),
      jobRecordsFound: parseInt("27")
      var brand = 'IHCL';
      "ssoCompanyId"   : 'theindianhP2'
    </script>
  </body>
</html>
`

const detailPage1Html = `
<!doctype html>
<html lang="en-GB">
  <body>
    <div class="jobDisplayShell" itemscope="itemscope" itemtype="http://schema.org/JobPosting">
      <span itemprop="jobLocation" itemscope itemtype="http://schema.org/Place">
        <span itemprop="address" itemscope itemtype="http://schema.org/PostalAddress">
          <meta itemprop="addressLocality" content="Kolkata">
          <meta itemprop="addressRegion" content="WB">
          <meta itemprop="postalCode" content="700027">
          <meta itemprop="addressCountry" content="IN">
        </span>
      </span>
      <meta itemprop="datePosted" content="Tue Jul 15 02:00:00 UTC 2026">
      <meta itemprop="validThrough" content="Fri Jul 18 18:30:00 UTC 2026">
      <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/3248480/?locale=en_GB">Apply now</a>
      <h1>
        <span itemprop="title" data-careersite-propertyid="title">Housekeeping Executive</span>
      </h1>
      <span data-careersite-propertyid="businessunit">Taj Bengal, Kolkata</span>
      <span data-careersite-propertyid="dept">Housekeeping</span>
      <span data-careersite-propertyid="customfield3">15421</span>
      <span itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Lead housekeeping operations across guest floors.</p>
          <ul>
            <li>Guest room inspections</li>
            <li>Team coordination</li>
          </ul>
        </span>
      </span>
    </div>
  </body>
</html>
`

const detailPage2Html = `
<!doctype html>
<html lang="en-GB">
  <body>
    <div class="jobDisplayShell" itemscope="itemscope" itemtype="http://schema.org/JobPosting">
      <span itemprop="jobLocation" itemscope itemtype="http://schema.org/Place">
        <span itemprop="address" itemscope itemtype="http://schema.org/PostalAddress">
          <meta itemprop="addressLocality" content="Gongne ka Gurha">
          <meta itemprop="addressRegion" content="KA">
          <meta itemprop="postalCode" content="583276">
          <meta itemprop="addressCountry" content="IN">
        </span>
      </span>
      <meta itemprop="datePosted" content="Thu Jul 16 02:00:00 UTC 2026">
      <meta itemprop="validThrough" content="Fri Jul 17 18:30:00 UTC 2026">
      <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/53623980/?locale=en_GB">Apply now</a>
      <h1>
        <span itemprop="title" data-careersite-propertyid="title">Duty Manager</span>
      </h1>
      <span data-careersite-propertyid="businessunit">Taj Hampi Resort &amp; Spa, Karnataka</span>
      <span data-careersite-propertyid="dept">Front Office</span>
      <span data-careersite-propertyid="customfield3">16368</span>
      <span itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Own the front office guest journey for the resort shift.</p>
          <ul>
            <li>Guest issue resolution</li>
            <li>Shift leadership</li>
          </ul>
        </span>
      </span>
    </div>
  </body>
</html>
`

const detailPage3Html = `
<!doctype html>
<html lang="en-GB">
  <body>
    <div class="jobDisplayShell" itemscope="itemscope" itemtype="http://schema.org/JobPosting">
      <span itemprop="jobLocation" itemscope itemtype="http://schema.org/Place">
        <span itemprop="address" itemscope itemtype="http://schema.org/PostalAddress">
          <meta itemprop="addressLocality" content="Goa">
          <meta itemprop="addressRegion" content="GA">
          <meta itemprop="postalCode" content="403004">
          <meta itemprop="addressCountry" content="IN">
        </span>
      </span>
      <meta itemprop="datePosted" content="Thu Jul 16 02:00:00 UTC 2026">
      <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/53758980/?locale=en_GB">Apply now</a>
      <h1>
        <span itemprop="title" data-careersite-propertyid="title">Front Office Supervisor</span>
      </h1>
      <span data-careersite-propertyid="businessunit">Taj Cidade de Goa Horizon, Goa</span>
      <span data-careersite-propertyid="dept">Front Office</span>
      <span data-careersite-propertyid="customfield3">17004</span>
      <span itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Support daily guest arrival and departure operations.</p>
        </span>
      </span>
    </div>
  </body>
</html>
`

const loadIhclModule = async () => {
  try {
    return await import('../../scraper/ihcl/script.js')
  } catch {
    assert.fail('Expected IHCL scraper module at ../../scraper/ihcl/script.js')
  }
}

test('IHCL constants stay pinned to the verified public SuccessFactors board from July 16, 2026', async () => {
  const ihcl = await loadIhclModule()

  assert.equal(ihcl.SOURCE, 'ihcl')
  assert.equal(ihcl.COMPANY, 'IHCL')
  assert.equal(ihcl.VERIFIED_ON, '2026-07-16')
  assert.equal(ihcl.BASE_URL, 'https://careers.ihcltata.com')
  assert.equal(ihcl.SEARCH_PAGE_URL, 'https://careers.ihcltata.com/IHCL/search/?createNewAlert=false&q=')
  assert.equal(ihcl.buildSearchUrl(), 'https://careers.ihcltata.com/IHCL/search/?createNewAlert=false&q=')
  assert.equal(ihcl.buildSearchUrl(25), 'https://careers.ihcltata.com/IHCL/search/?createNewAlert=false&q=&startrow=25')
  assert.equal(ihcl.hasOfficialSearchResultsSignal(searchPage1Html), true)
  assert.match(ihcl.VERIFIED_SURFACE_SUMMARY, /431 Jobs/i)
})

test('extractSearchResults parses IHCL job tiles from the official public search route', async () => {
  const ihcl = await loadIhclModule()
  const jobs = ihcl.extractSearchResults(searchPage1Html)

  assert.deepEqual(jobs, [
    {
      title: 'Housekeeping Executive',
      businessUnit: 'Taj Bengal, Kolkata',
      department: 'Housekeeping',
      location: 'Taj Bengal, Kolkata',
      city: null,
      country: null,
      jobId: '3248480',
      requisitionId: '15421',
      sourceUrl: 'https://careers.ihcltata.com/IHCL/job/Kolkata-Housekeeping-Executive-WB-700027/3248480/',
      postingDate: '15 Jul 2026',
    },
    {
      title: 'Duty Manager',
      businessUnit: 'Taj Hampi Resort & Spa, Karnataka',
      department: 'Front Office',
      location: 'Taj Hampi Resort & Spa, Karnataka',
      city: null,
      country: null,
      jobId: '53623980',
      requisitionId: '16368',
      sourceUrl: 'https://careers.ihcltata.com/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/',
      postingDate: '16 Jul 2026',
    },
  ])
})

test('extractResultsSummary tolerates the malformed IHCL page-two label and reads totals from the page script', async () => {
  const ihcl = await loadIhclModule()

  assert.deepEqual(ihcl.extractResultsSummary(searchPage1Html), {
    totalResults: 27,
    pageSize: 25,
  })
  assert.deepEqual(ihcl.extractResultsSummary(searchPage2Html), {
    totalResults: 27,
    pageSize: 25,
  })
})

test('extractJobDetail reads IHCL location, requisition, country, and apply metadata from the public job page', async () => {
  const ihcl = await loadIhclModule()
  const detail = ihcl.extractJobDetail(detailPage2Html, {
    title: 'Duty Manager',
    businessUnit: 'Taj Hampi Resort & Spa, Karnataka',
    department: 'Front Office',
    location: 'Taj Hampi Resort & Spa, Karnataka',
    city: null,
    country: null,
    jobId: '53623980',
    requisitionId: '16368',
    sourceUrl: 'https://careers.ihcltata.com/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/',
    postingDate: '16 Jul 2026',
  })

  assert.deepEqual(detail, {
    title: 'Duty Manager',
    businessUnit: 'Taj Hampi Resort & Spa, Karnataka',
    department: 'Front Office',
    location: 'Taj Hampi Resort & Spa, Karnataka',
    city: 'Gongne ka Gurha',
    country: 'India',
    jobId: '53623980',
    requisitionId: '16368',
    employmentType: null,
    experienceRequired: null,
    jobDescription: 'Own the front office guest journey for the resort shift. - Guest issue resolution - Shift leadership',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Guest issue resolution',
      'Shift leadership',
    ],
    postingDate: '2026-07-16',
    closingDate: '2026-07-17',
    applyUrl: 'https://careers.ihcltata.com/talentcommunity/apply/53623980/?locale=en_GB',
    sourceUrl: 'https://careers.ihcltata.com/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/',
  })
})

test('run validates the official IHCL search surface, paginates with startrow, and decorates jobs from detail pages', async () => {
  const ihcl = await loadIhclModule()
  const requestedUrls = []

  const jobs = await ihcl.createIhclScraper().run({
    maxPages: 2,
    maxJobs: 3,
    now: () => '2026-07-16T00:00:00.000Z',
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === ihcl.buildSearchUrl()) return searchPage1Html
      if (url === ihcl.buildSearchUrl(25)) return searchPage2Html
      if (url === 'https://careers.ihcltata.com/IHCL/job/Kolkata-Housekeeping-Executive-WB-700027/3248480/') {
        return detailPage1Html
      }
      if (url === 'https://careers.ihcltata.com/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/') {
        return detailPage2Html
      }
      if (url === 'https://careers.ihcltata.com/IHCL/job/Goa-Front-Office-Supervisor-GA-403004/53758980/') {
        return detailPage3Html
      }

      throw new Error(`Unexpected IHCL URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ihcl.buildSearchUrl(),
    'https://careers.ihcltata.com/IHCL/job/Kolkata-Housekeeping-Executive-WB-700027/3248480/',
    'https://careers.ihcltata.com/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/',
    ihcl.buildSearchUrl(25),
    'https://careers.ihcltata.com/IHCL/job/Goa-Front-Office-Supervisor-GA-403004/53758980/',
  ])
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs.map((job) => ({
    jobId: job.jobId,
    requisitionId: job.requisitionId,
    title: job.title,
    company: job.company,
    department: job.department,
    location: job.location,
    city: job.city,
    country: job.country,
    source: job.source,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    link: job.link,
    postingDate: job.postingDate,
  })), [
    {
      jobId: '3248480',
      requisitionId: '15421',
      title: 'Housekeeping Executive',
      company: 'IHCL',
      department: 'Housekeeping',
      location: 'Taj Bengal, Kolkata',
      city: 'Kolkata',
      country: 'India',
      source: 'ihcl',
      sourceUrl: 'https://careers.ihcltata.com/IHCL/job/Kolkata-Housekeeping-Executive-WB-700027/3248480/',
      applyUrl: 'https://careers.ihcltata.com/talentcommunity/apply/3248480/?locale=en_GB',
      link: 'https://careers.ihcltata.com/talentcommunity/apply/3248480/?locale=en_GB',
      postingDate: '2026-07-15',
    },
    {
      jobId: '53623980',
      requisitionId: '16368',
      title: 'Duty Manager',
      company: 'IHCL',
      department: 'Front Office',
      location: 'Taj Hampi Resort & Spa, Karnataka',
      city: 'Gongne ka Gurha',
      country: 'India',
      source: 'ihcl',
      sourceUrl: 'https://careers.ihcltata.com/IHCL/job/Gongne-ka-Gurha-Duty-Manager-KA-583276/53623980/',
      applyUrl: 'https://careers.ihcltata.com/talentcommunity/apply/53623980/?locale=en_GB',
      link: 'https://careers.ihcltata.com/talentcommunity/apply/53623980/?locale=en_GB',
      postingDate: '2026-07-16',
    },
    {
      jobId: '53758980',
      requisitionId: '17004',
      title: 'Front Office Supervisor',
      company: 'IHCL',
      department: 'Front Office',
      location: 'Taj Cidade de Goa Horizon, Goa',
      city: 'Goa',
      country: 'India',
      source: 'ihcl',
      sourceUrl: 'https://careers.ihcltata.com/IHCL/job/Goa-Front-Office-Supervisor-GA-403004/53758980/',
      applyUrl: 'https://careers.ihcltata.com/talentcommunity/apply/53758980/?locale=en_GB',
      link: 'https://careers.ihcltata.com/talentcommunity/apply/53758980/?locale=en_GB',
      postingDate: '2026-07-16',
    },
  ])
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
  assert.equal(jobs[2].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('run fails closed when the verified IHCL public search surface disappears', async () => {
  const ihcl = await loadIhclModule()

  await assert.rejects(
    ihcl.createIhclScraper().run({
      fetchText: async () => '<html><body>Unexpected page</body></html>',
    }),
    /official IHCL jobs page/i,
  )
})
