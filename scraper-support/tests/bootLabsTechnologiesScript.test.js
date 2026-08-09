import assert from 'node:assert/strict'
import test from 'node:test'

const officialSiteHtml = `
  <main>
    <h1>Careers</h1>
    <p>Our current openings are coming soon on the site.</p>
    <a href="https://www.linkedin.com/company/bootlabs-technologies">LinkedIn</a>
    <a href="https://www.linkedin.com/company/bootlabs-technologies/jobs/">See open roles on LinkedIn</a>
  </main>
`

const searchResultsHtml = `
  <section class="two-pane-serp-page__results-list">
    <ul class="jobs-search__results-list">
      <li>
        <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4060905526">
          <a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/lead-devops-engineer-at-bootlabs-4060905526?position=1&amp;pageNum=0"></a>
          <div class="base-search-card__info">
            <h3 class="base-search-card__title">Lead DevOps Engineer</h3>
            <h4 class="base-search-card__subtitle">
              <a class="hidden-nested-link" href="https://www.linkedin.com/company/bootlabs-technologies">BootLabs Technologies</a>
            </h4>
            <div class="base-search-card__metadata">
              <span class="job-search-card__location">Bengaluru, Karnataka, India</span>
              <time class="job-search-card__listdate" datetime="2026-07-05">4 days ago</time>
            </div>
          </div>
        </div>
      </li>
      <li>
        <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4060905527">
          <a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/platform-engineer-at-bootlabs-4060905527?position=2&amp;pageNum=0"></a>
          <div class="base-search-card__info">
            <h3 class="base-search-card__title">Platform Engineer</h3>
            <h4 class="base-search-card__subtitle">
              <a class="hidden-nested-link" href="https://www.linkedin.com/company/bootlabs-technologies">BootLabs Technologies</a>
            </h4>
            <div class="base-search-card__metadata">
              <span class="job-search-card__location">London, United Kingdom</span>
              <time class="job-search-card__listdate" datetime="2026-07-05">4 days ago</time>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </section>
`

const detailHtml = `
  <html>
    <head>
      <title>BootLabs Technologies hiring Lead DevOps Engineer in Bengaluru, Karnataka, India | LinkedIn</title>
      <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "JobPosting",
          "datePosted": "2026-07-05T04:09:09.000Z",
          "employmentType": "FULL_TIME",
          "description": "&lt;p&gt;Lead cloud infrastructure and CI/CD automation.&lt;/p&gt;",
          "title": "Lead DevOps Engineer",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "BootLabs Technologies"
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bengaluru",
              "addressRegion": "Karnataka",
              "addressCountry": "IN"
            }
          }
        }
      </script>
    </head>
    <body></body>
  </html>
`

const loadBootLabsModule = async () => {
  try {
    return await import('../../scraper/bootlabstechnologies/script.js')
  } catch {
    assert.fail('Expected BootLabs Technologies scraper module at ../../scraper/bootlabstechnologies/script.js')
  }
}

test('extractSearchResults keeps only India jobs from the public BootLabs LinkedIn search page', async () => {
  const bootlabs = await loadBootLabsModule()
  const jobs = bootlabs.extractSearchResults(searchResultsHtml)

  assert.equal(bootlabs.pageIndicatesLinkedinHandoff(officialSiteHtml), true)
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Lead DevOps Engineer',
    company: 'BootLabs Technologies',
    department: null,
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '4060905526',
    requisitionId: '4060905526',
    sourceUrl: 'https://in.linkedin.com/jobs/view/lead-devops-engineer-at-bootlabs-4060905526?position=1&pageNum=0',
    applyUrl: 'https://in.linkedin.com/jobs/view/lead-devops-engineer-at-bootlabs-4060905526?position=1&pageNum=0',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-05',
    closingDate: null,
    jobDescription: null,
  })
})

test('extractJobDetail enriches a public BootLabs LinkedIn detail page using JobPosting JSON-LD', async () => {
  const bootlabs = await loadBootLabsModule()
  const detail = bootlabs.extractJobDetail(detailHtml)

  assert.deepEqual(detail, {
    company: 'BootLabs Technologies',
    location: 'Bengaluru, Karnataka, IN',
    city: 'Bengaluru',
    country: 'India',
    employmentType: 'Full-time',
    postingDate: '2026-07-05',
    jobDescription: 'Lead cloud infrastructure and CI/CD automation.',
  })
})

test('run validates the official BootLabs LinkedIn handoff and decorates India jobs', async () => {
  const bootlabs = await loadBootLabsModule()
  const requestedUrls = []
  const scraper = bootlabs.createBootLabsTechnologiesScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === bootlabs.CAREER_PAGE_URL) return officialSiteHtml
      if (url === bootlabs.LINKEDIN_INDIA_JOBS_URL) return searchResultsHtml
      if (url.startsWith('https://in.linkedin.com/jobs/view/lead-devops-engineer-at-bootlabs-4060905526')) {
        return detailHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    bootlabs.CAREER_PAGE_URL,
    bootlabs.LINKEDIN_INDIA_JOBS_URL,
    'https://in.linkedin.com/jobs/view/lead-devops-engineer-at-bootlabs-4060905526?position=1&pageNum=0',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'bootlabstechnologies')
  assert.equal(jobs[0].company, 'BootLabs Technologies')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].link, 'https://in.linkedin.com/jobs/view/lead-devops-engineer-at-bootlabs-4060905526?position=1&pageNum=0')
})
