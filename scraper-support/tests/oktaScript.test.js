import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Okta</title>
  </head>
  <body>
    <main>
      <h1>Careers at Okta</h1>
      <a href="https://www.okta.com/company/careers/job-listing/">Open positions</a>
    </main>
  </body>
</html>
`

const JOB_LISTING_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="https://www.okta.com/company/careers/job-listing/" />
  </head>
  <body>
    <article class="PageFull">
      <h2>Find your place here</h2>
      <form data-drupal-selector="views-exposed-form-careers-main" action="/company/careers/job-listing/" method="get"></form>
      <h3>Business Technology</h3>
      <div class="views-row even"><div class="views-field views-field-title"><span class="field-content"><a href="/company/careers/business-technology/senior-aem-engineer-7629690/" hreflang="en">Senior AEM Engineer</a></span></div><div class="views-field views-field-field-job-location"><div class="field-content">Bengaluru, India</div></div></div>
      <div class="views-row odd"><div class="views-field views-field-title"><span class="field-content"><a href="/company/careers/business-technology/principal-data-platform-engineer-bengaluru-7648974/" hreflang="en">Principal Data Platform Engineer (Bengaluru)</a></span></div><div class="views-field views-field-field-job-location"><div class="field-content">Bengaluru, India</div></div></div>
      <div class="views-row even"><div class="views-field views-field-title"><span class="field-content"><a href="/company/careers/business-technology/cloud-infrastructure-architect-okta-federal-8004104/" hreflang="en">Cloud Infrastructure Architect, Okta Federal</a></span></div><div class="views-field views-field-field-job-location"><div class="field-content">Washington, DC</div></div></div>
      <h3>Product</h3>
      <div class="views-row odd"><div class="views-field views-field-title"><span class="field-content"><a href="/company/careers/product/staff-product-designer-7839840/" hreflang="en">Staff Product Designer</a></span></div><div class="views-field views-field-field-job-location"><div class="field-content">Bengaluru, India</div></div></div>
      <div class="views-row even"><div class="views-field views-field-title"><span class="field-content"><a href="/company/careers/product/staff-product-designer-8023904/" hreflang="en">Staff Product Designer</a></span></div><div class="views-field views-field-field-job-location"><div class="field-content">Bengaluru, India</div></div></div>
      <h3>Solutions Engineering</h3>
      <div class="views-row odd"><div class="views-field views-field-title"><span class="field-content"><a href="/company/careers/solutions-engineering/senior-alliances-solution-engineering-apj-6839581/" hreflang="en">Senior Alliances Solution Engineering APJ</a></span></div><div class="views-field views-field-field-job-location"><div class="field-content">Bengaluru, India</div></div></div>
      <div class="views-row even"><div class="views-field views-field-title"><span class="field-content"><a href="/company/careers/solutions-engineering/solutions-engineer-okta-8064221/" hreflang="en">Solutions Engineer, Okta</a></span></div><div class="views-field views-field-field-job-location"><div class="field-content">Bengaluru, India</div></div></div>
    </article>
  </body>
</html>
`

const DRIFTED_LISTING_HTML = `
<!doctype html>
<html>
  <body>
    <main>
      <h1>Jobs</h1>
      <p>Placeholder</p>
    </main>
  </body>
</html>
`

const JOB_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior AEM Engineer | Okta</title>
  </head>
  <body>
    <article>
      <h1>Senior AEM Engineer</h1>
      <p>Bengaluru, India</p>
      <div class="field--name-body">
        <p>Okta is seeking an experienced Senior Adobe Experience Cloud Engineer with a deep understanding of Adobe's tech stack to join our growing team.</p>
        <ul>
          <li>BS Computer Science or other technical degree. 3+ years of related overall technology experience</li>
          <li>Experience in Adobe Experience Manager (required)</li>
        </ul>
      </div>
    </article>
  </body>
</html>
`

const loadOktaModule = async () => {
  try {
    return await import('../../scraper/okta/script.js')
  } catch {
    assert.fail('Expected Okta scraper module at ../../scraper/okta/script.js')
  }
}

test('Okta helpers preserve the verified careers landing and first-party listing contracts', async () => {
  const okta = await loadOktaModule()

  assert.equal(okta.SOURCE, 'okta')
  assert.equal(okta.COMPANY, 'Okta')
  assert.equal(okta.OFFICIAL_BRAND_NAME, 'Okta')
  assert.equal(okta.VERIFIED_ON, '2026-07-16')
  assert.equal(okta.HOMEPAGE_URL, 'https://www.okta.com/')
  assert.equal(okta.CAREERS_URL, 'https://www.okta.com/en-in/company/careers/')
  assert.equal(okta.PUBLIC_BOARD_URL, 'https://www.okta.com/company/careers/job-listing/')
  assert.equal(okta.hasOfficialCareersPageSignal(CAREERS_HTML), true)
  assert.equal(okta.hasOfficialJobListingSignal(JOB_LISTING_HTML), true)
  assert.equal(
    okta.extractJobId('https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/'),
    '7629690',
  )
})

test('extractIndiaJobsFromJobListing filters to India roles and maps first-party detail URLs into shared job fields', async () => {
  const okta = await loadOktaModule()
  const jobs = okta.extractIndiaJobsFromJobListing(JOB_LISTING_HTML)

  assert.equal(jobs.length, 6)
  assert.deepEqual(jobs[0], {
    title: 'Senior AEM Engineer',
    company: 'Okta',
    department: 'Business Technology',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '7629690',
    requisitionId: '7629690',
    sourceUrl: 'https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/',
    applyUrl: 'https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official Okta jobs page lists Senior AEM Engineer in Bengaluru, India under Business Technology.',
    remoteStatus: null,
  })
  assert.equal(jobs[1].jobId, '7648974')
  assert.equal(jobs[2].department, 'Product')
  assert.equal(jobs.at(-1)?.department, 'Solutions Engineering')
  assert.equal(jobs.some((job) => /Washington/.test(job.location ?? '')), false)
})

test('Okta extracts experience from the official first-party job detail page', async () => {
  const okta = await loadOktaModule()

  assert.equal(okta.hasOfficialJobDetailSignal(JOB_DETAIL_HTML), true)
  assert.deepEqual(
    okta.extractJobDetail(JOB_DETAIL_HTML, okta.extractIndiaJobsFromJobListing(JOB_LISTING_HTML)[0]),
    {
      title: 'Senior AEM Engineer',
      company: 'Okta',
      department: 'Business Technology',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '7629690',
      requisitionId: '7629690',
      sourceUrl: 'https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/',
      applyUrl: 'https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/',
      employmentType: null,
      experienceRequired: '3+ years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: "Okta is seeking an experienced Senior Adobe Experience Cloud Engineer with a deep understanding of Adobe's tech stack to join our growing team. BS Computer Science or other technical degree. 3+ years of related overall technology experience Experience in Adobe Experience Manager (required)",
      publicExperienceChecked: true,
      remoteStatus: null,
    },
  )
})

test('Okta handles the live-style public detail shell with nested heading markup and trims the apply form', async () => {
  const okta = await loadOktaModule()
  const listing = okta.extractIndiaJobsFromJobListing(JOB_LISTING_HTML)[0]
  const liveShapeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior AEM Engineer | Okta</title>
    <meta name="description" content="Secure Every Identity, from AI to Human. Okta is seeking an experienced Senior Adobe Experience Cloud Engineer. Qualifications include 3+ years of related overall technology experience." />
  </head>
  <body>
    <main role="main" class="layout__content">
      <section class="Breadcrumb"><a href="/company/careers/">Careers</a></section>
      <article class="PageFull">
        <h1>
          <span> Senior AEM Engineer</span>
        </h1>
        <p>Bengaluru, India</p>
        <p>Secure Every Identity, from AI to Human</p>
        <p>Okta is seeking an experienced Senior Adobe Experience Cloud Engineer with a deep understanding of Adobe's tech stack to join our growing team.</p>
        <p>Responsibilities</p>
        <p>Lead the development and implementation of custom solutions.</p>
        <p>Qualifications</p>
        <p>BS Computer Science or other technical degree. 3+ years of related overall technology experience.</p>
        <p>The Okta Experience</p>
      </article>
      <div class="Job__formwrapper">
        <h3>Apply</h3>
        <label>First Name</label>
      </div>
    </main>
  </body>
</html>
`

  assert.equal(okta.hasOfficialJobDetailSignal(liveShapeHtml), true)

  const detail = okta.extractJobDetail(liveShapeHtml, listing)
  assert.equal(detail.title, 'Senior AEM Engineer')
  assert.equal(detail.experienceRequired, '3+ years')
  assert.equal(detail.publicExperienceChecked, true)
  assert.match(detail.jobDescription, /Secure Every Identity, from AI to Human/)
  assert.match(detail.jobDescription, /3\+ years of related overall technology experience/)
  assert.doesNotMatch(detail.jobDescription, /Apply First Name/)
})

test('Okta run validates the first-party landing page before extracting India roles from the official listing page', async () => {
  const okta = await loadOktaModule()
  const requestedUrls = []
  const scraper = okta.createOktaScraper({
    maxJobs: 2,
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === okta.CAREERS_URL) return CAREERS_HTML
      if (url === okta.PUBLIC_BOARD_URL) return JOB_LISTING_HTML
      if (url === 'https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/') {
        return JOB_DETAIL_HTML
      }
      if (url.startsWith('https://www.okta.com/company/careers/')) {
        return '<html><body><article><h1>Placeholder</h1></article></body></html>'
      }
      throw new Error(`Unexpected Okta fixture URL: ${url}`)
    },
  })

  assert.equal(requestedUrls[0], okta.CAREERS_URL)
  assert.equal(requestedUrls[1], okta.PUBLIC_BOARD_URL)
  assert.equal(
    requestedUrls.includes('https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/'),
    true,
  )
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'okta')
  assert.equal(
    jobs[0].link,
    'https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/',
  )
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[0].experienceRequired, '3+ years')
  assert.equal(jobs[0].publicExperienceChecked, true)
})

test('Okta fails closed when either the careers landing page or the first-party listing page drifts', async () => {
  const okta = await loadOktaModule()

  await assert.rejects(
    okta.createOktaScraper().run({
      fetchText: async (url) => {
        if (url === okta.CAREERS_URL) {
          return CAREERS_HTML.replace('Open positions', 'Browse jobs')
        }
        if (url === okta.PUBLIC_BOARD_URL) return JOB_LISTING_HTML
        throw new Error(`Unexpected Okta fixture URL: ${url}`)
      },
    }),
    /careers landing page/i,
  )

  await assert.rejects(
    okta.createOktaScraper().run({
      fetchText: async (url) => {
        if (url === okta.CAREERS_URL) return CAREERS_HTML
        if (url === okta.PUBLIC_BOARD_URL) return DRIFTED_LISTING_HTML
        throw new Error(`Unexpected Okta fixture URL: ${url}`)
      },
    }),
    /job listing page|india jobs surface/i,
  )
})
