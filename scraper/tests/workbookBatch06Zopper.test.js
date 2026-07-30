import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
  <html>
    <body>
      <main>
        <h1>Empowering You to Soar Higher Every Day!</h1>
        <a href="https://www.linkedin.com/company/zopper/jobs/">See Open Positions</a>
        <h2>Why Zopper Is Your Next Career Move?</h2>
        <p>Innovate with impact.</p>
        <h2>Perks of Being a Zopperite</h2>
        <h2>Work Hard, Play Harder - Life at Zopper</h2>
      </main>
    </body>
  </html>
`

const VERIFIED_LINKEDIN_COMPANY_HTML = `
  <html>
    <head><title>Zopper | LinkedIn</title></head>
    <body>
      <meta content="urn:li:organization:2760462">
      <p>Democratising Access To Insurance</p>
      <a href="https://www.zopper.com">https://www.zopper.com</a>
      <p>Noida, Uttar Pradesh</p>
    </body>
  </html>
`

const VERIFIED_LINKEDIN_SEARCH_HTML = `
  <html>
    <head><title>2 Zopper Jobs in India | LinkedIn</title></head>
    <body>
      <h1>2 Zopper Jobs in India</h1>
      <div class="base-card base-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4422163474">
        <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/relationship-manager-b2b-field-sales-in-bangalore-at-zopper-4422163474?trk=public_jobs_topcard-title">
          <h3 class="base-search-card__title">Relationship Manager (B2B Field Sales) - Bangalore</h3>
        </a>
        <h4 class="base-search-card__subtitle">
          <a>Zopper</a>
        </h4>
        <span class="job-search-card__location">Bengaluru, Karnataka, India</span>
        <time class="job-search-card__listdate" datetime="2026-07-18"></time>
      </div>
      <div class="base-card base-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4406768440">
        <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/business-development-manager-bancassurance-at-zopper-4406768440?trk=public_jobs_topcard-title">
          <h3 class="base-search-card__title">Business Development Manager, Bancassurance</h3>
        </a>
        <h4 class="base-search-card__subtitle">
          <a>Zopper</a>
        </h4>
        <span class="job-search-card__location">Mumbai, Maharashtra, India</span>
        <time class="job-search-card__listdate" datetime="2026-07-12"></time>
      </div>
      <div class="base-card base-card--link job-search-card" data-entity-urn="urn:li:jobPosting:9999999999">
        <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/other-job-9999999999?trk=public_jobs_topcard-title">
          <h3 class="base-search-card__title">Outside India Role</h3>
        </a>
        <h4 class="base-search-card__subtitle">
          <a>Other Company</a>
        </h4>
        <span class="job-search-card__location">Singapore</span>
        <time class="job-search-card__listdate" datetime="2026-07-12"></time>
      </div>
    </body>
  </html>
`

const VERIFIED_LINKEDIN_DETAIL_HTML = `
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": "Relationship Manager (B2B Field Sales) - Bangalore",
      "description": "<p>Drive B2B sales growth and stakeholder management across retail partners.</p>",
      "datePosted": "2026-07-18",
      "employmentType": "FULL_TIME",
      "hiringOrganization": {
        "@type": "Organization",
        "name": "Zopper"
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
`

const loadModule = async () => {
  try {
    return await import('../workbookbatch06/zopper.js')
  } catch {
    assert.fail('Expected Zopper scraper module at ../workbookbatch06/zopper.js')
  }
}

test('Zopper validates the verified first-party careers handoff and public LinkedIn shells', async () => {
  const zopper = await loadModule()
  const listings = zopper.extractSearchResults(VERIFIED_LINKEDIN_SEARCH_HTML)
  const detail = zopper.extractJobDetail(VERIFIED_LINKEDIN_DETAIL_HTML, listings[0])

  assert.equal(zopper.SOURCE, 'zopper')
  assert.equal(zopper.COMPANY, 'Zopper')
  assert.equal(zopper.VERIFIED_ON, '2026-07-25')
  assert.equal(zopper.CAREERS_URL, 'https://www.zopper.com/about-us/careers')
  assert.equal(
    zopper.LINKEDIN_COMPANY_JOBS_URL,
    'https://www.linkedin.com/company/zopper/jobs/',
  )
  assert.equal(
    zopper.LINKEDIN_INDIA_JOBS_URL,
    'https://www.linkedin.com/jobs/search/?f_C=2760462&geoId=102713980',
  )
  assert.equal(
    zopper.DISPOSITION,
    'verified-first-party-careers-page-plus-public-linkedin-india-jobs-search',
  )
  assert.match(zopper.VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(
    zopper.VERIFIED_SURFACE_SUMMARY,
    /https:\/\/www\.zopper\.com\/about-us\/careers/i,
  )
  assert.match(
    zopper.VERIFIED_SURFACE_SUMMARY,
    /https:\/\/www\.linkedin\.com\/company\/zopper\/jobs\//i,
  )
  assert.match(
    zopper.VERIFIED_SURFACE_SUMMARY,
    /Relationship Manager \(B2B Field Sales\) - Bangalore/i,
  )
  assert.equal(zopper.hasOfficialCareersPageSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(
    zopper.extractLinkedInJobsUrl(VERIFIED_CAREERS_HTML),
    zopper.LINKEDIN_COMPANY_JOBS_URL,
  )
  assert.equal(
    zopper.pageIndicatesZopperLinkedInCompany(VERIFIED_LINKEDIN_COMPANY_HTML),
    true,
  )
  assert.equal(
    zopper.hasVerifiedLinkedInJobsPageSignal(VERIFIED_LINKEDIN_SEARCH_HTML),
    true,
  )
  assert.equal(listings.length, 2)
  assert.deepEqual(
    {
      ...listings[0],
      ...Object.fromEntries(
        Object.entries(detail).filter(([, value]) => value != null),
      ),
    },
    {
      title: 'Relationship Manager (B2B Field Sales) - Bangalore',
      company: 'Zopper',
      department: null,
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '4422163474',
      requisitionId: '4422163474',
      sourceUrl: 'https://www.linkedin.com/jobs/view/relationship-manager-b2b-field-sales-in-bangalore-at-zopper-4422163474?trk=public_jobs_topcard-title',
      applyUrl: 'https://www.linkedin.com/jobs/view/relationship-manager-b2b-field-sales-in-bangalore-at-zopper-4422163474?trk=public_jobs_topcard-title',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-18',
      closingDate: null,
      jobDescription: 'Drive B2B sales growth and stakeholder management across retail partners.',
    },
  )
})

test('Zopper run validates the official handoff and returns India jobs from the public LinkedIn search', async () => {
  const zopper = await loadModule()
  const requestedUrls = []

  const jobs = await zopper.createZopperScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === zopper.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (url === zopper.LINKEDIN_COMPANY_PAGE_URL) return VERIFIED_LINKEDIN_COMPANY_HTML
      if (url === zopper.LINKEDIN_INDIA_JOBS_URL) return VERIFIED_LINKEDIN_SEARCH_HTML
      if (url === 'https://www.linkedin.com/jobs/view/relationship-manager-b2b-field-sales-in-bangalore-at-zopper-4422163474?trk=public_jobs_topcard-title') {
        return VERIFIED_LINKEDIN_DETAIL_HTML
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(
    requestedUrls,
    [
      zopper.CAREERS_URL,
      zopper.LINKEDIN_COMPANY_PAGE_URL,
      zopper.LINKEDIN_INDIA_JOBS_URL,
      'https://www.linkedin.com/jobs/view/relationship-manager-b2b-field-sales-in-bangalore-at-zopper-4422163474?trk=public_jobs_topcard-title',
    ],
  )
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'zopper')
  assert.equal(jobs[0].company, 'Zopper')
  assert.equal(jobs[0].location, 'Bengaluru, Karnataka, India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(
    jobs[0].jobDescription,
    'Drive B2B sales growth and stakeholder management across retail partners.',
  )
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-25T00:00:00.000Z')
})

test('Zopper run keeps conservative listing data when LinkedIn detail enrichment fails', async () => {
  const zopper = await loadModule()
  const requestedUrls = []

  const jobs = await zopper.createZopperScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === zopper.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (url === zopper.LINKEDIN_COMPANY_PAGE_URL) return VERIFIED_LINKEDIN_COMPANY_HTML
      if (url === zopper.LINKEDIN_INDIA_JOBS_URL) return VERIFIED_LINKEDIN_SEARCH_HTML
      if (url === 'https://www.linkedin.com/jobs/view/relationship-manager-b2b-field-sales-in-bangalore-at-zopper-4422163474?trk=public_jobs_topcard-title') {
        throw new Error(`HTTP 429 for ${url}`)
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(
    requestedUrls,
    [
      zopper.CAREERS_URL,
      zopper.LINKEDIN_COMPANY_PAGE_URL,
      zopper.LINKEDIN_INDIA_JOBS_URL,
      'https://www.linkedin.com/jobs/view/relationship-manager-b2b-field-sales-in-bangalore-at-zopper-4422163474?trk=public_jobs_topcard-title',
    ],
  )
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Relationship Manager (B2B Field Sales) - Bangalore')
  assert.equal(jobs[0].location, 'Bengaluru, Karnataka, India')
  assert.equal(jobs[0].jobDescription, null)
  assert.equal(jobs[0].source, 'zopper')
})

test('Zopper fails closed when the verified first-party or LinkedIn public contract drifts', async () => {
  const zopper = await loadModule()

  await assert.rejects(
    zopper.createZopperScraper().run({
      fetchText: async (url) => {
        if (url === zopper.CAREERS_URL) {
          return VERIFIED_CAREERS_HTML.replace(
            'https://www.linkedin.com/company/zopper/jobs/',
            'https://www.linkedin.com/company/other-company/jobs/',
          )
        }

        return VERIFIED_LINKEDIN_COMPANY_HTML
      },
    }),
    /linkedin careers handoff/i,
  )

  await assert.rejects(
    zopper.createZopperScraper().run({
      fetchText: async (url) => {
        if (url === zopper.CAREERS_URL) {
          return `${VERIFIED_CAREERS_HTML}<a href="/careers/openings/founding-engineer">Founding Engineer</a>`
        }

        return VERIFIED_LINKEDIN_COMPANY_HTML
      },
    }),
    /first-party public jobs surface|public careers surface/i,
  )

  await assert.rejects(
    zopper.createZopperScraper().run({
      fetchText: async (url) => {
        if (url === zopper.CAREERS_URL) return VERIFIED_CAREERS_HTML
        if (url === zopper.LINKEDIN_COMPANY_PAGE_URL) {
          return `
            <html>
              <head><title>Other Company | LinkedIn</title></head>
              <body><p>Something else</p></body>
            </html>
          `
        }

        return VERIFIED_LINKEDIN_SEARCH_HTML
      },
    }),
    /company page no longer matches/i,
  )

  await assert.rejects(
    zopper.createZopperScraper().run({
      fetchText: async (url) => {
        if (url === zopper.CAREERS_URL) return VERIFIED_CAREERS_HTML
        if (url === zopper.LINKEDIN_COMPANY_PAGE_URL) return VERIFIED_LINKEDIN_COMPANY_HTML
        if (url === zopper.LINKEDIN_INDIA_JOBS_URL) {
          return `
            <html>
              <body>
                <h1>Jobs</h1>
                <p>Explore openings.</p>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /jobs search page no longer matches/i,
  )
})
