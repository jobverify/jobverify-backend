import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Redington</title>
    <link rel="canonical" href="https://redingtongroup.com/careers/" />
  </head>
  <body>
    <main>
      <h2>Opportunities Across the Globe</h2>
      <h3>Search Jobs</h3>
      <div>Select Country</div>
      <div>Select City</div>
      <section class="jobappliesform">
        <h3>Join our Community</h3>
        <p>Upload Resume (PDF/DOC/DOCX, Max 5MB)</p>
      </section>
    </main>
    <script>
      var job_nonce = "735146d725";
      let offset = 0;
      jQuery.ajax({
        url: "/wp-admin/admin-ajax.php",
        type: "POST",
        data: { action: "get_countries", nonce: job_nonce }
      });
      jQuery.ajax({
        url: "/wp-admin/admin-ajax.php",
        type: "POST",
        data: { action: "get_skills", nonce: job_nonce }
      });
      function loadJobs(reset = false) {
        jQuery.ajax({
          url: "/wp-admin/admin-ajax.php",
          type: "POST",
          data: {
            action: "get_jobs",
            offset: offset,
            search: "",
            job_type: "",
            country: "",
            city: "",
            role: "",
            skill: "",
            nonce: job_nonce
          },
          success: function (res) {
            let jobs = JSON.parse(res);
            if (jobs.length > 0) {
              jobs.forEach(job => {
                let locationHTML = job.location_city
                  ? \`<div>\${job.location_city}</div>\`
                  : "";
                locationHTML;
              });
              offset += jobs.length;
            }
          }
        });
      }
    </script>
    <a target="_blank" href="https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/\${job.job_id}?from=all">
      Full Job Description
    </a>
  </body>
</html>
`

const FIRST_BATCH = [
  {
    id: '1',
    job_id: 'a69734cb0b01d6',
    job_code: '',
    group_company: 'Redington Limited',
    department: 'Sales',
    parent_department: 'Sales',
    location: 'Bangalore Sales Office, Karnataka, India (10000269)',
    location_city: '',
    location_country: 'India',
    title: 'Area Sales Manager',
    employee_type: 'Full Time',
    job_created_timestamp: '23-01-2026 15:55:52',
    job_updated_timestamp: '07-07-2026 12:17:45',
    post_on_carrers_page: '1',
  },
  {
    id: '2',
    job_id: 'a6a3e77816c63c',
    job_code: '',
    group_company: 'Redington Limited',
    department: 'Sales',
    parent_department: 'Sales',
    location: 'Gurgaon Non-IT Sales Off-Apple, Delhi, India (10000337)',
    location_city: '',
    location_country: 'India',
    title: 'Sales Analyst',
    employee_type: 'Full Time',
    job_created_timestamp: '26-06-2026 18:28:41',
    job_updated_timestamp: '07-07-2026 12:17:45',
    post_on_carrers_page: '1',
  },
]

const SECOND_BATCH = [
  {
    id: '3',
    job_id: 'a6a4bb0619d81f',
    job_code: '',
    group_company: 'Redington Limited',
    department: 'Sales',
    parent_department: 'Sales',
    location: 'Bangalore Sales Office, Karnataka, India (10000269)',
    location_city: '',
    location_country: 'India',
    title: 'Territory Sales Manager',
    employee_type: 'Full Time',
    job_created_timestamp: '27-06-2026 11:10:00',
    job_updated_timestamp: '07-07-2026 18:31:00',
    post_on_carrers_page: '1',
  },
]

const loadModule = async () => {
  try {
    return await import('../redingtonindia/script.js')
  } catch {
    assert.fail('Expected Redington India scraper module at ../redingtonindia/script.js')
  }
}

test('Redington India pins the verified careers page, nonce extraction, and jobs endpoint constants', async () => {
  const redingtonIndia = await loadModule()

  assert.equal(redingtonIndia.SOURCE, 'redingtonindia')
  assert.equal(redingtonIndia.COMPANY, 'Redington India')
  assert.equal(redingtonIndia.OFFICIAL_BRAND_NAME, 'Redington')
  assert.equal(redingtonIndia.VERIFIED_ON, '2026-07-17')
  assert.equal(redingtonIndia.CAREERS_PAGE_URL, 'https://redingtongroup.com/careers/')
  assert.equal(
    redingtonIndia.JOBS_API_URL,
    'https://redingtongroup.com/wp-admin/admin-ajax.php',
  )
  assert.equal(
    redingtonIndia.buildDarwinboxJobDetailUrl('a69734cb0b01d6'),
    'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69734cb0b01d6?from=all',
  )
  assert.equal(redingtonIndia.hasOfficialCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(redingtonIndia.extractJobNonce(OFFICIAL_CAREERS_HTML), '735146d725')
})

test('Redington India extracts public jobs from the verified admin-ajax payload and keeps only India roles', async () => {
  const redingtonIndia = await loadModule()
  const jobs = redingtonIndia.extractIndiaJobsFromAjaxPayload(
    JSON.stringify([...FIRST_BATCH, ...SECOND_BATCH]),
    { scrapedAt: FIXED_SCRAPED_AT },
  )

  assert.deepEqual(jobs, [
    {
      title: 'Area Sales Manager',
      company: 'Redington India',
      department: 'Sales',
      location: 'Bangalore Sales Office, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      jobId: 'a69734cb0b01d6',
      requisitionId: 'a69734cb0b01d6',
      sourceUrl:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69734cb0b01d6?from=all',
      applyUrl:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69734cb0b01d6?from=all',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-01-23',
      closingDate: null,
      jobDescription: null,
      groupCompany: 'Redington Limited',
      remoteStatus: 'On-site',
      source: 'redingtonindia',
      link:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69734cb0b01d6?from=all',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Sales Analyst',
      company: 'Redington India',
      department: 'Sales',
      location: 'Gurgaon Non-IT Sales Off-Apple, Delhi, India',
      city: 'Gurgaon',
      country: 'India',
      jobId: 'a6a3e77816c63c',
      requisitionId: 'a6a3e77816c63c',
      sourceUrl:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3e77816c63c?from=all',
      applyUrl:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3e77816c63c?from=all',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-26',
      closingDate: null,
      jobDescription: null,
      groupCompany: 'Redington Limited',
      remoteStatus: 'On-site',
      source: 'redingtonindia',
      link:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3e77816c63c?from=all',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Territory Sales Manager',
      company: 'Redington India',
      department: 'Sales',
      location: 'Bangalore Sales Office, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      jobId: 'a6a4bb0619d81f',
      requisitionId: 'a6a4bb0619d81f',
      sourceUrl:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a4bb0619d81f?from=all',
      applyUrl:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a4bb0619d81f?from=all',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-27',
      closingDate: null,
      jobDescription: null,
      groupCompany: 'Redington Limited',
      remoteStatus: 'On-site',
      source: 'redingtonindia',
      link:
        'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a4bb0619d81f?from=all',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Redington India run verifies the first-party careers shell and paginates the admin-ajax jobs endpoint until empty', async () => {
  const redingtonIndia = await loadModule()
  const requests = []

  const jobs = await redingtonIndia.createRedingtonIndiaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requests.push({ type: 'text', url })
      return OFFICIAL_CAREERS_HTML
    },
    postForm: async (url, body) => {
      requests.push({ type: 'post', url, body })

      if (Number(body.offset) === 0) return JSON.stringify(FIRST_BATCH)
      if (Number(body.offset) === 2) return JSON.stringify(SECOND_BATCH)
      if (Number(body.offset) === 3) return JSON.stringify([])

      throw new Error(`Unexpected offset ${body.offset}`)
    },
  })

  assert.deepEqual(requests, [
    { type: 'text', url: redingtonIndia.CAREERS_PAGE_URL },
    {
      type: 'post',
      url: redingtonIndia.JOBS_API_URL,
      body: {
        action: 'get_jobs',
        offset: '0',
        search: '',
        job_type: '',
        country: '',
        city: '',
        role: '',
        skill: '',
        nonce: '735146d725',
      },
    },
    {
      type: 'post',
      url: redingtonIndia.JOBS_API_URL,
      body: {
        action: 'get_jobs',
        offset: '2',
        search: '',
        job_type: '',
        country: '',
        city: '',
        role: '',
        skill: '',
        nonce: '735146d725',
      },
    },
    {
      type: 'post',
      url: redingtonIndia.JOBS_API_URL,
      body: {
        action: 'get_jobs',
        offset: '3',
        search: '',
        job_type: '',
        country: '',
        city: '',
        role: '',
        skill: '',
        nonce: '735146d725',
      },
    },
  ])

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Area Sales Manager')
  assert.equal(jobs[1].city, 'Gurgaon')
  assert.equal(jobs[2].title, 'Territory Sales Manager')
})

test('Redington India fails closed when the verified careers page or jobs payload drifts materially', async () => {
  const redingtonIndia = await loadModule()

  await assert.rejects(
    redingtonIndia.createRedingtonIndiaScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
      postForm: async () => JSON.stringify([]),
    }),
    /verified redington careers page/i,
  )

  await assert.rejects(
    redingtonIndia.createRedingtonIndiaScraper().run({
      fetchText: async () => OFFICIAL_CAREERS_HTML,
      postForm: async () => '{"broken":true}',
    }),
    /verified redington jobs payload/i,
  )
})
