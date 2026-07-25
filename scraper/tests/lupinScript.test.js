import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const officialHomepageHtml = `
  <html>
    <head>
      <title>Leading Global Pharmaceutical Company in India - Lupin</title>
    </head>
    <body>
      <a href="https://careers.lupin.com">Careers</a>
      <section>Life at Lupin</section>
    </body>
  </html>
`

const officialCareersHtml = `
  <html>
    <body>
      <h1>Lupin Ltd</h1>
      <p>Lupin Limited provides several opportunities for young graduates as well as experienced professionals for accelerated career growth.</p>
      <p>Get more information about our current openings here:</p>
      <a href="/search/?createNewAlert=false&locationsearch=&q=">Join us</a>
    </body>
  </html>
`

const indiaSearchPage1Html = `
  <html>
    <head>
      <link rel="canonical" href="https://careers.lupin.com/go/Lupin-India/9891200/" />
      <link rel="alternate" type="application/rss+xml" title="Lupin-India" href="https://careers.lupin.com/services/rss/category/?catid=9891200" />
      <link rel="stylesheet" href="//rmkcdn.successfactors.com/a42e0b97/example.css" />
    </head>
    <body>
      <h1 id="category-name">Lupin-India</h1>
      <span class="paginationLabel" aria-label="Results 1 to 25">Results <b>1 - 25</b> of <b>51</b></span>
      <ul class="pagination">
        <li><a href="/go/Lupin-India/9891200/?q=&amp;sortColumn=referencedate&amp;sortDirection=desc">1</a></li>
        <li><a href="/go/Lupin-India/9891200/25/?q=&amp;sortColumn=referencedate&amp;sortDirection=desc">2</a></li>
        <li><a href="/go/Lupin-India/9891200/50/?q=&amp;sortColumn=referencedate&amp;sortDirection=desc">3</a></li>
      </ul>
      <table
        id="searchresults"
        class="searchResults full table table-striped table-hover"
        aria-label="Search results for . Page 1 of 3, Results 1 to 25 of 51"
      >
        <tbody>
          <tr class="data-row">
            <td headers="hdrTitle">
              <a href="/job/Santacruz-Manager-Tech-Transfer-%28project-managemen%29-MH/1400152900/" class="jobTitle-link">
                Manager - Tech Transfer (project management)
              </a>
            </td>
            <td headers="hdrLocation">Santacruz, MH, IN</td>
            <td headers="hdrDate">Jul 16, 2026</td>
          </tr>
          <tr class="data-row">
            <td headers="hdrTitle">
              <a href="/job/Sikkim-Officer-Quality-Control-SK/1399686500/" class="jobTitle-link">Officer -Quality Control</a>
            </td>
            <td headers="hdrLocation">Sikkim, SK, IN</td>
            <td headers="hdrDate">Jul 15, 2026</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`

const indiaSearchPage2Html = `
  <html>
    <head>
      <link rel="canonical" href="https://careers.lupin.com/go/Lupin-India/9891200/25/" />
      <link rel="stylesheet" href="//rmkcdn.successfactors.com/a42e0b97/example.css" />
    </head>
    <body>
      <h1 id="category-name">Lupin-India</h1>
      <span class="paginationLabel" aria-label="Results 26 to 50">Results <b>26 - 50</b> of <b>51</b></span>
      <table
        id="searchresults"
        class="searchResults full table table-striped table-hover"
        aria-label="Search results for . Page 2 of 3, Results 26 to 50 of 51"
      >
        <tbody>
          <tr class="data-row">
            <td headers="hdrTitle">
              <a href="/job/Airoli-Senior-Executive-GPO-MH/1399679300/" class="jobTitle-link">Senior Executive - GPO</a>
            </td>
            <td headers="hdrLocation">Airoli, MH, IN</td>
            <td headers="hdrDate">Jul 15, 2026</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`

const detailPageManagerHtml = `
  <html>
    <head>
      <title>Manager - Tech Transfer (project management) Job Details | Lupin</title>
    </head>
    <body>
      <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn" href="/talentcommunity/apply/1400152900/?locale=en_US">Apply now</a>
      <span itemprop="title" data-careersite-propertyid="title">Manager - Tech Transfer (project management)</span>
      <span class="jobGeoLocation">Santacruz, MH, IN</span>
      <span class="jobCompany">Lupin</span>
      <span class="jobdescription">
        <h2>Job Description</h2>
        <p>Lead technical transfer for complex product launches.</p>
        <h2>Work Experience</h2>
        <p>8-10 years in pharmaceutical tech transfer.</p>
        <h2>Education</h2>
        <p>B.Tech in Chemical Engineering</p>
        <p>M.Pharm preferred.</p>
        <h2>Competencies</h2>
        <ul>
          <li>Technology transfer</li>
          <li>Project management</li>
        </ul>
      </span>
    </body>
  </html>
`

const detailPageOfficerHtml = `
  <html>
    <head>
      <title>Officer -Quality Control Job Details | Lupin</title>
    </head>
    <body>
      <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn" href="/talentcommunity/apply/1399686500/?locale=en_US">Apply now</a>
      <span itemprop="title" data-careersite-propertyid="title">Officer -Quality Control</span>
      <span class="jobGeoLocation">Sikkim, SK, IN</span>
      <span class="jobCompany">Lupin</span>
      <span class="jobdescription">
        <h2>Job Description</h2>
        <p>Handle in-process and finished-product quality checks.</p>
        <h2>Work Experience</h2>
        <p>3-5 years in pharma quality control.</p>
        <h2>Education</h2>
        <p>B.Pharm</p>
        <p>M.Sc Chemistry preferred.</p>
        <h2>Competencies</h2>
        <ul>
          <li>HPLC</li>
          <li>Documentation</li>
        </ul>
      </span>
    </body>
  </html>
`

const detailPageGpoHtml = `
  <html>
    <head>
      <title>Senior Executive - GPO Job Details | Lupin</title>
    </head>
    <body>
      <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn" href="/talentcommunity/apply/1399679300/?locale=en_US">Apply now</a>
      <span itemprop="title" data-careersite-propertyid="title">Senior Executive - GPO</span>
      <span class="jobGeoLocation">Airoli, MH, IN</span>
      <span class="jobCompany">Lupin</span>
      <span class="jobdescription">
        <h2>Job Description</h2>
        <p>Coordinate global procurement operations for supply continuity.</p>
        <h2>Work Experience</h2>
        <p>5-7 years in procurement operations.</p>
        <h2>Education</h2>
        <p>MBA</p>
        <h2>Competencies</h2>
        <ul>
          <li>Procurement</li>
          <li>Vendor management</li>
        </ul>
      </span>
    </body>
  </html>
`

const loadLupinModule = async () => {
  try {
    return await import('../lupin/script.js')
  } catch {
    assert.fail('Expected Lupin scraper module at ../lupin/script.js')
  }
}

test('Lupin scraper keeps the verified first-party India jobs board surface explicit and fails closed on drift', async () => {
  const lupin = await loadLupinModule()

  assert.equal(lupin.SOURCE, 'lupin')
  assert.equal(lupin.COMPANY_NAME, 'Lupin')
  assert.equal(lupin.HOMEPAGE_URL, 'https://www.lupin.com/')
  assert.equal(lupin.CAREERS_URL, 'https://careers.lupin.com/content/Current-Opportunities/')
  assert.equal(
    lupin.INDIA_JOBS_URL,
    'https://careers.lupin.com/go/Lupin-India/9891200/?q=&sortColumn=referencedate&sortDirection=desc',
  )
  assert.equal(lupin.buildIndiaJobsUrl(), lupin.INDIA_JOBS_URL)
  assert.equal(
    lupin.buildIndiaJobsUrl(25),
    'https://careers.lupin.com/go/Lupin-India/9891200/25/?q=&sortColumn=referencedate&sortDirection=desc',
  )
  assert.equal(
    lupin.buildIndiaJobsUrl(50),
    'https://careers.lupin.com/go/Lupin-India/9891200/50/?q=&sortColumn=referencedate&sortDirection=desc',
  )
  assert.equal(lupin.VERIFIED_ON, '2026-07-16')
  assert.equal(lupin.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(
    lupin.hasOfficialHomepageSignal(
      officialHomepageHtml.replace('https://careers.lupin.com', 'https://people.lupin.com'),
    ),
    false,
  )
  assert.equal(lupin.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    lupin.hasOfficialCareersSignal(
      officialCareersHtml.replace('current openings here', 'campus programmes here'),
    ),
    false,
  )
  assert.equal(lupin.hasOfficialIndiaJobsPageSignal(indiaSearchPage1Html), true)
  assert.equal(lupin.hasOfficialIndiaJobsPageSignal(indiaSearchPage1Html.replace('Lupin-India', 'Lupin-Global')), false)

  const scraper = lupin.createLupinScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === lupin.HOMEPAGE_URL) return officialHomepageHtml
        if (url === lupin.CAREERS_URL) return officialCareersHtml
        if (url === lupin.INDIA_JOBS_URL) return indiaSearchPage1Html.replace('Lupin-India', 'Lupin-Global')
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official India jobs page no longer matches the verified public surface/i,
  )
})

test('extractSearchResults parses Lupin India listings from the official public jobs board', async () => {
  const lupin = await loadLupinModule()
  const jobs = lupin.extractSearchResults(indiaSearchPage1Html)

  assert.deepEqual(jobs, [
    {
      title: 'Manager - Tech Transfer (project management)',
      location: 'Santacruz, MH, IN',
      city: 'Santacruz',
      country: 'India',
      jobId: '1400152900',
      requisitionId: '1400152900',
      sourceUrl: 'https://careers.lupin.com/job/Santacruz-Manager-Tech-Transfer-%28project-managemen%29-MH/1400152900/',
      postingDate: '2026-07-16',
    },
    {
      title: 'Officer -Quality Control',
      location: 'Sikkim, SK, IN',
      city: 'Sikkim',
      country: 'India',
      jobId: '1399686500',
      requisitionId: '1399686500',
      sourceUrl: 'https://careers.lupin.com/job/Sikkim-Officer-Quality-Control-SK/1399686500/',
      postingDate: '2026-07-15',
    },
  ])
})

test('extractResultsSummary reads Lupin India pagination totals from the official public board', async () => {
  const lupin = await loadLupinModule()

  assert.deepEqual(lupin.extractResultsSummary(indiaSearchPage1Html), {
    totalResults: 51,
    pageSize: 25,
    totalPages: 3,
  })
  assert.deepEqual(lupin.extractResultsSummary(indiaSearchPage2Html), {
    totalResults: 51,
    pageSize: 25,
    totalPages: 3,
  })
})

test('extractJobDetail reads Lupin detail pages into normalized Jobify job fields', async () => {
  const lupin = await loadLupinModule()
  const detail = lupin.extractJobDetail(detailPageOfficerHtml, {
    title: 'Officer -Quality Control',
    location: 'Sikkim, SK, IN',
    city: 'Sikkim',
    country: 'India',
    jobId: '1399686500',
    requisitionId: '1399686500',
    sourceUrl: 'https://careers.lupin.com/job/Sikkim-Officer-Quality-Control-SK/1399686500/',
    postingDate: '2026-07-15',
  })

  assert.deepEqual(detail, {
    title: 'Officer -Quality Control',
    company: 'Lupin',
    location: 'Sikkim, SK, IN',
    city: 'Sikkim',
    country: 'India',
    jobId: '1399686500',
    requisitionId: '1399686500',
    sourceUrl: 'https://careers.lupin.com/job/Sikkim-Officer-Quality-Control-SK/1399686500/',
    applyUrl: 'https://careers.lupin.com/talentcommunity/apply/1399686500/?locale=en_US',
    employmentType: null,
    experienceRequired: '3-5 years in pharma quality control.',
    minimumQualification: 'B.Pharm',
    preferredQualification: 'M.Sc Chemistry preferred.',
    requiredSkills: ['HPLC', 'Documentation'],
    postingDate: '2026-07-15',
    closingDate: null,
    jobDescription: 'Handle in-process and finished-product quality checks.',
  })
})

test('run validates the official Lupin surfaces, paginates the India board, and decorates results from detail pages', async () => {
  const lupin = await loadLupinModule()
  const requestedUrls = []

  const jobs = await lupin.createLupinScraper({
    maxJobs: 3,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === lupin.HOMEPAGE_URL) return officialHomepageHtml
      if (url === lupin.CAREERS_URL) return officialCareersHtml
      if (url === lupin.INDIA_JOBS_URL) return indiaSearchPage1Html
      if (url === lupin.buildIndiaJobsUrl(25)) return indiaSearchPage2Html
      if (url === 'https://careers.lupin.com/job/Santacruz-Manager-Tech-Transfer-%28project-managemen%29-MH/1400152900/') {
        return detailPageManagerHtml
      }
      if (url === 'https://careers.lupin.com/job/Sikkim-Officer-Quality-Control-SK/1399686500/') {
        return detailPageOfficerHtml
      }
      if (url === 'https://careers.lupin.com/job/Airoli-Senior-Executive-GPO-MH/1399679300/') {
        return detailPageGpoHtml
      }

      throw new Error(`Unexpected Lupin URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    lupin.HOMEPAGE_URL,
    lupin.CAREERS_URL,
    lupin.INDIA_JOBS_URL,
    'https://careers.lupin.com/job/Santacruz-Manager-Tech-Transfer-%28project-managemen%29-MH/1400152900/',
    'https://careers.lupin.com/job/Sikkim-Officer-Quality-Control-SK/1399686500/',
    lupin.buildIndiaJobsUrl(25),
    'https://careers.lupin.com/job/Airoli-Senior-Executive-GPO-MH/1399679300/',
  ])
  assert.deepEqual(
    jobs.map((job) => ({
      jobId: job.jobId,
      title: job.title,
      company: job.company,
      location: job.location,
      city: job.city,
      country: job.country,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      link: job.link,
      postingDate: job.postingDate,
      source: job.source,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        jobId: '1400152900',
        title: 'Manager - Tech Transfer (project management)',
        company: 'Lupin',
        location: 'Santacruz, MH, IN',
        city: 'Santacruz',
        country: 'India',
        sourceUrl: 'https://careers.lupin.com/job/Santacruz-Manager-Tech-Transfer-%28project-managemen%29-MH/1400152900/',
        applyUrl: 'https://careers.lupin.com/talentcommunity/apply/1400152900/?locale=en_US',
        link: 'https://careers.lupin.com/talentcommunity/apply/1400152900/?locale=en_US',
        postingDate: '2026-07-16',
        source: 'lupin',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: '1399686500',
        title: 'Officer -Quality Control',
        company: 'Lupin',
        location: 'Sikkim, SK, IN',
        city: 'Sikkim',
        country: 'India',
        sourceUrl: 'https://careers.lupin.com/job/Sikkim-Officer-Quality-Control-SK/1399686500/',
        applyUrl: 'https://careers.lupin.com/talentcommunity/apply/1399686500/?locale=en_US',
        link: 'https://careers.lupin.com/talentcommunity/apply/1399686500/?locale=en_US',
        postingDate: '2026-07-15',
        source: 'lupin',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: '1399679300',
        title: 'Senior Executive - GPO',
        company: 'Lupin',
        location: 'Airoli, MH, IN',
        city: 'Airoli',
        country: 'India',
        sourceUrl: 'https://careers.lupin.com/job/Airoli-Senior-Executive-GPO-MH/1399679300/',
        applyUrl: 'https://careers.lupin.com/talentcommunity/apply/1399679300/?locale=en_US',
        link: 'https://careers.lupin.com/talentcommunity/apply/1399679300/?locale=en_US',
        postingDate: '2026-07-15',
        source: 'lupin',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})
