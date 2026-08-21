import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMPANY,
  HOMEPAGE_URL,
  LINKEDIN_COMPANY_ID,
  LINKEDIN_COMPANY_PAGE_URL,
  LINKEDIN_INDIA_JOBS_URL,
  SOURCE,
  createStellaraaEdutechScraper,
  extractJobDetail,
  extractSearchResults,
  pageIndicatesStellaraaCompany,
  pageIndicatesStellaraaHomepage,
  searchPageShowsZeroResults,
} from './script.js'

const homepageHtml = `
  <html>
    <head>
      <title>Home | Stellaraa</title>
      <meta name="keywords" content="STELLARAA, online education" />
    </head>
    <body>
      <nav>
        <a href="https://stellaraa.com/home/about_us">About</a>
        <a href="https://stellaraa.com/home/contact_us">Contact</a>
      </nav>
      <section>
        <span>WHERE EDUCATION</span>
        <span>MEETS INNOVATION.</span>
        <h4>At STELLARAA, we envision a world where education is accessible, engaging, and transformative.</h4>
      </section>
      <footer>
        <a target="_blank" href="https://www.linkedin.com/company/stellaraa/" class="text-decoration-none">LinkedIn</a>
      </footer>
    </body>
  </html>
`

const companyPageHtml = `
  <html>
    <head>
      <title>Stellaraa | LinkedIn</title>
      <link rel="canonical" href="https://in.linkedin.com/company/stellaraa" />
      <meta
        name="description"
        content="Stellaraa | 5,995 followers on LinkedIn. Where education meets innovation | Empowering Education through Innovation"
      />
    </head>
    <body>
      <code id="flagshipOrganizationTracking" style="display: none"><!--{"organization":{"objectUrn":"urn:li:organization:104439273"},"module":"COMPANY_OVERVIEW_PAGE","viewerUrn":0}--></code>
      <h3>Bengaluru, Karnataka <span>5,995 followers</span></h3>
      <dd>51-200 employees</dd>
      <a
        class="link-no-visited-state hover:no-underline"
        data-tracking-control-name="about_website"
        href="https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Estellaraa%2Ecom%2F&amp;trk=about_website"
      >
        Website
      </a>
      <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "slogan": "Where education meets innovation",
              "sameAs": "https://www.stellaraa.com/"
            }
          ]
        }
      </script>
    </body>
  </html>
`

const zeroJobsSearchHtml = `
  <html>
    <head>
      <title>0 Jobs jobs in India</title>
    </head>
    <body>
      <p>We couldn't find a match for Jobs jobs in India</p>
      <section class="jobs-search__results-list"></section>
    </body>
  </html>
`

const searchResultsHtml = `
  <section class="two-pane-serp-page__results-list">
    <ul class="jobs-search__results-list">
      <li>
        <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4431597269">
          <a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4431597269?position=1&amp;pageNum=0"></a>
          <div class="base-search-card__info">
            <h3 class="base-search-card__title">Corporate Development Intern</h3>
            <h4 class="base-search-card__subtitle">
              <a class="hidden-nested-link" href="https://www.linkedin.com/company/stellaraa/">Stellaraa</a>
            </h4>
            <div class="base-search-card__metadata">
              <span class="job-search-card__location">Tamil Nadu, India</span>
              <time class="job-search-card__listdate" datetime="2026-06-30">2 weeks ago</time>
            </div>
          </div>
        </div>
      </li>
      <li>
        <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4432000000">
          <a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/marketing-intern-at-other-co-4432000000?position=2&amp;pageNum=0"></a>
          <div class="base-search-card__info">
            <h3 class="base-search-card__title">Marketing Intern</h3>
            <h4 class="base-search-card__subtitle">
              <a class="hidden-nested-link" href="https://www.linkedin.com/company/other-co/">Other Co</a>
            </h4>
            <div class="base-search-card__metadata">
              <span class="job-search-card__location">Bengaluru, India</span>
              <time class="job-search-card__listdate" datetime="2026-06-30">2 weeks ago</time>
            </div>
          </div>
        </div>
      </li>
      <li>
        <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4432000001">
          <a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4432000001?position=3&amp;pageNum=0"></a>
          <div class="base-search-card__info">
            <h3 class="base-search-card__title">Corporate Development Intern</h3>
            <h4 class="base-search-card__subtitle">
              <a class="hidden-nested-link" href="https://www.linkedin.com/company/stellaraa/">Stellaraa</a>
            </h4>
            <div class="base-search-card__metadata">
              <span class="job-search-card__location">Austin, Texas, United States</span>
              <time class="job-search-card__listdate" datetime="2026-06-30">2 weeks ago</time>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </section>
`

const currentGuestSearchCardHtml = `
  <li>
    <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4455607809" data-impression-id="jobs-search-desktop-0">
      <a
        class="base-card__full-link absolute top-0 right-0 bottom-0 left-0 p-0 z-[2] outline-offset-[4px]"
        href="https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4455607809?position=1&amp;pageNum=0&amp;refId=aPeLjRRa%2B6KvC9Ca%2FOJBcg%3D%3D&amp;trackingId=p0xXkmCz717w5%2Fx07SEkUg%3D%3D"
      >
        <span class="sr-only">Corporate Development Intern</span>
      </a>
      <div class="search-entity-media"></div>
      <div class="base-search-card__info">
        <h3 class="base-search-card__title">
          Corporate Development Intern
        </h3>
        <h4 class="base-search-card__subtitle">
          <a
            class="hidden-nested-link"
            href="https://in.linkedin.com/company/stellaraa?trk=public_jobs_jserp-result_job-search-card-subtitle"
          >
            Stellaraa
          </a>
        </h4>
        <div class="base-search-card__metadata">
          <span class="job-search-card__location">
            Salem, Tamil Nadu, India
          </span>
          <div class="job-posting-benefits text-sm">
            <span class="job-posting-benefits__text">Be an early applicant</span>
          </div>
          <time class="job-search-card__listdate--new" datetime="2026-08-20">
            10 hours ago
          </time>
        </div>
      </div>
    </div>
  </li>
`

const detailHtml = `
  <html>
    <head>
      <title>Stellaraa hiring Corporate Development Intern in Tamil Nadu, India | LinkedIn</title>
      <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "JobPosting",
          "datePosted": "2026-06-30T07:22:50.000Z",
          "description": "&lt;p&gt;We Are Hiring | Build Your Career with Stellaraa.&lt;/p&gt;&lt;p&gt;Corporate Development Intern (Sales)&lt;/p&gt;&lt;p&gt;Location: Salem, Tamil Nadu&lt;/p&gt;&lt;p&gt;Hands-on experience in Corporate Sales and Client Acquisition.&lt;/p&gt;",
          "employmentType": "INTERN",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "Stellaraa",
            "sameAs": "https://in.linkedin.com/company/stellaraa"
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "IN",
              "addressLocality": "Tamil Nadu",
              "addressRegion": null
            }
          },
          "skills": "Sales,Customer Relationship Management (CRM),Strategic Initiatives,Market Research,Corporate Development",
          "title": "Corporate Development Intern",
          "validThrough": "2026-07-30T07:22:50.000Z",
          "educationRequirements": {
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "bachelor degree"
          }
        }
      </script>
    </head>
    <body></body>
  </html>
`

test('Stellaraa scraper constants stay pinned to the verified official homepage and LinkedIn company surfaces', () => {
  assert.equal(SOURCE, 'stellaraaedutechpvtltd')
  assert.equal(COMPANY, 'Stellaraa Edutech Pvt. Ltd.')
  assert.equal(HOMEPAGE_URL, 'https://stellaraa.com/')
  assert.equal(LINKEDIN_COMPANY_ID, '104439273')
  assert.equal(LINKEDIN_COMPANY_PAGE_URL, 'https://www.linkedin.com/company/stellaraa/')
  assert.equal(LINKEDIN_INDIA_JOBS_URL, 'https://www.linkedin.com/jobs/search/?f_C=104439273&geoId=102713980')
  assert.equal(pageIndicatesStellaraaHomepage(homepageHtml), true)
  assert.equal(pageIndicatesStellaraaCompany(companyPageHtml), true)
  assert.equal(searchPageShowsZeroResults(zeroJobsSearchHtml), true)
})

test('extractSearchResults keeps only Stellaraa India jobs from the public LinkedIn jobs search page', () => {
  assert.deepEqual(extractSearchResults(searchResultsHtml), [{
    title: 'Corporate Development Intern',
    company: 'Stellaraa Edutech Pvt. Ltd.',
    department: null,
    location: 'Tamil Nadu, India',
    city: 'Tamil Nadu',
    country: 'India',
    jobId: '4431597269',
    requisitionId: '4431597269',
    sourceUrl: 'https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4431597269?position=1&pageNum=0',
    applyUrl: 'https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4431597269?position=1&pageNum=0',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-30',
    closingDate: null,
    jobDescription: null,
  }])
})

test('extractSearchResults handles the current LinkedIn guest-search card markup for Stellaraa India jobs', () => {
  assert.deepEqual(extractSearchResults(currentGuestSearchCardHtml), [{
    title: 'Corporate Development Intern',
    company: 'Stellaraa Edutech Pvt. Ltd.',
    department: null,
    location: 'Salem, Tamil Nadu, India',
    city: 'Salem',
    country: 'India',
    jobId: '4455607809',
    requisitionId: '4455607809',
    sourceUrl: 'https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4455607809?position=1&pageNum=0&refId=aPeLjRRa%2B6KvC9Ca%2FOJBcg%3D%3D&trackingId=p0xXkmCz717w5%2Fx07SEkUg%3D%3D',
    applyUrl: 'https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4455607809?position=1&pageNum=0&refId=aPeLjRRa%2B6KvC9Ca%2FOJBcg%3D%3D&trackingId=p0xXkmCz717w5%2Fx07SEkUg%3D%3D',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-08-20',
    closingDate: null,
    jobDescription: null,
  }])
})

test('extractJobDetail reads the public JobPosting JSON-LD and location hint from the live Stellaraa role', () => {
  assert.deepEqual(extractJobDetail(detailHtml), {
    companyBrand: 'Stellaraa',
    companyLinkedInUrl: 'https://in.linkedin.com/company/stellaraa',
    location: 'Salem, Tamil Nadu, India',
    city: 'Salem',
    country: 'India',
    employmentType: 'Internship',
    postingDate: '2026-06-30',
    closingDate: '2026-07-30',
    minimumQualification: 'Bachelor degree',
    requiredSkills: [
      'Sales',
      'Customer Relationship Management (CRM)',
      'Strategic Initiatives',
      'Market Research',
      'Corporate Development',
    ],
    jobDescription: 'We Are Hiring | Build Your Career with Stellaraa. Corporate Development Intern (Sales) Location: Salem, Tamil Nadu Hands-on experience in Corporate Sales and Client Acquisition.',
  })
})

test('run verifies the official surfaces, enriches the public India job, and adds scraper metadata', async () => {
  const requestedUrls = []
  const scraper = createStellaraaEdutechScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === LINKEDIN_COMPANY_PAGE_URL) return companyPageHtml
      if (url === LINKEDIN_INDIA_JOBS_URL) return searchResultsHtml
      if (url === 'https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4431597269?position=1&pageNum=0') {
        return detailHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    LINKEDIN_COMPANY_PAGE_URL,
    LINKEDIN_INDIA_JOBS_URL,
    'https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4431597269?position=1&pageNum=0',
  ])

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Corporate Development Intern')
  assert.equal(jobs[0].company, 'Stellaraa Edutech Pvt. Ltd.')
  assert.equal(jobs[0].location, 'Salem, Tamil Nadu, India')
  assert.equal(jobs[0].city, 'Salem')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].employmentType, 'Internship')
  assert.equal(jobs[0].minimumQualification, 'Bachelor degree')
  assert.deepEqual(jobs[0].requiredSkills, [
    'Sales',
    'Customer Relationship Management (CRM)',
    'Strategic Initiatives',
    'Market Research',
    'Corporate Development',
  ])
  assert.equal(jobs[0].source, 'stellaraaedutechpvtltd')
  assert.equal(jobs[0].link, 'https://in.linkedin.com/jobs/view/corporate-development-intern-at-stellaraa-4431597269?position=1&pageNum=0')
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})

test('default Stellaraa fetches pass AbortSignal so homepage and LinkedIn probes are bounded', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls = []
  const signals = []

  globalThis.fetch = async (url, options = {}) => {
    requestedUrls.push(String(url))
    signals.push(options.signal)

    if (url === HOMEPAGE_URL) {
      return new Response(homepageHtml, { status: 200 })
    }

    if (url === LINKEDIN_COMPANY_PAGE_URL) {
      return new Response(companyPageHtml, { status: 200 })
    }

    if (url === LINKEDIN_INDIA_JOBS_URL) {
      return new Response(zeroJobsSearchHtml, { status: 200 })
    }

    throw new Error(`Unexpected URL: ${url}`)
  }

  try {
    const jobs = await createStellaraaEdutechScraper().run()

    assert.deepEqual(jobs, [])
    assert.deepEqual(requestedUrls, [
      HOMEPAGE_URL,
      LINKEDIN_COMPANY_PAGE_URL,
      LINKEDIN_INDIA_JOBS_URL,
    ])
    assert.equal(signals.length, requestedUrls.length)
    assert.ok(signals.every((signal) => signal instanceof AbortSignal))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('run fails closed when the verified official homepage or jobs search contract drifts', async () => {
  const scraper = createStellaraaEdutechScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return '<html><body><h1>Placeholder</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === LINKEDIN_COMPANY_PAGE_URL) return companyPageHtml
        if (url === LINKEDIN_INDIA_JOBS_URL) {
          return '<html><head><title>1 jobs in India</title></head><body><section class="jobs-search__results-list"></section></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /jobs search page/i,
  )
})
