import assert from 'node:assert/strict'
import test from 'node:test'

const loadInsureMileModule = async () => import('./script.js')

const careersPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers - Insuremile</title>
    <link rel="canonical" href="https://insuremile.in/careers/" />
    <link rel="stylesheet" href="https://insuremile.in/wp-content/plugins/wp-job-openings/assets/css/general.min.css?ver=3.4.6" />
  </head>
  <body>
    <main>
      <div class="awsm-job-listings awsm-lists"></div>
      <script>
        var awsmJobsPublic = {
          ajaxurl: 'https://insuremile.in/wp-admin/admin-ajax.php'
        };
      </script>
    </main>
  </body>
</html>
`

const listingPayload = [
  {
    id: 9279,
    link: 'https://insuremile.in/career/telesales-executive/',
    title: {
      rendered: 'Telesales Executive',
    },
    content: {
      rendered: `
        <h3>Job Title</h3>
        <p>Telesales Executive</p>
        <p>Remote (Work from Home)</p>
        <ul>
          <li>Promote motor insurance products.</li>
          <li>Meet monthly sales targets.</li>
        </ul>
      `,
      protected: false,
    },
    class_list: [
      'post-9279',
      'awsm_job_openings',
      'type-awsm_job_openings',
      'status-publish',
      'hentry',
      'job-category-sales',
      'job-type-full-time',
      'job-type-part-time',
      'job-location-remote',
      'job-location-work-from-home',
    ],
  },
  {
    id: 9346,
    link: 'https://insuremile.in/career/malayalam-telecaller-jobs-work-from-home/',
    title: {
      rendered: 'Malayalam Telecaller Jobs &#8211; Work from Home',
    },
    content: {
      rendered: `
        <p><strong>Company:</strong> InsureMile</p>
        <p><strong>Location:</strong> Work from Home</p>
        <ul>
          <li>Handle inbound and outbound calls in Malayalam.</li>
        </ul>
      `,
      protected: false,
    },
    class_list: [
      'post-9346',
      'awsm_job_openings',
      'type-awsm_job_openings',
      'status-publish',
      'hentry',
      'job-category-malayalam-telecaller',
      'job-category-telecaller',
      'job-type-full-time',
      'job-location-work-from-home',
    ],
  },
]

test('InsureMile helpers stay pinned to the verified first-party careers page and AWSM REST feed', async () => {
  const insuremile = await loadInsureMileModule()

  assert.equal(insuremile.SOURCE, 'insuremile')
  assert.equal(insuremile.COMPANY, 'InsureMile')
  assert.equal(insuremile.VERIFIED_ON, '2026-07-16')
  assert.equal(insuremile.CAREERS_URL, 'https://insuremile.in/careers/')
  assert.equal(insuremile.CAREERS_API_URL, 'https://insuremile.in/wp-json/wp/v2/awsm_job_openings')
  assert.equal(insuremile.hasVerifiedCareersPageSignal(careersPageHtml), true)
  assert.equal(
    insuremile.buildSearchUrl(1),
    'https://insuremile.in/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=100&page=1',
  )

  assert.deepEqual(insuremile.extractSearchResults(listingPayload), [
    {
      title: 'Telesales Executive',
      company: 'InsureMile',
      department: 'Sales',
      location: 'Remote / Work From Home',
      city: null,
      country: 'India',
      jobId: '9279',
      requisitionId: '9279',
      sourceUrl: 'https://insuremile.in/career/telesales-executive/',
      applyUrl: 'https://insuremile.in/career/telesales-executive/',
      employmentType: 'Full Time / Part Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Job Title Telesales Executive Remote (Work from Home) Promote motor insurance products. Meet monthly sales targets.',
      remoteStatus: 'Remote',
    },
    {
      title: 'Malayalam Telecaller Jobs - Work from Home',
      company: 'InsureMile',
      department: 'Malayalam Telecaller / Telecaller',
      location: 'Work From Home',
      city: null,
      country: 'India',
      jobId: '9346',
      requisitionId: '9346',
      sourceUrl: 'https://insuremile.in/career/malayalam-telecaller-jobs-work-from-home/',
      applyUrl: 'https://insuremile.in/career/malayalam-telecaller-jobs-work-from-home/',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Company: InsureMile Location: Work from Home Handle inbound and outbound calls in Malayalam.',
      remoteStatus: 'Remote',
    },
  ])
})

test('InsureMile run validates the verified careers shell and paginates the AWSM REST feed', async () => {
  const insuremile = await loadInsureMileModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await insuremile.createInsureMileScraper({ pageSize: 2 }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      assert.equal(url, insuremile.CAREERS_URL)
      return careersPageHtml
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === insuremile.buildSearchUrl(1, 2)) return listingPayload
      if (url === insuremile.buildSearchUrl(2, 2)) return []
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-16T07:00:00.000Z',
  })

  assert.deepEqual(requestedTextUrls, [
    'https://insuremile.in/careers/',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://insuremile.in/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=2&page=1',
    'https://insuremile.in/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=2&page=2',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'insuremile')
  assert.equal(jobs[0].link, 'https://insuremile.in/career/telesales-executive/')
  assert.equal(jobs[0].scrapedAt, '2026-07-16T07:00:00.000Z')
})

test('InsureMile fails closed when the verified first-party careers shell or REST feed drifts', async () => {
  const insuremile = await loadInsureMileModule()

  await assert.rejects(
    insuremile.createInsureMileScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
      fetchJson: async () => [],
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    insuremile.createInsureMileScraper().run({
      fetchText: async () => careersPageHtml,
      fetchJson: async () => [{ id: 1, link: 'https://example.com/job/1', class_list: ['type-awsm_job_openings'] }],
    }),
    /verified awsm rest feed/i,
  )
})
