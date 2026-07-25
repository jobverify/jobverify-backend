import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-11T00:00:00.000Z'

const loadSafranEngineeringServicesIndiaModule = async () => {
  try {
    return await import('../safranengineeringservicesindia/script.js')
  } catch {
    assert.fail('Expected Safran Engineering Services India scraper module at ../safranengineeringservicesindia/script.js')
  }
}

const companyPageHtml = `
  <html>
    <head>
      <title>Safran Engineering Services - Engineering partner for the Aerospace, Defense, Automotive and Rail industries | Safran</title>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://www.safran-group.com/companies/safran-engineering-services",
              "url": "https://www.safran-group.com/companies/safran-engineering-services",
              "name": "Safran Engineering Services"
            }
          ]
        }
      </script>
    </head>
    <body>
      <a href="/countries/india">India</a>
      <p class="c-structured-job-offers__title">Join Safran Engineering Services and take a look at our <strong>158</strong> positions</p>
      <a class="c-btn c-btn--arrow-btn" href="/jobs?companies%5B%5D=636-safran-engineering-services">See all the job openings</a>
    </body>
  </html>
`

const listingPageOneHtml = `
  <html>
    <head>
      <title>Job openings | Safran</title>
    </head>
    <body class="node list_job_offers">
      <span class="c-structured-news-list__results--nb">51</span>&nbsp;result(s)

      <div class="c-offer-item js-block-link">
        <div class="c-offer-item__content">
          <a href="https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060" class="c-offer-item__title js-block-link--href">SW Architect - TechLead (1 Position) P1 - BoostIT - Indirect</a>
          <span class="c-offer-item__date">12.17.2025</span>
          <div class="c-offer-item__infos">
            <span class="c-offer-item__infos__item">Safran Engineering Services</span>
            <span class="c-offer-item__infos__item">Bangalore, India</span>
            <span class="c-offer-item__infos__item">Professional, Engineer &amp; Manager</span>
            <span class="c-offer-item__infos__item">Permanent</span>
            <span class="c-offer-item__infos__item">Software</span>
          </div>
        </div>
      </div>

      <div class="c-offer-item js-block-link">
        <div class="c-offer-item__content">
          <a href="https://www.safran-group.com/jobs/india/bangalore/harness-integration-dmu-validation-engineer-173083" class="c-offer-item__title js-block-link--href">Harness Integration &amp; DMU Validation Engineer</a>
          <span class="c-offer-item__date">12.16.2025</span>
          <div class="c-offer-item__infos">
            <span class="c-offer-item__infos__item">Safran Engineering Services</span>
            <span class="c-offer-item__infos__item">Bangalore, India</span>
            <span class="c-offer-item__infos__item">Professional, Engineer &amp; Manager</span>
            <span class="c-offer-item__infos__item">Permanent</span>
            <span class="c-offer-item__infos__item">Architecture and systems engineering</span>
          </div>
        </div>
      </div>

      <div class="o-grid o-grid--center c-structured-search-results__pagination-wrapper no-print">
        <div class="pagination">
          <div class="pagination__pages">
            <div class="pagination__nav-btn pagination__nav-btn--disabled"></div>
            <div>
              <button class="pagination__page pagination__page--active" aria-current="page" aria-label="Page 1">1</button>
              <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india&amp;page=1" title="Go to page 2" class="pagination__page"><span class="visually-hidden">Page</span>2</a>
              <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india&amp;page=2" title="Go to page 3" class="pagination__page"><span class="visually-hidden">Page</span>3</a>
              <span class="pagination__ellipsis">...</span>
              <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india&amp;page=4" title="Go to last page" class="pagination__page">5</a>
            </div>
            <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india&amp;page=1" title="Go to next page" class="pagination__nav-btn pagination__nav-btn--next" rel="next"></a>
          </div>
        </div>
      </div>
    </body>
  </html>
`

const listingPageTwoHtml = `
  <html>
    <head>
      <title>Job openings | Safran</title>
    </head>
    <body class="node list_job_offers">
      <span class="c-structured-news-list__results--nb">51</span>&nbsp;result(s)

      <div class="c-offer-item js-block-link">
        <div class="c-offer-item__content">
          <a href="https://www.safran-group.com/jobs/india/bangalore/plc-programmer-2-167752" class="c-offer-item__title js-block-link--href">PLC Programmer - 2</a>
          <span class="c-offer-item__date">12.17.2025</span>
          <div class="c-offer-item__infos">
            <span class="c-offer-item__infos__item">Safran Engineering Services</span>
            <span class="c-offer-item__infos__item">Bangalore, India</span>
            <span class="c-offer-item__infos__item">Employees - Staff</span>
            <span class="c-offer-item__infos__item">Permanent</span>
            <span class="c-offer-item__infos__item">Software</span>
          </div>
        </div>
      </div>

      <div class="o-grid o-grid--center c-structured-search-results__pagination-wrapper no-print">
        <div class="pagination">
          <div class="pagination__pages">
            <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india" title="Go to previous page" class="pagination__nav-btn pagination__nav-btn--prev" rel="prev"></a>
            <div>
              <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india" title="Go to page 1" class="pagination__page"><span class="visually-hidden">Page</span>1</a>
              <button class="pagination__page pagination__page--active" aria-current="page" aria-label="Page 2">2</button>
              <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india&amp;page=2" title="Go to page 3" class="pagination__page"><span class="visually-hidden">Page</span>3</a>
            </div>
            <a href="?companies%5B0%5D=636-safran-engineering-services&amp;countries%5B0%5D=1083-india&amp;page=2" title="Go to next page" class="pagination__nav-btn pagination__nav-btn--next" rel="next"></a>
          </div>
        </div>
      </div>
    </body>
  </html>
`

const detailPageHtml = `
  <html>
    <head>
      <title>SW Architect / TechLead (1 Position) P1 - BoostIT - Indirect - India, Bangalore - 160060 | Safran</title>
      <meta name="description" content="Reporting to the IS Automation and Innovation team of Safran Engineering Services, the Software architect's missions are to define application design and solutions and improve common technical framework resources.">
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "JobPosting",
              "title": "SW Architect / TechLead (1 Position) P1 - BoostIT - Indirect",
              "employmentType": "Permanent",
              "identifier": "2025-160060",
              "jobLocation": {
                "@type": "Place",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Bangalore",
                  "addressCountry": "India"
                }
              },
              "description": "Reporting to the IS Automation and Innovation team of Safran Engineering Services, the Software architect's missions are to define application design and solutions and improve common technical framework resources.",
              "industry": "Software",
              "occupationalCategory": "Professional, Engineer & Manager"
            }
          ]
        }
      </script>
    </head>
    <body class="node job_offer">
      <div class="c-references-block-container__details">
        <span>Software</span>
        <span>Bangalore</span>
        <span>India</span>
        <span>Permanent</span>
        <span>Professional, Engineer &amp; Manager</span>
        <span># 2025-160060</span>
      </div>
      <a id="simple-apply" href="/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060/jobapplication" class="c-btn c-btn--primary c-btn--full-width" rel="nofollow">Apply</a>
      <a id="one-click-apply" href="/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060/one-click-jobapplication" class="c-btn c-btn--primary-inverted c-btn--full-width" rel="nofollow">Apply with one click</a>
      <div class="c-structured-text-and-image__text-container">
        <h2>Job Description</h2>
        <p>Reporting to the IS Automation and Innovation team of Safran Engineering Services, the Software architect's missions are to:</p>
        <ul>
          <li>define application design and solutions</li>
          <li>improve common technical framework implementation and resources</li>
        </ul>
      </div>
    </body>
  </html>
`

test('Safran Engineering Services India constants stay pinned to the verified Safran company and India jobs routes', async () => {
  const safran = await loadSafranEngineeringServicesIndiaModule()

  assert.equal(safran.SOURCE, 'safranengineeringservicesindia')
  assert.equal(safran.COMPANY, 'Safran Engineering Services India')
  assert.equal(safran.PUBLIC_COMPANY_NAME, 'Safran Engineering Services')
  assert.equal(safran.COMPANY_PAGE_URL, 'https://www.safran-group.com/companies/safran-engineering-services')
  assert.equal(
    safran.LISTING_URL,
    'https://www.safran-group.com/jobs?companies%5B%5D=636-safran-engineering-services&countries%5B%5D=1083-india',
  )
  assert.equal(safran.buildListingUrl(), safran.LISTING_URL)
  assert.equal(
    safran.buildListingUrl(3),
    'https://www.safran-group.com/jobs?companies%5B%5D=636-safran-engineering-services&countries%5B%5D=1083-india&page=2',
  )
  assert.equal(safran.hasVerifiedCompanyPageSignal(companyPageHtml), true)
  assert.equal(safran.hasVerifiedListingPageSignal(listingPageOneHtml), true)
})

test('extractSearchResults keeps only verified Safran India cards and reads total page count from pagination', async () => {
  const safran = await loadSafranEngineeringServicesIndiaModule()

  assert.equal(safran.extractTotalPages(listingPageOneHtml), 5)
  assert.deepEqual(safran.extractSearchResults(listingPageOneHtml), [
    {
      title: 'SW Architect - TechLead (1 Position) P1 - BoostIT - Indirect',
      company: 'Safran Engineering Services India',
      department: 'Software',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '160060',
      requisitionId: '160060',
      sourceUrl: 'https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060',
      applyUrl: 'https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060',
      employmentType: 'Permanent',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '12.17.2025',
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'Harness Integration & DMU Validation Engineer',
      company: 'Safran Engineering Services India',
      department: 'Architecture and systems engineering',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '173083',
      requisitionId: '173083',
      sourceUrl: 'https://www.safran-group.com/jobs/india/bangalore/harness-integration-dmu-validation-engineer-173083',
      applyUrl: 'https://www.safran-group.com/jobs/india/bangalore/harness-integration-dmu-validation-engineer-173083',
      employmentType: 'Permanent',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '12.16.2025',
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('extractJobDetail prefers Safran first-party JobPosting metadata and first-party apply links', async () => {
  const safran = await loadSafranEngineeringServicesIndiaModule()
  const [listing] = safran.extractSearchResults(listingPageOneHtml)

  assert.deepEqual(safran.extractJobDetail(detailPageHtml, listing), {
    title: 'SW Architect / TechLead (1 Position) P1 - BoostIT - Indirect',
    company: 'Safran Engineering Services India',
    department: 'Software',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '160060',
    requisitionId: '2025-160060',
    sourceUrl: 'https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060',
    applyUrl: 'https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060/jobapplication',
    employmentType: 'Permanent',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '12.17.2025',
    closingDate: null,
    jobDescription: "Reporting to the IS Automation and Innovation team of Safran Engineering Services, the Software architect's missions are to define application design and solutions and improve common technical framework resources.",
  })
})

test('run walks verified Safran India pagination and decorates shared runner fields', async () => {
  const safran = await loadSafranEngineeringServicesIndiaModule()
  const requestedUrls = []

  const secondDetailPageHtml = detailPageHtml
    .replaceAll('160060', '167752')
    .replaceAll(
      'SW Architect / TechLead (1 Position) P1 - BoostIT - Indirect',
      'PLC Programmer - 2',
    )
    .replaceAll(
      'Reporting to the IS Automation and Innovation team of Safran Engineering Services, the Software architect\'s missions are to define application design and solutions and improve common technical framework resources.',
      'The PLC programmer role focuses on industrial automation software delivery for Safran Engineering Services.',
    )

  const jobs = await safran.createSafranEngineeringServicesIndiaScraper({
    maxPages: 2,
    maxJobs: 2,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === safran.COMPANY_PAGE_URL) return companyPageHtml
      if (url === safran.buildListingUrl(1)) return listingPageOneHtml
      if (url === safran.buildListingUrl(2)) return listingPageTwoHtml
      if (url === 'https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060') {
        return detailPageHtml
      }
      if (url === 'https://www.safran-group.com/jobs/india/bangalore/harness-integration-dmu-validation-engineer-173083') {
        return detailPageHtml
          .replaceAll('160060', '173083')
          .replaceAll(
            'SW Architect / TechLead (1 Position) P1 - BoostIT - Indirect',
            'Harness Integration & DMU Validation Engineer',
          )
          .replaceAll(
            'Software',
            'Architecture and systems engineering',
          )
      }
      if (url === 'https://www.safran-group.com/jobs/india/bangalore/plc-programmer-2-167752') {
        return secondDetailPageHtml
      }

      throw new Error(`Unexpected Safran fixture URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    safran.COMPANY_PAGE_URL,
    safran.buildListingUrl(1),
    'https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060',
    'https://www.safran-group.com/jobs/india/bangalore/harness-integration-dmu-validation-engineer-173083',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'safranengineeringservicesindia')
  assert.equal(jobs[0].company, 'Safran Engineering Services India')
  assert.equal(
    jobs[0].applyUrl,
    'https://www.safran-group.com/jobs/india/bangalore/sw-architect-techlead-1-position-p1-boostit-indirect-160060/jobapplication',
  )
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[1].jobId, '173083')
  assert.equal(jobs[1].department, 'Architecture and systems engineering')
})

test('Safran Engineering Services India fails closed when the verified company or listing identity drifts', async () => {
  const safran = await loadSafranEngineeringServicesIndiaModule()

  await assert.rejects(
    safran.createSafranEngineeringServicesIndiaScraper().run({
      fetchText: async (url) => {
        if (url === safran.COMPANY_PAGE_URL) {
          return companyPageHtml.replace('Safran Engineering Services', 'Different Company')
        }

        throw new Error(`Unexpected Safran fixture URL: ${url}`)
      },
    }),
    /verified Safran Engineering Services company page/i,
  )

  await assert.rejects(
    safran.createSafranEngineeringServicesIndiaScraper().run({
      fetchText: async (url) => {
        if (url === safran.COMPANY_PAGE_URL) return companyPageHtml
        if (url === safran.buildListingUrl(1)) {
          return listingPageOneHtml.replaceAll('Safran Engineering Services', 'Different Company')
        }

        throw new Error(`Unexpected Safran fixture URL: ${url}`)
      },
    }),
    /verified Safran India jobs listing/i,
  )
})
