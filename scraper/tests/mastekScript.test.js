import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <section>
      <h1>Lead with Velocity</h1>
      <a href="https://careers.mastek.com/search/">Explore Jobs</a>
    </section>
  </body>
</html>
`

const searchPage1Html = `
<!doctype html>
<html lang="en">
  <head>
    <title>Mastek Limited Jobs</title>
  </head>
  <body>
    <span id="tile-search-results-label">Showing 1 to 12 of 13 Jobs</span>
    <ul id="job-tile-list">
      <li class="job-tile job-id-47800844" data-url="/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/">
        <a class="jobTitle-link" href="/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/">
          Oracle HCM Functional Consultant (Payroll)
        </a>
        <span class="section-label">Date</span>
        <div>Jul 16, 2026</div>
        <span class="section-label">Location</span>
        <div>Pune, IN</div>
        <span class="section-label">Department</span>
        <div>HCM</div>
        <span class="section-label">Business Unit</span>
        <div>Enterprise Applications &amp; Oracle Cloud</div>
        <span class="section-label">Requisition ID</span>
        <div>134175</div>
      </li>
      <li class="job-tile job-id-48890011" data-url="/job/Leeds-Oracle-Cloud-Lead/48890011/">
        <a class="jobTitle-link" href="/job/Leeds-Oracle-Cloud-Lead/48890011/">
          Oracle Cloud Lead
        </a>
        <span class="section-label">Date</span>
        <div>Jul 15, 2026</div>
        <span class="section-label">Location</span>
        <div>Leeds, GB</div>
        <span class="section-label">Department</span>
        <div>Cloud</div>
        <span class="section-label">Business Unit</span>
        <div>Cloud Transformation</div>
        <span class="section-label">Requisition ID</span>
        <div>134099</div>
      </li>
    </ul>
    <script>
      jobRecordsPerPage: parseInt("12"),
      jobRecordsFound: parseInt("13")
    </script>
  </body>
</html>
`

const searchPage2Html = `
<!doctype html>
<html lang="en">
  <head>
    <title>Mastek Limited Jobs</title>
  </head>
  <body>
    <span id="tile-search-results-label">Showing 13 to 12 of 13 Jobs</span>
    <ul id="job-tile-list">
      <li class="job-tile job-id-57927544" data-url="/job/Bengaluru-Oracle-Xstore-Quality-Assurance-Engineer/57927544/">
        <a class="jobTitle-link" href="/job/Bengaluru-Oracle-Xstore-Quality-Assurance-Engineer/57927544/">
          Oracle Xstore Quality Assurance Engineer
        </a>
        <span class="section-label">Date</span>
        <div>Jul 14, 2026</div>
        <span class="section-label">Location</span>
        <div>Bengaluru, IN</div>
        <span class="section-label">Department</span>
        <div>Quality Engineering</div>
        <span class="section-label">Business Unit</span>
        <div>Retail &amp; Commerce</div>
        <span class="section-label">Requisition ID</span>
        <div>134002</div>
      </li>
    </ul>
    <script>
      jobRecordsPerPage: parseInt("12"),
      jobRecordsFound: parseInt("13")
    </script>
  </body>
</html>
`

const detailPage1Html = `
<!doctype html>
<html lang="en">
  <head>
    <title>Oracle HCM Functional Consultant (Payroll) Job Details | Mastek Limited</title>
    <meta itemprop="datePosted" content="Thu Jul 16 02:00:00 UTC 2026">
    <meta itemprop="validThrough" content="Tue Aug 12 18:30:00 UTC 2026">
  </head>
  <body>
    <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/47800844/?locale=en_US">Apply now</a>
    <span itemprop="description" data-careersite-propertyid="description">
      <span class="jobdescription">
        <p>Lead Oracle HCM payroll delivery.</p>
        <ul>
          <li>Payroll domain</li>
          <li>Oracle HCM Cloud</li>
        </ul>
      </span>
    </span>
  </body>
</html>
`

const detailPage2Html = `
<!doctype html>
<html lang="en">
  <head>
    <title>Oracle Xstore Quality Assurance Engineer Job Details | Mastek Limited</title>
    <meta itemprop="datePosted" content="Wed Jul 15 02:00:00 UTC 2026">
  </head>
  <body>
    <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/57927544/?locale=en_US">Apply now</a>
    <span itemprop="description" data-careersite-propertyid="description">
      <span class="jobdescription">
        <p>Own Xstore regression and release certification.</p>
        <ul>
          <li>Xstore QA</li>
          <li>Automation strategy</li>
        </ul>
      </span>
    </span>
  </body>
</html>
`

const loadMastekModule = async () => {
  try {
    return await import('../mastek/script.js')
  } catch {
    assert.fail('Expected Mastek scraper module at ../mastek/script.js')
  }
}

test('Mastek scraper exports the verified first-party careers handoff and search route', async () => {
  const mastek = await loadMastekModule()

  assert.equal(mastek.SOURCE, 'mastek')
  assert.equal(mastek.COMPANY, 'Mastek')
  assert.equal(mastek.VERIFIED_ON, '2026-07-16')
  assert.equal(mastek.OFFICIAL_CAREERS_URL, 'https://www.mastek.com/careers/')
  assert.equal(mastek.SEARCH_PAGE_URL, 'https://careers.mastek.com/search/')
  assert.equal(mastek.BASE_URL, 'https://careers.mastek.com')
  assert.equal(mastek.DEFAULT_PAGE_SIZE, 12)
  assert.equal(
    mastek.extractOfficialJobsBoardUrl(officialCareersHtml),
    'https://careers.mastek.com/search/',
  )
  assert.equal(mastek.hasOfficialMastekCareersSignals(officialCareersHtml), true)
  assert.equal(mastek.hasOfficialSearchResultsSignal(searchPage1Html), true)
  assert.equal(mastek.buildSearchUrl(), 'https://careers.mastek.com/search/')
  assert.equal(mastek.buildSearchUrl(12), 'https://careers.mastek.com/search/?startrow=12')
})

test('extractSearchResults keeps only India rows from the live Mastek tile board', async () => {
  const mastek = await loadMastekModule()

  assert.deepEqual(mastek.extractSearchResults(searchPage1Html), [
    {
      title: 'Oracle HCM Functional Consultant (Payroll)',
      businessUnit: 'Enterprise Applications & Oracle Cloud',
      department: 'HCM',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '47800844',
      requisitionId: '134175',
      sourceUrl: 'https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/',
      postingDate: '2026-07-16',
    },
  ])
})

test('extractResultsSummary reads totals from the Mastek public board script markers', async () => {
  const mastek = await loadMastekModule()

  assert.deepEqual(mastek.extractResultsSummary(searchPage1Html), {
    totalResults: 13,
    pageSize: 12,
  })
  assert.deepEqual(mastek.extractResultsSummary(searchPage2Html), {
    totalResults: 13,
    pageSize: 12,
  })
})

test('extractJobDetail builds the public Mastek apply handoff from the detail page', async () => {
  const mastek = await loadMastekModule()

  assert.deepEqual(
    mastek.extractJobDetail(detailPage1Html, {
      title: 'Oracle HCM Functional Consultant (Payroll)',
      businessUnit: 'Enterprise Applications & Oracle Cloud',
      department: 'HCM',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '47800844',
      requisitionId: '134175',
      sourceUrl: 'https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/',
      postingDate: '2026-07-16',
    }),
    {
      title: 'Oracle HCM Functional Consultant (Payroll)',
      businessUnit: 'Enterprise Applications & Oracle Cloud',
      department: 'HCM',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '47800844',
      requisitionId: '134175',
      employmentType: null,
      experienceRequired: null,
      jobDescription: 'Lead Oracle HCM payroll delivery. Payroll domain Oracle HCM Cloud',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Payroll domain',
        'Oracle HCM Cloud',
      ],
      postingDate: '2026-07-16',
      closingDate: '2026-08-12',
      applyUrl: 'https://careers.mastek.com/talentcommunity/apply/47800844/?locale=en_US',
      sourceUrl: 'https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/',
    },
  )
})

test('run validates the official Mastek careers handoff, paginates the mixed-global board, and keeps India jobs only', async () => {
  const mastek = await loadMastekModule()
  const requestedUrls = []

  const jobs = await mastek.createMastekScraper().run({
    maxPages: 2,
    maxJobs: 2,
    now: () => '2026-07-16T00:00:00.000Z',
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === mastek.OFFICIAL_CAREERS_URL) return officialCareersHtml
      if (url === mastek.buildSearchUrl()) return searchPage1Html
      if (url === mastek.buildSearchUrl(12)) return searchPage2Html
      if (url === 'https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/') {
        return detailPage1Html
      }
      if (url === 'https://careers.mastek.com/job/Bengaluru-Oracle-Xstore-Quality-Assurance-Engineer/57927544/') {
        return detailPage2Html
      }

      throw new Error(`Unexpected Mastek URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    mastek.OFFICIAL_CAREERS_URL,
    mastek.buildSearchUrl(),
    'https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/',
    mastek.buildSearchUrl(12),
    'https://careers.mastek.com/job/Bengaluru-Oracle-Xstore-Quality-Assurance-Engineer/57927544/',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => ({
    jobId: job.jobId,
    requisitionId: job.requisitionId,
    title: job.title,
    company: job.company,
    department: job.department,
    businessUnit: job.businessUnit,
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
      jobId: '47800844',
      requisitionId: '134175',
      title: 'Oracle HCM Functional Consultant (Payroll)',
      company: 'Mastek',
      department: 'HCM',
      businessUnit: 'Enterprise Applications & Oracle Cloud',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      source: 'mastek',
      sourceUrl: 'https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/',
      applyUrl: 'https://careers.mastek.com/talentcommunity/apply/47800844/?locale=en_US',
      link: 'https://careers.mastek.com/talentcommunity/apply/47800844/?locale=en_US',
      postingDate: '2026-07-16',
    },
    {
      jobId: '57927544',
      requisitionId: '134002',
      title: 'Oracle Xstore Quality Assurance Engineer',
      company: 'Mastek',
      department: 'Quality Engineering',
      businessUnit: 'Retail & Commerce',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      source: 'mastek',
      sourceUrl: 'https://careers.mastek.com/job/Bengaluru-Oracle-Xstore-Quality-Assurance-Engineer/57927544/',
      applyUrl: 'https://careers.mastek.com/talentcommunity/apply/57927544/?locale=en_US',
      link: 'https://careers.mastek.com/talentcommunity/apply/57927544/?locale=en_US',
      postingDate: '2026-07-15',
    },
  ])
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
  assert.equal(jobs[1].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('Mastek fails closed when the verified official careers handoff disappears', async () => {
  const mastek = await loadMastekModule()

  await assert.rejects(
    mastek.createMastekScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified official Mastek careers page|official Mastek jobs page/i,
  )
})
