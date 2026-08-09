import assert from 'node:assert/strict'
import test from 'node:test'

const loadTeamleaseModule = async () => {
  try {
    return await import('../../scraper/teamlease/script.js')
  } catch {
    assert.fail('Expected Teamlease scraper module at ../../scraper/teamlease/script.js')
  }
}

const listingPayload = [
  {
    id: 5001,
    link: 'https://group.teamlease.com/jobs/sales-manager-staffing-5/',
    title: {
      rendered: 'Sales Manager - Staffing',
    },
    content: {
      rendered: '<p>Lead enterprise staffing growth for the west region.</p>',
    },
    class_list: [
      'type-awsm_job_openings',
      'job-category-sales',
      'job-location-mumbai',
      'job-type-full-time',
    ],
  },
  {
    id: 5002,
    link: 'https://group.teamlease.com/jobs/recruitment-specialist-2/',
    title: {
      rendered: 'Recruitment Specialist',
    },
    content: {
      rendered: '<p>Support hiring operations for key client accounts.</p>',
    },
    class_list: [
      'type-awsm_job_openings',
      'job-category-operations',
      'job-location-bengaluru',
      'job-type-full-time',
    ],
  },
]

const detailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Sales Manager - Staffing</h1>
    <p>Job Category: Sales</p>
    <p>Job Type: Full Time</p>
    <p>Job Location: Mumbai</p>
    <section id="jobDescription">
      <p>Lead enterprise staffing growth for the west region.</p>
      <ul>
        <li>Drive regional sales targets.</li>
        <li>Manage strategic client relationships.</li>
      </ul>
    </section>
    <h2>Apply Now</h2>
    <form action="https://marcom.teamlease.com/form/submit?formId=12" method="post">
      <input type="hidden" name="zf_referrer_name" value="sales-manager-staffing-5" />
    </form>
  </body>
</html>
`

test('Teamlease AWSM helpers stay on the public REST archive and map listing rows into shared fields', async () => {
  const teamlease = await loadTeamleaseModule()

  assert.equal(teamlease.CAREERS_URL, 'https://group.teamlease.com/jobs/')
  assert.equal(teamlease.CAREERS_API_URL, 'https://group.teamlease.com/wp-json/wp/v2/awsm_job_openings')
  assert.equal(typeof teamlease.buildSearchUrl, 'function')
  assert.equal(typeof teamlease.extractSearchResults, 'function')
  assert.equal(typeof teamlease.extractJobDetail, 'function')
  assert.equal(typeof teamlease.createTeamleaseScraper, 'function')
  assert.equal(typeof teamlease.run, 'function')

  assert.equal(
    teamlease.buildSearchUrl(1),
    'https://group.teamlease.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=100&page=1',
  )

  assert.deepEqual(teamlease.extractSearchResults(listingPayload), [
    {
      title: 'Sales Manager - Staffing',
      company: 'Teamlease',
      department: 'Sales',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '5001',
      requisitionId: '5001',
      sourceUrl: 'https://group.teamlease.com/jobs/sales-manager-staffing-5/',
      applyUrl: 'https://group.teamlease.com/jobs/sales-manager-staffing-5/',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Lead enterprise staffing growth for the west region.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Recruitment Specialist',
      company: 'Teamlease',
      department: 'Operations',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '5002',
      requisitionId: '5002',
      sourceUrl: 'https://group.teamlease.com/jobs/recruitment-specialist-2/',
      applyUrl: 'https://group.teamlease.com/jobs/recruitment-specialist-2/',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Support hiring operations for key client accounts.',
      remoteStatus: 'On-site',
    },
  ])
})

test('extractJobDetail promotes Teamlease detail-page form actions into the shared applyUrl field', async () => {
  const teamlease = await loadTeamleaseModule()
  const listing = teamlease.extractSearchResults(listingPayload)[0]
  const detail = teamlease.extractJobDetail(detailHtml, listing)

  assert.deepEqual(detail, {
    title: 'Sales Manager - Staffing',
    company: 'Teamlease',
    department: 'Sales',
    location: 'Mumbai, India',
    city: 'Mumbai',
    country: 'India',
    jobId: '5001',
    requisitionId: '5001',
    sourceUrl: 'https://group.teamlease.com/jobs/sales-manager-staffing-5/',
    applyUrl: 'https://marcom.teamlease.com/form/submit?formId=12',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Drive regional sales targets.',
      'Manage strategic client relationships.',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Lead enterprise staffing growth for the west region. Drive regional sales targets. Manage strategic client relationships.',
    remoteStatus: 'On-site',
  })
})

test('run paginates Teamlease REST listings, fetches detail pages, and decorates runner fields', async () => {
  const teamlease = await loadTeamleaseModule()
  const requestedJsonUrls = []
  const requestedTextUrls = []

  const jobs = await teamlease.createTeamleaseScraper({ pageSize: 1 }).run({
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === teamlease.buildSearchUrl(1, 1)) return [listingPayload[0]]
      if (url === teamlease.buildSearchUrl(2, 1)) return [listingPayload[1]]
      if (url === teamlease.buildSearchUrl(3, 1)) return []
      throw new Error(`Unexpected Teamlease JSON URL: ${url}`)
    },
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === 'https://group.teamlease.com/jobs/sales-manager-staffing-5/') return detailHtml
      if (url === 'https://group.teamlease.com/jobs/recruitment-specialist-2/') {
        return detailHtml
          .replaceAll('Sales Manager - Staffing', 'Recruitment Specialist')
          .replaceAll('Lead enterprise staffing growth for the west region.', 'Support hiring operations for key client accounts.')
          .replaceAll('Sales', 'Operations')
          .replaceAll('Mumbai', 'Bengaluru')
      }
      throw new Error(`Unexpected Teamlease HTML URL: ${url}`)
    },
    now: () => '2026-07-09T12:00:00.000Z',
  })

  assert.deepEqual(requestedJsonUrls, [
    'https://group.teamlease.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=1&page=1',
    'https://group.teamlease.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=1&page=2',
    'https://group.teamlease.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=1&page=3',
  ])
  assert.deepEqual(requestedTextUrls, [
    'https://group.teamlease.com/jobs/sales-manager-staffing-5/',
    'https://group.teamlease.com/jobs/recruitment-specialist-2/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'teamlease')
  assert.equal(jobs[0].link, 'https://marcom.teamlease.com/form/submit?formId=12')
  assert.equal(jobs[0].scrapedAt, '2026-07-09T12:00:00.000Z')
})

test('run stops after the final Teamlease REST page instead of probing an out-of-range page', async () => {
  const teamlease = await loadTeamleaseModule()
  const requestedJsonUrls = []

  const jobs = await teamlease.createTeamleaseScraper().run({
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === teamlease.buildSearchUrl(1)) return listingPayload
      throw new Error(`Unexpected Teamlease JSON URL: ${url}`)
    },
    fetchText: async () => detailHtml,
    now: () => '2026-07-09T12:00:00.000Z',
  })

  assert.deepEqual(requestedJsonUrls, [
    'https://group.teamlease.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=100&page=1',
  ])
  assert.equal(jobs.length, 2)
})
