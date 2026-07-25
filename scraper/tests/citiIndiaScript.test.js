import assert from 'node:assert/strict'
import test from 'node:test'

const searchResultsHtml = `
  <section id="search-results" data-total-job-results="856" data-total-pages="3" data-current-page="1">
    <section id="search-results-list">
      <ul>
        <li>
          <a href="/job/pune/java-fullstack-developer-c11-pune/287/25839500" data-job-id="25839500">
            <h2>Java Fullstack Developer - C11 - Pune</h2>
            <span class="job-location">Pune, Maharashtra, India</span>
          </a>
        </li>
        <li>
          <a href="/job/chennai/testing-analyst-c10/287/25839501" data-job-id="25839501">
            <h2>Testing Analyst - C10</h2>
            <span class="job-location">Chennai, Tamil Nadu, India</span>
          </a>
        </li>
        <li>
          <a href="/job/tampa/cybersecurity-lead/287/25839999" data-job-id="25839999">
            <h2>Cybersecurity Lead</h2>
            <span class="job-location">Tampa, Florida</span>
          </a>
        </li>
      </ul>
      <nav class="pagination">
        <a class="next" href="/search-jobs?p=2" rel="nofollow">next page</a>
      </nav>
    </section>
  </section>
`

const detailHtml = `
  <html>
    <head>
      <meta name="search-job-apply-url" content="https://citi.wd5.myworkdayjobs.com/2/job/Pune-Maharashtra-India/Java-Fullstack-Developer---C11---Pune_25839500/apply">
      <meta name="job-ats-req-id" content="25839500">
      <script type="application/ld+json">{
        "@context":"http://schema.org",
        "@type":"JobPosting",
        "datePosted":"2026-07-14",
        "description":"<p>Build and maintain Citi banking applications for India teams.</p><p><b>Required Skill</b></p><ul><li><p>Java</p></li><li><p>Spring Boot</p></li></ul><p><b>Preferred Skill</b></p><ul><li><p>Kafka</p></li></ul><h2><b>Education</b></h2><ul><li><p>Bachelor's degree in Computer Science</p></li></ul><p>Experience required: 6-8 years</p>",
        "employmentType":"Regular",
        "identifier":"25839500",
        "title":"Java Fullstack Developer - C11 - Pune",
        "url":"https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500",
        "jobLocation":[{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Pune","addressRegion":"Maharashtra","addressCountry":"India"}}]
      }</script>
    </head>
    <body>
      <section class="ajd_section ajd_job-details job-description" data-selector-name="jobdetails" data-org-id="287" data-job-id="25839500">
        <h2 class="ajd_section__heading ajd_job-details__heading heading-2">Java Fullstack Developer - C11 - Pune</h2>
        <p class="ajd_header__location">Pune, Maharashtra, India</p>
      </section>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../citiindia/script.js')
  } catch {
    assert.fail('Expected Citi India scraper module at ../citiindia/script.js')
  }
}

test('Citi India exports stable TalentBrew search URLs and metadata', async () => {
  const citi = await loadModule()

  assert.equal(citi.COMPANY_NAME, 'Citi India')
  assert.equal(citi.SOURCE, 'citiindia')
  assert.equal(citi.ATS_PLATFORM, 'talentbrew-radancy')
  assert.equal(
    citi.CAREER_PAGE_URL,
    'https://jobs.citi.com/search-jobs?acm=ALL&alrpm=1269750&ascf=%5B%7B%22key%22%3A%22ALL%22%2C%22value%22%3A%22%22%7D%5D',
  )
  assert.equal(citi.buildSearchUrl(), citi.CAREER_PAGE_URL)
  assert.equal(
    citi.buildSearchUrl({ page: 2 }),
    'https://jobs.citi.com/search-jobs?acm=ALL&alrpm=1269750&ascf=%5B%7B%22key%22%3A%22ALL%22%2C%22value%22%3A%22%22%7D%5D&p=2',
  )
})

test('extractSearchResults keeps Citi India roles and ignores non-India cards', async () => {
  const citi = await loadModule()
  const jobs = citi.extractSearchResults(searchResultsHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Java Fullstack Developer - C11 - Pune',
    company: 'Citi India',
    department: null,
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    jobId: '25839500',
    requisitionId: '25839500',
    sourceUrl: 'https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500',
    applyUrl: 'https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
})

test('extractJobDetail reads Citi India detail metadata and workday apply links', async () => {
  const citi = await loadModule()

  const detail = citi.extractJobDetail(detailHtml, {
    title: 'Java Fullstack Developer - C11 - Pune',
    company: 'Citi India',
    department: null,
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    jobId: '25839500',
    requisitionId: '25839500',
    sourceUrl: 'https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500',
    applyUrl: 'https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500',
  })

  assert.deepEqual(detail, {
    title: 'Java Fullstack Developer - C11 - Pune',
    company: 'Citi India',
    department: null,
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    jobId: '25839500',
    requisitionId: '25839500',
    sourceUrl: 'https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500',
    applyUrl: 'https://citi.wd5.myworkdayjobs.com/2/job/Pune-Maharashtra-India/Java-Fullstack-Developer---C11---Pune_25839500/apply',
    employmentType: 'Full-time',
    experienceRequired: '6-8 years',
    minimumQualification: "Bachelor's degree in Computer Science",
    preferredQualification: 'Kafka',
    requiredSkills: [
      'Java',
      'Spring Boot',
    ],
    postingDate: '2026-07-14',
    closingDate: null,
    jobDescription: 'Build and maintain Citi banking applications for India teams. Required Skill Java Spring Boot Preferred Skill Kafka Education Bachelor\'s degree in Computer Science Experience required: 6-8 years',
    remoteStatus: null,
  })
})

test('run paginates Citi India search results, enriches detail pages, and decorates shared runner fields', async () => {
  const citi = await loadModule()
  const requests = []

  const jobs = await citi.createCitiIndiaScraper({ maxPages: 1, maxJobs: 1 }).run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === citi.buildSearchUrl()) return searchResultsHtml
      if (url === 'https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500') {
        return detailHtml
      }
      throw new Error(`Unexpected Citi URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    citi.buildSearchUrl(),
    'https://jobs.citi.com/job/pune/java-fullstack-developer-c11-pune/287/25839500',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'citiindia')
  assert.equal(jobs[0].jobId, '25839500')
  assert.equal(
    jobs[0].applyUrl,
    'https://citi.wd5.myworkdayjobs.com/2/job/Pune-Maharashtra-India/Java-Fullstack-Developer---C11---Pune_25839500/apply',
  )
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
