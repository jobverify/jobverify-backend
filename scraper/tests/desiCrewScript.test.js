import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const homepagePage = {
  status: 200,
  url: 'https://desicrew.in/',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <title>Home - DesiCrew</title>
        <link rel="canonical" href="https://desicrew.in/" />
      </head>
      <body>
        <h2>Driving greater outcomes</h2>
        <p>#GoBeyond and go global</p>
        <p>Trusted by Fortune-500 companies</p>
        <a href="https://desicrew.in/about-us/careers/">Join Us</a>
      </body>
    </html>
  `,
}

const careersPage = {
  status: 200,
  url: 'https://desicrew.in/about-us/careers/',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <title>Careers - DesiCrew</title>
        <link rel="canonical" href="https://desicrew.in/about-us/careers/" />
      </head>
      <body>
        <h2>Together, we’re a force for good</h2>
        <a href="https://desicrew.in/open-job-positions/">Open Positions</a>
        <h3>See our open roles</h3>
        <a href="https://desicrew.in/open-job-positions/">See All Open Positions</a>
        <a href="https://desicrew.in/open-job-positions/">Drop Your Resume</a>
      </body>
    </html>
  `,
}

const jobsArchivePage = {
  status: 200,
  url: 'https://desicrew.in/open-job-positions/',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <title>Open Job Positions - DesiCrew</title>
        <link rel="canonical" href="https://desicrew.in/open-job-positions/" />
        <link rel="alternate" type="application/rss+xml" title="DesiCrew » Open Job Positions Feed" href="https://desicrew.in/open-job-positions/?feed=rss2" />
      </head>
      <body>
        <h2>Open Job Positions</h2>
        <article class="post-2256 open-job-position type-open-job-position status-publish hentry dce-post dce-post-item dce-item-grid" data-dce-post-id="2256" data-dce-post-index="0" data-post-link="https://desicrew.in/open-job-position/qa-delivery-manager/">
          <div class="dce-post-block elementor-animation-grow">
            <div class="dce-item dce-item_title"><h3 class="dce-post-title"><a href="https://desicrew.in/open-job-position/qa-delivery-manager/">QA Delivery Manager</a></h3></div>
            <div class="dce-item dce-item_date"><div class="dce-post-date">29/01/25</div></div>
            <div class="dce-item dce-item_custommeta"><div class="dce-post-custommeta"><div class="dce-meta-item"><div>Kaup, Kollumangudi, and TN Palayam Centers</div></div></div></div>
          </div>
        </article>
        <article class="post-2234 open-job-position type-open-job-position status-publish hentry dce-post dce-post-item dce-item-grid" data-dce-post-id="2234" data-dce-post-index="1" data-post-link="https://desicrew.in/open-job-position/avp-sales-qaoncloud/">
          <div class="dce-post-block elementor-animation-grow">
            <div class="dce-item dce-item_title"><h3 class="dce-post-title"><a href="https://desicrew.in/open-job-position/avp-sales-qaoncloud/">AVP – Sales (QAonCloud)</a></h3></div>
            <div class="dce-item dce-item_date"><div class="dce-post-date">29/01/25</div></div>
            <div class="dce-item dce-item_custommeta"><div class="dce-post-custommeta dce-post-custommeta"><div class="dce-meta-item"><div>Preferably Bangalore or remote&nbsp;</div></div></div></div>
          </div>
        </article>
        <article class="post-2226 open-job-position type-open-job-position status-publish hentry dce-post dce-post-item dce-item-grid" data-dce-post-id="2226" data-dce-post-index="2" data-post-link="https://desicrew.in/open-job-position/chief-compliance-officer/">
          <div class="dce-post-block elementor-animation-grow">
            <div class="dce-item dce-item_title"><h3 class="dce-post-title"><a href="https://desicrew.in/open-job-position/chief-compliance-officer/">Chief Compliance Officer&nbsp;</a></h3></div>
            <div class="dce-item dce-item_date"><div class="dce-post-date">29/01/25</div></div>
            <div class="dce-item dce-item_custommeta"><div class="dce-post-custommeta"><div class="dce-meta-item"><div>Bangalore/ Chennai/ Delhi</div></div></div></div>
          </div>
        </article>
        <h2>Drop your resume</h2>
      </body>
    </html>
  `,
}

const jobsApiPayload = [
  {
    id: 2256,
    date: '2025-01-29T15:08:52',
    modified: '2025-01-29T17:54:33',
    slug: 'qa-delivery-manager',
    status: 'publish',
    type: 'open-job-position',
    link: 'https://desicrew.in/open-job-position/qa-delivery-manager/',
    title: { rendered: 'QA Delivery Manager' },
    content: {
      rendered: `
        <p><strong>Number of Positions:</strong> 1<br><strong>Mode of Work:</strong> WFO / Hybrid<br><strong>Experience:</strong> 10 to 12 years<br><strong>CTC:</strong> ₹12 to ₹15 LPA</p>
        <h2><strong>Job Description:</strong></h2>
        <p>We are seeking a skilled QA Delivery Manager with 10 to 12 years of experience in both manual and automated testing to lead and enhance our quality assurance processes.</p>
        <h2><strong>Key Responsibilities:</strong></h2>
        <ul>
          <li>Oversee and manage end-to-end QA processes for manual and automated testing.</li>
          <li>Develop and execute test strategies, test plans, and roadmaps for QA functions and features.</li>
        </ul>
        <h2><strong>Required Skills &amp; Qualifications:</strong></h2>
        <ul>
          <li>Bachelor’s degree in Computer Science or a related field.</li>
          <li>Expertise in test automation tools such as Selenium, Cypress, Appium, Postman, etc.</li>
        </ul>
      `,
      protected: false,
    },
  },
  {
    id: 2234,
    date: '2025-01-29T15:07:39',
    modified: '2025-01-29T17:52:58',
    slug: 'avp-sales-qaoncloud',
    status: 'publish',
    type: 'open-job-position',
    link: 'https://desicrew.in/open-job-position/avp-sales-qaoncloud/',
    title: { rendered: 'AVP – Sales (QAonCloud)' },
    content: {
      rendered: `
        <p><strong>Job Type:</strong> Permanent, Full-time. Involves working and taking meetings in customer local times.</p>
        <h2><strong>Job description</strong></h2>
        <p>We are seeking an experienced and dynamic AVP -Sales (Sales Head) to lead sales and drive business growth.</p>
        <h2><strong>Key Responsibilities:</strong></h2>
        <ul>
          <li>Own and execute the sales target for the business unit</li>
          <li>Lead and mentor the sales team to achieve and exceed sales targets.</li>
        </ul>
        <h2>Education and Experience:</h2>
        <ul>
          <li>Minimum Graduate however MBA is a plus.</li>
          <li>Minimum of 10 years of experience in sales leadership roles in Indian or US/European Markets</li>
        </ul>
        <h2>Job Types:</h2>
        <p>Full-time, Permanent</p>
      `,
      protected: false,
    },
  },
  {
    id: 2226,
    date: '2025-01-29T13:34:50',
    modified: '2025-01-29T17:53:37',
    slug: 'chief-compliance-officer',
    status: 'publish',
    type: 'open-job-position',
    link: 'https://desicrew.in/open-job-position/chief-compliance-officer/',
    title: { rendered: 'Chief Compliance Officer&nbsp;' },
    content: {
      rendered: `
        <p><strong>Position:</strong> Chief Compliance Officer (CCO)</p>
        <p><strong>Experience:</strong> 10+ years of experience in compliance, data privacy, or a related field</p>
        <p><strong>Industry:</strong> IT Services/Data Management/Outsourcing</p>
        <h2>About DesiCrew</h2>
        <p>DesiCrew is a pioneer in delivering IT-enabled solutions to global clients.</p>
        <h2>Key Responsibilities</h2>
        <ol>
          <li>Policy Development &amp; Implementation</li>
          <li>Audits &amp; Risk Assessments</li>
        </ol>
        <h2>Required Skills &amp; Qualifications</h2>
        <ol>
          <li>Bachelor's degree in law, compliance, IT, or a related field.</li>
          <li>Strong understanding of data protection regulations, including DPDP Act 2023, GDPR, HIPAA.</li>
        </ol>
      `,
      protected: false,
    },
  },
]

const detailPages = {
  'https://desicrew.in/open-job-position/qa-delivery-manager/': {
    status: 200,
    url: 'https://desicrew.in/open-job-position/qa-delivery-manager/',
    html: `
      <!doctype html>
      <html lang="en-US">
        <head>
          <title>QA Delivery Manager - DesiCrew</title>
          <link rel="canonical" href="https://desicrew.in/open-job-position/qa-delivery-manager/" />
        </head>
        <body>
          <h4><b>Location:</b> Kaup, Kollumangudi, and TN Palayam Centers</h4>
          <a href="#job-application-form">Apply Now</a>
          <label>I acknowledge that I have read and agree the Terms and Conditions and Privacy Policy.</label>
        </body>
      </html>
    `,
  },
  'https://desicrew.in/open-job-position/avp-sales-qaoncloud/': {
    status: 200,
    url: 'https://desicrew.in/open-job-position/avp-sales-qaoncloud/',
    html: `
      <!doctype html>
      <html lang="en-US">
        <head>
          <title>AVP – Sales (QAonCloud) - DesiCrew</title>
          <link rel="canonical" href="https://desicrew.in/open-job-position/avp-sales-qaoncloud/" />
        </head>
        <body>
          <h4><b>Location:</b> Preferably Bangalore or remote</h4>
          <a href="#job-application-form">Apply Now</a>
          <label>I acknowledge that I have read and agree the Terms and Conditions and Privacy Policy.</label>
        </body>
      </html>
    `,
  },
  'https://desicrew.in/open-job-position/chief-compliance-officer/': {
    status: 200,
    url: 'https://desicrew.in/open-job-position/chief-compliance-officer/',
    html: `
      <!doctype html>
      <html lang="en-US">
        <head>
          <title>Chief Compliance Officer - DesiCrew</title>
          <link rel="canonical" href="https://desicrew.in/open-job-position/chief-compliance-officer/" />
        </head>
        <body>
          <h4><b>Location:</b> Bangalore/ Chennai/ Delhi</h4>
          <a href="#job-application-form">Apply Now</a>
          <label>I acknowledge that I have read and agree the Terms and Conditions and Privacy Policy.</label>
        </body>
      </html>
    `,
  },
}

const loadModule = async () => {
  try {
    return await import('../desicrew/script.js')
  } catch {
    assert.fail('Expected Desi Crew scraper module at ../desicrew/script.js')
  }
}

test('Desi Crew constants and extractors stay pinned to the verified first-party archive, REST feed, and detail pages', async () => {
  const desiCrew = await loadModule()

  assert.equal(desiCrew.COMPANY_NAME, 'Desi Crew')
  assert.equal(desiCrew.SOURCE, 'desicrew')
  assert.equal(desiCrew.COUNTRY_FILTER, 'India')
  assert.equal(desiCrew.HOMEPAGE_URL, 'https://desicrew.in/')
  assert.equal(desiCrew.CAREERS_PAGE_URL, 'https://desicrew.in/about-us/careers/')
  assert.equal(desiCrew.JOBS_ARCHIVE_URL, 'https://desicrew.in/open-job-positions/')
  assert.equal(
    desiCrew.JOBS_API_URL,
    'https://desicrew.in/wp-json/wp/v2/open-job-position?per_page=100&_fields=id,date,modified,status,link,title,slug,content,type',
  )
  assert.equal(desiCrew.SAMPLE_JOB_URL, 'https://desicrew.in/open-job-position/qa-delivery-manager/')
  assert.equal(desiCrew.VERIFIED_ON, '2026-07-15')
  assert.equal(desiCrew.hasOfficialHomepageSignal(homepagePage), true)
  assert.equal(desiCrew.hasOfficialCareersPageSignal(careersPage), true)
  assert.equal(desiCrew.hasOfficialJobsArchiveSignal(jobsArchivePage), true)
  assert.equal(desiCrew.hasOfficialJobsApiSignal(jobsApiPayload), true)
  assert.equal(
    desiCrew.hasOfficialJobDetailSignal(
      detailPages['https://desicrew.in/open-job-position/qa-delivery-manager/'],
      'https://desicrew.in/open-job-position/qa-delivery-manager/',
    ),
    true,
  )

  const listings = desiCrew.extractArchiveListings(jobsArchivePage.html)
  assert.deepEqual(listings, [
    {
      jobId: '2256',
      title: 'QA Delivery Manager',
      sourceUrl: 'https://desicrew.in/open-job-position/qa-delivery-manager/',
      location: 'Kaup, Kollumangudi, and TN Palayam Centers',
      postingDate: '2025-01-29',
    },
    {
      jobId: '2234',
      title: 'AVP - Sales (QAonCloud)',
      sourceUrl: 'https://desicrew.in/open-job-position/avp-sales-qaoncloud/',
      location: 'Preferably Bangalore or remote',
      postingDate: '2025-01-29',
    },
    {
      jobId: '2226',
      title: 'Chief Compliance Officer',
      sourceUrl: 'https://desicrew.in/open-job-position/chief-compliance-officer/',
      location: 'Bangalore/ Chennai/ Delhi',
      postingDate: '2025-01-29',
    },
  ])

  const firstJob = desiCrew.buildJobFromListingAndApiRecord(listings[0], jobsApiPayload[0])
  assert.deepEqual(
    {
      title: firstJob.title,
      company: firstJob.company,
      location: firstJob.location,
      city: firstJob.city,
      state: firstJob.state,
      country: firstJob.country,
      jobId: firstJob.jobId,
      requisitionId: firstJob.requisitionId,
      sourceUrl: firstJob.sourceUrl,
      applyUrl: firstJob.applyUrl,
      employmentType: firstJob.employmentType,
      experienceRequired: firstJob.experienceRequired,
      postingDate: firstJob.postingDate,
      closingDate: firstJob.closingDate,
    },
    {
      title: 'QA Delivery Manager',
      company: 'Desi Crew',
      location: 'Kaup, Kollumangudi, and TN Palayam Centers',
      city: null,
      state: null,
      country: 'India',
      jobId: '2256',
      requisitionId: '2256',
      sourceUrl: 'https://desicrew.in/open-job-position/qa-delivery-manager/',
      applyUrl: 'https://desicrew.in/open-job-position/qa-delivery-manager/',
      employmentType: null,
      experienceRequired: '10 to 12 years',
      postingDate: '2025-01-29',
      closingDate: null,
    },
  )
  assert.ok(
    firstJob.requiredSkills.includes('Oversee and manage end-to-end QA processes for manual and automated testing.'),
  )
  assert.match(firstJob.jobDescription, /We are seeking a skilled QA Delivery Manager/i)

  const secondJob = desiCrew.buildJobFromListingAndApiRecord(listings[1], jobsApiPayload[1])
  assert.equal(secondJob.employmentType, 'Full-time')
  assert.equal(secondJob.experienceRequired, '10 years')

  const thirdJob = desiCrew.buildJobFromListingAndApiRecord(listings[2], jobsApiPayload[2])
  assert.equal(thirdJob.experienceRequired, '10+ years')
})

test('run validates the verified Desi Crew surfaces and returns the current live first-party openings', async () => {
  const desiCrew = await loadModule()
  const requestedUrls = []

  const jobs = await desiCrew.createDesiCrewScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === desiCrew.HOMEPAGE_URL) return homepagePage
      if (url === desiCrew.CAREERS_PAGE_URL) return careersPage
      if (url === desiCrew.JOBS_ARCHIVE_URL) return jobsArchivePage
      if (detailPages[url]) return detailPages[url]

      throw new Error(`Unexpected Desi Crew page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (url === desiCrew.JOBS_API_URL) return jobsApiPayload

      throw new Error(`Unexpected Desi Crew API URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    desiCrew.HOMEPAGE_URL,
    desiCrew.CAREERS_PAGE_URL,
    desiCrew.JOBS_ARCHIVE_URL,
    desiCrew.JOBS_API_URL,
    'https://desicrew.in/open-job-position/qa-delivery-manager/',
    'https://desicrew.in/open-job-position/avp-sales-qaoncloud/',
    'https://desicrew.in/open-job-position/chief-compliance-officer/',
  ])

  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      jobId: job.jobId,
      location: job.location,
      postingDate: job.postingDate,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'QA Delivery Manager',
        jobId: '2256',
        location: 'Kaup, Kollumangudi, and TN Palayam Centers',
        postingDate: '2025-01-29',
        source: 'desicrew',
        link: 'https://desicrew.in/open-job-position/qa-delivery-manager/',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'AVP - Sales (QAonCloud)',
        jobId: '2234',
        location: 'Preferably Bangalore or remote',
        postingDate: '2025-01-29',
        source: 'desicrew',
        link: 'https://desicrew.in/open-job-position/avp-sales-qaoncloud/',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Chief Compliance Officer',
        jobId: '2226',
        location: 'Bangalore/ Chennai/ Delhi',
        postingDate: '2025-01-29',
        source: 'desicrew',
        link: 'https://desicrew.in/open-job-position/chief-compliance-officer/',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )

  assert.equal(jobs[1].employmentType, 'Full-time')
  assert.equal(jobs[2].experienceRequired, '10+ years')
})

test('Desi Crew scraper fails closed when the verified public-surface checkpoints drift', async () => {
  const desiCrew = await loadModule()

  await assert.rejects(
    desiCrew.createDesiCrewScraper().run({
      fetchPage: async (url) => {
        if (url === desiCrew.HOMEPAGE_URL) {
          return {
            ...homepagePage,
            html: homepagePage.html.replace('Join Us', 'Contact Us'),
          }
        }

        throw new Error(`Unexpected Desi Crew page URL: ${url}`)
      },
      fetchJson: async () => jobsApiPayload,
    }),
    /verified homepage/i,
  )

  await assert.rejects(
    desiCrew.createDesiCrewScraper().run({
      fetchPage: async (url) => {
        if (url === desiCrew.HOMEPAGE_URL) return homepagePage
        if (url === desiCrew.CAREERS_PAGE_URL) {
          return {
            ...careersPage,
            html: careersPage.html.replace('See our open roles', 'Join the journey'),
          }
        }

        throw new Error(`Unexpected Desi Crew page URL: ${url}`)
      },
      fetchJson: async () => jobsApiPayload,
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    desiCrew.createDesiCrewScraper().run({
      fetchPage: async (url) => {
        if (url === desiCrew.HOMEPAGE_URL) return homepagePage
        if (url === desiCrew.CAREERS_PAGE_URL) return careersPage
        if (url === desiCrew.JOBS_ARCHIVE_URL) {
          return {
            ...jobsArchivePage,
            html: '<html><title>Open Job Positions - DesiCrew</title><body>No archive cards</body></html>',
          }
        }

        throw new Error(`Unexpected Desi Crew page URL: ${url}`)
      },
      fetchJson: async () => jobsApiPayload,
    }),
    /verified open job archive/i,
  )

  await assert.rejects(
    desiCrew.createDesiCrewScraper().run({
      fetchPage: async (url) => {
        if (url === desiCrew.HOMEPAGE_URL) return homepagePage
        if (url === desiCrew.CAREERS_PAGE_URL) return careersPage
        if (url === desiCrew.JOBS_ARCHIVE_URL) return jobsArchivePage
        if (detailPages[url]) return detailPages[url]

        throw new Error(`Unexpected Desi Crew page URL: ${url}`)
      },
      fetchJson: async () => [{ ...jobsApiPayload[0], type: 'post' }],
    }),
    /verified open job api/i,
  )

  await assert.rejects(
    desiCrew.createDesiCrewScraper().run({
      fetchPage: async (url) => {
        if (url === desiCrew.HOMEPAGE_URL) return homepagePage
        if (url === desiCrew.CAREERS_PAGE_URL) return careersPage
        if (url === desiCrew.JOBS_ARCHIVE_URL) return jobsArchivePage
        if (url === 'https://desicrew.in/open-job-position/qa-delivery-manager/') {
          return {
            ...detailPages[url],
            html: detailPages[url].html.replace('Apply Now', 'Learn More'),
          }
        }
        if (detailPages[url]) return detailPages[url]

        throw new Error(`Unexpected Desi Crew page URL: ${url}`)
      },
      fetchJson: async () => jobsApiPayload,
    }),
    /verified detail page/i,
  )
})
