import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html>
  <head>
    <title>Home - Aravind Eye Care System Aravind Eye Care System</title>
    <link rel="canonical" href="https://aravind.org/" />
  </head>
  <body>
    <a href="https://aravind.org/aop-recruitment/">AOP Recruitment</a>
    <a href="https://aravind.org/careers/">Careers</a>
    <p>Providing compassionate and quality eye care affordable to all</p>
    <p>© 2026 Aravind Eye Care System | All rights reserved</p>
  </body>
</html>
`

const careersPageHtml = `
<!doctype html>
<html>
  <head>
    <title>Careers - Aravind Eye Care System</title>
    <link rel="canonical" href="https://aravind.org/careers/" />
  </head>
  <body>
    <h5>You don't just find people, you have to build them - Dr. G. Venkataswamy</h5>
    <p>At Aravind, everyone plays a critical role in ensuring the success of our mission.</p>
    <p>You will, too.</p>
    <a href="https://forms.zohopublic.com/marketing101/form/RecruitmentTirupati/formperma/Ui6U-0r2DobF7nj5oJeYB-HtWsAkCFYZOIKwdLx24zY">Click here to apply for any other post</a>
    <a href="https://aravind.org/fellowships/">Click here to apply for fellowship</a>
    <h3>Current Openings</h3>
    <div
      class="job_listings"
      data-location=""
      data-keywords=""
      data-show_filters="true"
      data-show_pagination="false"
      data-per_page="10"
      data-orderby="featured"
      data-order="DESC"
      data-categories=""
      data-post_id="1989"
    >
      <form class="job_filters">
        <div class="search_jobs">
          <label for="search_keywords">Keywords</label>
          <input type="text" name="search_keywords" id="search_keywords" />
          <label for="search_location">Location</label>
          <input type="text" name="search_location" id="search_location" />
          <label for="remote_position">Remote positions only</label>
          <label for="search_categories">Category</label>
          <select name="search_categories[]" id="search_categories">
            <option value="294">AuroiTech-Madurai</option>
            <option value="206">Aravind-Coimbatore</option>
            <option value="207">Aravind-Tirupur</option>
          </select>
          <input type="submit" value="Search Jobs" />
        </div>
        <ul class="job_types">
          <li><label class="part-time">Part Time</label></li>
          <li><label class="internship">Internship</label></li>
          <li><label class="full-time">Full Time</label></li>
        </ul>
      </form>
      <noscript>Your browser does not support JavaScript, or it is disabled. JavaScript must be enabled in order to view listings.</noscript>
      <ul class="job_listings"></ul>
      <a class="load_more_jobs" href="#"><strong>Load more listings</strong></a>
    </div>
    <script>
      var job_manager_ajax_filters = {"ajax_url":"\\/jm-ajax\\/%%endpoint%%\\/","i18n_load_prev_listings":"Load previous listings"};
    </script>
    <script src="https://aravind.org/wp-content/plugins/wp-job-manager/assets/dist/js/ajax-filters.js"></script>
  </body>
</html>
`

const pageSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://aravind.org/</loc></url>
  <url><loc>https://aravind.org/post-jobs/</loc></url>
  <url><loc>https://aravind.org/careers/</loc></url>
  <url><loc>https://aravind.org/aop-recruitment/</loc></url>
</urlset>
`

const ajaxPayload = {
  found_jobs: true,
  max_num_pages: 1,
  html: `
    <li class="post-20911 job_listing type-job_listing status-publish has-post-thumbnail hentry job-type-full-time">
      <a href="https://aravind.org/job/driver/">
        <div class="position">
          <h3>Driver</h3>
          <div class="company"><strong>Aravind Eye Hospital, Coimbatore</strong></div>
        </div>
        <div class="location">Coimbatore</div>
        <ul class="meta">
          <li class="job-type full-time">Full Time</li>
          <li class="date"><time datetime="2026-06-30">Posted 2 weeks ago</time></li>
        </ul>
      </a>
    </li>
    <li class="post-20909 job_listing type-job_listing status-publish has-post-thumbnail hentry job-type-full-time">
      <a href="https://aravind.org/job/ac-mechanic/">
        <div class="position">
          <h3>AC Mechanic</h3>
          <div class="company"><strong>Aravind Eye Hospital, Coimbatore</strong></div>
        </div>
        <div class="location">Coimbatore</div>
        <ul class="meta">
          <li class="job-type full-time">Full Time</li>
          <li class="date"><time datetime="2026-06-30">Posted 2 weeks ago</time></li>
        </ul>
      </a>
    </li>
    <li class="post-20600 job_listing type-job_listing status-publish has-post-thumbnail hentry job-type-full-time">
      <a href="https://aravind.org/job/data-engineering-jd/">
        <div class="position">
          <h3>Data Engineering JD</h3>
          <div class="company"><strong>AuroiTech Digital Solutions</strong></div>
        </div>
        <div class="location">Madurai</div>
        <ul class="meta">
          <li class="job-type full-time">Full Time</li>
          <li class="date"><time datetime="2026-05-05">Posted 2 months ago</time></li>
        </ul>
      </a>
    </li>
  `,
}

const sampleRestPayload = [
  {
    id: 20911,
    date: '2026-06-30T10:34:56',
    slug: 'driver',
    status: 'publish',
    type: 'job_listing',
    link: 'https://aravind.org/job/driver/',
    title: { rendered: 'Driver' },
    content: {
      rendered: `
        <h4><strong>Job Responsibilities:</strong></h4>
        <ul>
          <li>Drive company vehicles safely and responsibly.</li>
        </ul>
        <h4><strong>Skills Required:</strong></h4>
        <ul>
          <li>Valid driving license for the required vehicle category.</li>
          <li>Good knowledge of local routes and traffic regulations.</li>
        </ul>
        <h4><strong>Experience:</strong></h4>
        <ul>
          <li>Minimum 5-10 years of relevant experience</li>
        </ul>
      `,
    },
    meta: {
      _job_location: 'Coimbatore',
      _application: 'cbe.hrcoordinator@aravind.org',
      _company_name: 'Aravind Eye Hospital, Coimbatore',
    },
  },
  {
    id: 20909,
    date: '2026-06-30T10:32:15',
    slug: 'ac-mechanic',
    status: 'publish',
    type: 'job_listing',
    link: 'https://aravind.org/job/ac-mechanic/',
    title: { rendered: 'AC Mechanic' },
    content: {
      rendered: `
        <strong>No. of Positions: 1</strong>
        <h4><strong>Job Responsibilities:</strong></h4>
        <ul>
          <li>Daily operation of the chiller plant with accessories</li>
        </ul>
        <h4><strong>Qualifications</strong></h4>
        <ul>
          <li>ITI/Diploma</li>
        </ul>
        <h4><strong>Skills Required:</strong></h4>
        <ul>
          <li>Preventive maintenance planning.</li>
          <li>Responsible, disciplined, and punctual</li>
        </ul>
        <p><strong>Experience:</strong></p>
        <ul>
          <li>Minimum 2-5 years of relevant experience</li>
        </ul>
      `,
    },
    meta: {
      _job_location: 'Coimbatore',
      _application: 'cbe.hrcoordinator@aravind.org',
      _company_name: 'Aravind Eye Hospital, Coimbatore',
    },
  },
  {
    id: 20600,
    date: '2026-05-05T11:51:18',
    slug: 'data-engineering-jd',
    status: 'publish',
    type: 'job_listing',
    link: 'https://aravind.org/job/data-engineering-jd/',
    title: { rendered: 'Data Engineering JD' },
    content: {
      rendered: `
        <h3><strong>About the Role</strong></h3>
        <p>We are seeking a skilled <strong>Data Engineer</strong>.</p>
        <h3><strong>Required Skills and Experience</strong></h3>
        <ul>
          <li>4-6 years of core experience in Data engineering.</li>
          <li><strong>Programming:</strong> Strong in <strong>Python</strong> and <strong>SQL</strong>.</li>
          <li><strong>Data Engineering Frameworks:</strong> Apache <strong>Spark</strong>, <strong>Flink</strong>, and <strong>Kafka</strong>.</li>
        </ul>
      `,
    },
    meta: {
      _job_location: 'Madurai',
      _application: 'renold@auroitech.org',
      _company_name: 'AuroiTech Digital Solutions',
    },
  },
]

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/aravindeyecaresystem/script.js')
  } catch {
    assert.fail('Expected Aravind Eye Care System scraper module at ../../scraper/aravindeyecaresystem/script.js')
  }
}

test('Aravind Eye Care System scraper constants stay pinned to the verified first-party careers shell and public feeds', async () => {
  const aravind = await loadScriptModule()

  assert.equal(aravind.SOURCE, 'aravindeyecaresystem')
  assert.equal(aravind.COMPANY, 'Aravind Eye Care System')
  assert.equal(aravind.HOMEPAGE_URL, 'https://aravind.org/')
  assert.equal(aravind.CAREERS_PAGE_URL, 'https://aravind.org/careers/')
  assert.equal(aravind.PAGE_SITEMAP_URL, 'https://aravind.org/page-sitemap.xml')
  assert.equal(aravind.JOB_LISTINGS_AJAX_URL, 'https://aravind.org/jm-ajax/get_listings/')
  assert.equal(aravind.JOB_LISTINGS_API_URL, 'https://aravind.org/wp-json/wp/v2/job-listings')
  assert.deepEqual(aravind.KNOWN_LIVE_JOB_LINKS, [
    'https://aravind.org/job/driver/',
    'https://aravind.org/job/ac-mechanic/',
    'https://aravind.org/job/data-engineering-jd/',
  ])
  assert.equal(aravind.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(aravind.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(aravind.hasExpectedPageSitemapSignal(pageSitemapXml), true)
  assert.deepEqual(aravind.extractSitemapUrls(pageSitemapXml), [
    'https://aravind.org/',
    'https://aravind.org/post-jobs/',
    'https://aravind.org/careers/',
    'https://aravind.org/aop-recruitment/',
  ])
  assert.deepEqual(aravind.extractAjaxListings(ajaxPayload), [
    {
      title: 'Driver',
      company: 'Aravind Eye Hospital, Coimbatore',
      location: 'Coimbatore',
      employmentType: 'Full Time',
      link: 'https://aravind.org/job/driver/',
    },
    {
      title: 'AC Mechanic',
      company: 'Aravind Eye Hospital, Coimbatore',
      location: 'Coimbatore',
      employmentType: 'Full Time',
      link: 'https://aravind.org/job/ac-mechanic/',
    },
    {
      title: 'Data Engineering JD',
      company: 'AuroiTech Digital Solutions',
      location: 'Madurai',
      employmentType: 'Full Time',
      link: 'https://aravind.org/job/data-engineering-jd/',
    },
  ])
  assert.equal(aravind.hasExpectedAjaxListingsSignal(ajaxPayload), true)
  assert.equal(aravind.hasExpectedJobListingsApiSignal(sampleRestPayload), true)
})

test('Aravind Eye Care System maps the verified first-party REST payload into normalized jobs', async () => {
  const aravind = await loadScriptModule()
  const ajaxListingMap = aravind.buildAjaxListingMap(ajaxPayload)
  const jobs = aravind.extractSearchResults(sampleRestPayload, ajaxListingMap)

  assert.deepEqual(jobs, [
    {
      title: 'Driver',
      company: 'Aravind Eye Hospital, Coimbatore',
      department: null,
      location: 'Coimbatore',
      city: 'Coimbatore',
      country: 'India',
      jobId: '20911',
      requisitionId: 'driver',
      sourceUrl: 'https://aravind.org/job/driver/',
      applyUrl: 'https://aravind.org/job/driver/',
      employmentType: 'Full Time',
      experienceRequired: 'Minimum 5-10 years of relevant experience',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Valid driving license for the required vehicle category.',
        'Good knowledge of local routes and traffic regulations.',
      ],
      postingDate: '2026-06-30',
      closingDate: null,
      jobDescription:
        'Job Responsibilities: Drive company vehicles safely and responsibly. Skills Required: Valid driving license for the required vehicle category. Good knowledge of local routes and traffic regulations. Experience: Minimum 5-10 years of relevant experience',
    },
    {
      title: 'AC Mechanic',
      company: 'Aravind Eye Hospital, Coimbatore',
      department: null,
      location: 'Coimbatore',
      city: 'Coimbatore',
      country: 'India',
      jobId: '20909',
      requisitionId: 'ac-mechanic',
      sourceUrl: 'https://aravind.org/job/ac-mechanic/',
      applyUrl: 'https://aravind.org/job/ac-mechanic/',
      employmentType: 'Full Time',
      experienceRequired: 'Minimum 2-5 years of relevant experience',
      minimumQualification: 'ITI/Diploma',
      preferredQualification: null,
      requiredSkills: [
        'Preventive maintenance planning.',
        'Responsible, disciplined, and punctual',
      ],
      postingDate: '2026-06-30',
      closingDate: null,
      jobDescription:
        'No. of Positions: 1 Job Responsibilities: Daily operation of the chiller plant with accessories Qualifications: ITI/Diploma Skills Required: Preventive maintenance planning. Responsible, disciplined, and punctual Experience: Minimum 2-5 years of relevant experience',
    },
    {
      title: 'Data Engineering JD',
      company: 'AuroiTech Digital Solutions',
      department: null,
      location: 'Madurai',
      city: 'Madurai',
      country: 'India',
      jobId: '20600',
      requisitionId: 'data-engineering-jd',
      sourceUrl: 'https://aravind.org/job/data-engineering-jd/',
      applyUrl: 'https://aravind.org/job/data-engineering-jd/',
      employmentType: 'Full Time',
      experienceRequired: '4-6 years of core experience in Data engineering.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Programming: Strong in Python and SQL.',
        'Data Engineering Frameworks: Apache Spark, Flink, and Kafka.',
      ],
      postingDate: '2026-05-05',
      closingDate: null,
      jobDescription:
        'About the Role We are seeking a skilled Data Engineer. Required Skills and Experience 4-6 years of core experience in Data engineering. Programming: Strong in Python and SQL. Data Engineering Frameworks: Apache Spark, Flink, and Kafka.',
    },
  ])
})

test('Aravind Eye Care System run validates the known first-party shell and returns the live jobs feed', async () => {
  const aravind = await loadScriptModule()
  const pageRequests = []
  const jsonRequests = []

  const jobs = await aravind.createAravindEyeCareSystemScraper().run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === aravind.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === aravind.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersPageHtml }
      }

      if (url === aravind.PAGE_SITEMAP_URL) {
        return { status: 200, url, html: pageSitemapXml }
      }

      throw new Error(`Unexpected Aravind page URL: ${url}`)
    },
    fetchJson: async (url) => {
      jsonRequests.push(url)

      if (url === aravind.JOB_LISTINGS_AJAX_URL) {
        return ajaxPayload
      }

      if (url === aravind.JOB_LISTINGS_API_URL) {
        return sampleRestPayload
      }

      throw new Error(`Unexpected Aravind JSON URL: ${url}`)
    },
  })

  assert.deepEqual(pageRequests, [
    aravind.HOMEPAGE_URL,
    aravind.CAREERS_PAGE_URL,
    aravind.PAGE_SITEMAP_URL,
  ])
  assert.deepEqual(jsonRequests, [
    aravind.JOB_LISTINGS_AJAX_URL,
    aravind.JOB_LISTINGS_API_URL,
  ])
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Driver',
    'AC Mechanic',
    'Data Engineering JD',
  ])
  assert.deepEqual(jobs.map((job) => job.source), [
    'aravindeyecaresystem',
    'aravindeyecaresystem',
    'aravindeyecaresystem',
  ])
  assert.equal(jobs[0].link, 'https://aravind.org/job/driver/')
  assert.equal(jobs[1].link, 'https://aravind.org/job/ac-mechanic/')
  assert.equal(jobs[2].link, 'https://aravind.org/job/data-engineering-jd/')
  assert.ok(Date.parse(jobs[0].scrapedAt))
})

test('Aravind Eye Care System fails closed when the verified homepage, careers page, sitemap, or public feeds drift', async () => {
  const aravind = await loadScriptModule()

  await assert.rejects(
    aravind.createAravindEyeCareSystemScraper().run({
      fetchPage: async (url) => {
        if (url === aravind.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Aravind page URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    aravind.createAravindEyeCareSystemScraper().run({
      fetchPage: async (url) => {
        if (url === aravind.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aravind.CAREERS_PAGE_URL) {
          return { status: 200, url, html: '<html><title>Careers - Aravind Eye Care System</title></html>' }
        }

        throw new Error(`Unexpected Aravind page URL: ${url}`)
      },
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    aravind.createAravindEyeCareSystemScraper().run({
      fetchPage: async (url) => {
        if (url === aravind.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aravind.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === aravind.PAGE_SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: '<?xml version="1.0"?><urlset><url><loc>https://aravind.org/</loc></url></urlset>',
          }
        }

        throw new Error(`Unexpected Aravind page URL: ${url}`)
      },
    }),
    /verified page sitemap/i,
  )

  await assert.rejects(
    aravind.createAravindEyeCareSystemScraper().run({
      fetchPage: async (url) => {
        if (url === aravind.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aravind.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === aravind.PAGE_SITEMAP_URL) {
          return { status: 200, url, html: pageSitemapXml }
        }

        throw new Error(`Unexpected Aravind page URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === aravind.JOB_LISTINGS_AJAX_URL) {
          return {
            ...ajaxPayload,
            html: ajaxPayload.html.replace('https://aravind.org/job/data-engineering-jd/', 'https://aravind.org/job/unknown-role/'),
          }
        }

        throw new Error(`Unexpected Aravind JSON URL: ${url}`)
      },
    }),
    /verified public ajax job feed/i,
  )

  await assert.rejects(
    aravind.createAravindEyeCareSystemScraper().run({
      fetchPage: async (url) => {
        if (url === aravind.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aravind.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === aravind.PAGE_SITEMAP_URL) {
          return { status: 200, url, html: pageSitemapXml }
        }

        throw new Error(`Unexpected Aravind page URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === aravind.JOB_LISTINGS_AJAX_URL) {
          return ajaxPayload
        }

        if (url === aravind.JOB_LISTINGS_API_URL) {
          return sampleRestPayload.slice(0, 2)
        }

        throw new Error(`Unexpected Aravind JSON URL: ${url}`)
      },
    }),
    /verified public job feed/i,
  )
})
