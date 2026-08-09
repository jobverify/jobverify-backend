import assert from 'node:assert/strict'
import test from 'node:test'

const listingPageOneHtml = `
  <html>
    <body>
      <div class="search-hero">
        <span class="job-count">2 jobs in India</span>
        <a href="/location/india-jobs/34088/1269750/2">View jobs</a>
      </div>
      <section
        id="search-results"
        data-current-page="1"
        data-total-pages="2"
        data-total-results="2"
        data-records-per-page="1"
      >
        <section id="search-results-list">
          <a class="sr-item" href="/job/hyderabad/manager-data-analytics/34088/97502265360" data-job-id="97502265360">
            <h2>Manager Data Analytics</h2>
            <span class="job-location">Hyderabad, Telangana, India</span>
          </a>
        </section>
        <nav class="pagination">
          <a class="next" href="/location/india-jobs/34088/1269750/2/2">Next</a>
        </nav>
      </section>
    </body>
  </html>
`

const listingPageTwoHtml = `
  <html>
    <body>
      <section
        id="search-results"
        data-current-page="2"
        data-total-pages="2"
        data-total-results="2"
        data-records-per-page="1"
      >
        <section id="search-results-list">
          <a class="sr-item" href="/job/noida/senior-software-engineer/34088/97511111111" data-job-id="97511111111">
            <h2>Senior Software Engineer</h2>
            <span class="job-location">Noida, Uttar Pradesh, India</span>
          </a>
        </section>
      </section>
    </body>
  </html>
`

const detailPageOneHtml = `
  <html>
    <head>
      <meta name="search-job-apply-url" content="https://uhg.taleo.net/careersection/10780/jobapply.ftl?job=2374544&amp;lang=en">
      <meta name="job-ats-req-id" content="2374544">
      <script type="application/ld+json">{
        "@context":"https://schema.org",
        "@type":"JobPosting",
        "title":"Manager Data Analytics",
        "datePosted":"2026-07-01",
        "employmentType":"FULL_TIME",
        "identifier":"2374544",
        "url":"https://careers.unitedhealthgroup.com/job/hyderabad/manager-data-analytics/34088/97502265360",
        "description":"<p>Lead analytics delivery for Optum India teams.</p><p><strong>Required Qualifications</strong></p><ul><li>Advanced SQL</li><li>Python</li></ul><p><strong>Preferred Qualifications</strong></p><ul><li>Healthcare analytics experience.</li></ul><p>Bachelor's degree in Computer Science or a related field.</p>",
        "hiringOrganization":{"@type":"Organization","name":"Optum"},
        "jobLocation":[{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Hyderabad","addressRegion":"Telangana","addressCountry":"India"}}]
      }</script>
    </head>
    <body>
      <section id="job-detail-pull">
        <h1>Manager Data Analytics</h1>
      </section>
      <span class="job-location-jd job-info"><b>Location</b> Hyderabad, Telangana, India</span>
      <span class="job-category-jd job-info"><b>Category</b> Data Analytics</span>
    </body>
  </html>
`

const detailPageTwoHtml = `
  <html>
    <head>
      <meta name="search-job-apply-url" content="https://uhg.taleo.net/careersection/10780/jobapply.ftl?job=2375000&amp;lang=en">
      <meta name="job-ats-req-id" content="2375000">
      <script type="application/ld+json">{
        "@context":"https://schema.org",
        "@type":"JobPosting",
        "title":"Senior Software Engineer",
        "datePosted":"2026-07-03",
        "employmentType":"FULL_TIME",
        "identifier":"2375000",
        "url":"https://careers.unitedhealthgroup.com/job/noida/senior-software-engineer/34088/97511111111",
        "description":"<p>Build distributed systems for the Optum India platform.</p><p><strong>Required Qualifications</strong></p><ul><li>Node.js</li><li>Distributed systems design</li></ul><p>Bachelor's degree in Computer Science.</p>",
        "hiringOrganization":{"@type":"Organization","name":"Optum"},
        "jobLocation":[{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Noida","addressRegion":"Uttar Pradesh","addressCountry":"India"}}]
      }</script>
    </head>
    <body>
      <section id="job-detail-pull">
        <h1>Senior Software Engineer</h1>
      </section>
      <span class="job-location-jd job-info"><b>Location</b> Noida, Uttar Pradesh, India</span>
      <span class="job-category-jd job-info"><b>Category</b> Engineering</span>
    </body>
  </html>
`

const loadModule = () => import('../../scraper/optum/script.js')

test('Optum stays on the canonical India listing route, enriches detail pages, and preserves Taleo apply links', async () => {
  const optum = await loadModule()

  assert.equal(optum.COMPANY_NAME, 'Optum')
  assert.equal(optum.SOURCE, 'optum')
  assert.equal(optum.ATS_PLATFORM, 'talentbrew-radancy+oracle-taleo')
  assert.equal(
    optum.CAREER_PAGE_URL,
    'https://careers.unitedhealthgroup.com/location/india-jobs/34088/1269750/2',
  )
  assert.equal(optum.buildSearchUrl(), optum.CAREER_PAGE_URL)
  assert.equal(
    optum.buildSearchUrl({ page: 2 }),
    'https://careers.unitedhealthgroup.com/location/india-jobs/34088/1269750/2/2',
  )

  const listings = optum.extractSearchResults(listingPageOneHtml)
  assert.deepEqual(listings, [
    {
      title: 'Manager Data Analytics',
      company: 'Optum',
      department: null,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: '97502265360',
      requisitionId: '97502265360',
      sourceUrl: 'https://careers.unitedhealthgroup.com/job/hyderabad/manager-data-analytics/34088/97502265360',
      applyUrl: 'https://careers.unitedhealthgroup.com/job/hyderabad/manager-data-analytics/34088/97502265360',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])

  assert.deepEqual(optum.extractPaginationSummary(listingPageOneHtml), {
    hasNext: true,
    currentPage: 1,
    totalPages: 2,
    totalJobCount: 2,
    pageSize: 1,
    nextUrl: 'https://careers.unitedhealthgroup.com/location/india-jobs/34088/1269750/2/2',
  })

  const detail = optum.extractJobDetail(detailPageOneHtml, listings[0])
  assert.deepEqual(detail, {
    title: 'Manager Data Analytics',
    company: 'Optum',
    department: 'Data Analytics',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: '97502265360',
    requisitionId: '2374544',
    sourceUrl: 'https://careers.unitedhealthgroup.com/job/hyderabad/manager-data-analytics/34088/97502265360',
    applyUrl: 'https://uhg.taleo.net/careersection/10780/jobapply.ftl?job=2374544&lang=en',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: "Bachelor's degree in Computer Science or a related field.",
    preferredQualification: 'Healthcare analytics experience.',
    requiredSkills: [
      'Advanced SQL',
      'Python',
    ],
    postingDate: '2026-07-01',
    closingDate: null,
    jobDescription: /Lead analytics delivery for Optum India teams\./i.test(detail.jobDescription)
      ? detail.jobDescription
      : null,
    remoteStatus: null,
  })

  const requests = []
  const jobs = await optum.createOptumScraper({ maxPages: 2 }).run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === optum.CAREER_PAGE_URL) return listingPageOneHtml
      if (url === optum.buildSearchUrl({ page: 2 })) return listingPageTwoHtml
      if (url === 'https://careers.unitedhealthgroup.com/job/hyderabad/manager-data-analytics/34088/97502265360') {
        return detailPageOneHtml
      }
      if (url === 'https://careers.unitedhealthgroup.com/job/noida/senior-software-engineer/34088/97511111111') {
        return detailPageTwoHtml
      }
      throw new Error(`Unexpected Optum URL: ${url}`)
    },
    now: () => '2026-07-09T00:00:00.000Z',
  })

  assert.deepEqual(requests, [
    optum.CAREER_PAGE_URL,
    'https://careers.unitedhealthgroup.com/job/hyderabad/manager-data-analytics/34088/97502265360',
    'https://careers.unitedhealthgroup.com/location/india-jobs/34088/1269750/2/2',
    'https://careers.unitedhealthgroup.com/job/noida/senior-software-engineer/34088/97511111111',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'optum')
  assert.equal(jobs[0].link, 'https://uhg.taleo.net/careersection/10780/jobapply.ftl?job=2374544&lang=en')
  assert.equal(jobs[0].requisitionId, '2374544')
  assert.equal(jobs[1].title, 'Senior Software Engineer')
  assert.equal(jobs[1].applyUrl, 'https://uhg.taleo.net/careersection/10780/jobapply.ftl?job=2375000&lang=en')
  assert.equal(jobs[1].requisitionId, '2375000')
  assert.equal(jobs[1].link, 'https://uhg.taleo.net/careersection/10780/jobapply.ftl?job=2375000&lang=en')
  assert.equal(jobs[1].sourceUrl, 'https://careers.unitedhealthgroup.com/job/noida/senior-software-engineer/34088/97511111111')
  assert.equal(typeof jobs[1].scrapedAt, 'string')
})
