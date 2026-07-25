import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Online Shopping for Women, Men, Kids Fashion & Lifestyle - Myntra</title>
  </head>
  <body>
    <footer>
      <a href="https://careers.myntra.com">Careers</a>
    </footer>
  </body>
</html>
`

const verifiedCareersLandingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Myntra</title>
  </head>
  <body>
    <main>
      <h1>Make work look good</h1>
      <a href="https://jobs.myntra.com/home">Explore Careers</a>
      <a href="https://jobs.myntra.com/home">Join the team</a>
    </main>
  </body>
</html>
`

const verifiedJobsPortalHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Portal</title>
  </head>
  <body>
    <script src="flutter.js"></script>
    <script src="main.dart.js"></script>
  </body>
</html>
`

const countPayload = {
  totalCount: 3,
  hotJobCount: 1,
}

const searchPayloadPageOne = {
  entities: [
    {
      id: 'r_eb3221bdc4d635e29f1505a3f66f4f73',
      displayId: '8561214766',
      workspaceId: 'MYNTRA-93as3',
      jobTitle: 'Senior Manager - Category Demand Management',
      requiredExperienceInMonths: { from: 60, to: 120 },
      jobType: 'ONSITE',
      skills: [
        { skill: 'category demand management', isMandatory: true },
        { skill: 'pricing strategies', isMandatory: true },
        { skill: 'data analytics', isMandatory: true },
      ],
      jobLocation: [{ fqLocationName: 'Bangalore, Karnataka, India' }],
      departmentName: 'Category Demand Management (F1369)',
      employmentType: 'FULL_TIME',
      jobPosting: {
        status: 'ACTIVE',
        startDate: '2026-07-10T00:00:00.000Z',
      },
      jobDescription: '<p>Lead category demand planning across fashion businesses.</p>',
      aboutCompany: "<p>Myntra is India's leading fashion destination.</p>",
      jobStatus: { statusCode: 'OPEN' },
    },
    {
      id: 'r_us_job',
      displayId: '1111111111',
      workspaceId: 'MYNTRA-93as3',
      jobTitle: 'Senior Analyst - US Market',
      requiredExperienceInMonths: { from: 24, to: 48 },
      jobType: 'ONSITE',
      skills: [{ skill: 'retail analytics', isMandatory: true }],
      jobLocation: [{ fqLocationName: 'New York, New York, United States' }],
      departmentName: 'International',
      employmentType: 'FULL_TIME',
      jobPosting: {
        status: 'ACTIVE',
        startDate: '2026-07-11T00:00:00.000Z',
      },
      jobDescription: '<p>United States only.</p>',
      aboutCompany: '<p>Outside India role.</p>',
      jobStatus: { statusCode: 'OPEN' },
    },
  ],
}

const searchPayloadPageTwo = {
  entities: [
    {
      id: 'r_596491491',
      displayId: '596491491',
      workspaceId: 'MYNTRA-93as3',
      jobTitle: 'Associate - Controllership & Finance',
      requiredExperienceInMonths: { from: 24, to: 60 },
      jobType: 'ONSITE',
      skills: [
        { skill: 'financial reporting', isMandatory: true },
        { skill: 'accounting controls', isMandatory: true },
      ],
      jobLocation: [{ fqLocationName: 'Bangalore, Karnataka, India' }],
      departmentName: 'Controllership & Finance',
      employmentType: 'FULL_TIME',
      jobPosting: {
        status: 'ACTIVE',
        startDate: '2026-07-09T00:00:00.000Z',
      },
      jobDescription: '<p>Support controllership and finance operations.</p>',
      aboutCompany: '<p>Myntra finance team.</p>',
      jobStatus: { statusCode: 'OPEN' },
    },
  ],
}

const loadMyntraModule = async () => {
  try {
    return await import('../myntra/script.js')
  } catch {
    assert.fail('Expected Myntra scraper module at ../myntra/script.js')
  }
}

test('Myntra verifies the first-party hiring pages and extracts India jobs from the public requisition payload', async () => {
  const myntra = await loadMyntraModule()

  assert.equal(
    myntra.buildWorkspaceBootstrapUrl(),
    'https://io.spire2grow.com/ies/v1/p/workspaceId?domain=jobs.myntra.com',
  )
  assert.equal(
    myntra.buildJobsCountUrl(),
    'https://io.spire2grow.com/ies/v1/p/requisition/_count',
  )
  assert.equal(
    myntra.buildJobsSearchUrl({ page: 2, size: 6 }),
    'https://io.spire2grow.com/ies/v1/p/requisition/_search?page=2&size=6&selectedSortOrder=desc&selectedSortField=postedOn',
  )
  assert.equal(
    myntra.buildJobUrl('8561214766', 'MYNTRA-93as3'),
    'https://jobs.myntra.com/jobs/8561214766?tenantId=MYNTRA-93as3&ref=job-share-direct-link',
  )
  assert.equal(myntra.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(myntra.hasVerifiedCareersLandingSignal(verifiedCareersLandingHtml), true)
  assert.equal(myntra.hasVerifiedJobsPortalSignal(verifiedJobsPortalHtml), true)
  assert.equal(myntra.extractWorkspaceId('MYNTRA-93as3'), 'MYNTRA-93as3')
  assert.equal(myntra.extractTotalCount(countPayload), 3)

  const jobs = myntra.extractIndiaJobsFromSearchPayload(searchPayloadPageOne, {
    workspaceId: 'MYNTRA-93as3',
    scrapedAt: '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [
    {
      title: 'Senior Manager - Category Demand Management',
      company: 'Myntra',
      department: 'Category Demand Management (F1369)',
      location: 'Bangalore, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      workplaceType: 'ONSITE',
      jobId: '8561214766',
      requisitionId: 'r_eb3221bdc4d635e29f1505a3f66f4f73',
      sourceUrl: 'https://jobs.myntra.com/jobs/8561214766?tenantId=MYNTRA-93as3&ref=job-share-direct-link',
      applyUrl: 'https://jobs.myntra.com/jobs/8561214766?tenantId=MYNTRA-93as3&ref=job-share-direct-link',
      link: 'https://jobs.myntra.com/jobs/8561214766?tenantId=MYNTRA-93as3&ref=job-share-direct-link',
      employmentType: 'FULL_TIME',
      experienceRequired: '5-10 years',
      requiredSkills: [
        'category demand management',
        'pricing strategies',
        'data analytics',
      ],
      postingDate: '2026-07-10',
      jobDescription: "Lead category demand planning across fashion businesses. Myntra is India's leading fashion destination.",
      source: 'myntra',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
  ])
})

test('Myntra run validates the verified first-party pages, bootstraps the public workspace, and paginates the requisition search API', async () => {
  const myntra = await loadMyntraModule()
  const requested = []

  const jobs = await myntra.createMyntraScraper({ pageSize: 2 }).run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === myntra.HOMEPAGE_URL) return verifiedHomepageHtml
      if (url === myntra.CAREERS_LANDING_URL) return verifiedCareersLandingHtml
      if (url === myntra.JOB_PORTAL_URL) return verifiedJobsPortalHtml
      if (url === myntra.buildWorkspaceBootstrapUrl()) return 'MYNTRA-93as3'
      throw new Error(`Unexpected Myntra text fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      if (url === myntra.buildJobsCountUrl()) return countPayload
      if (url === myntra.buildJobsSearchUrl({ page: 1, size: 2 })) return searchPayloadPageOne
      if (url === myntra.buildJobsSearchUrl({ page: 2, size: 2 })) return searchPayloadPageTwo
      throw new Error(`Unexpected Myntra JSON fixture URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(
    requested.map((entry) => ({ type: entry.type, url: entry.url })),
    [
      { type: 'text', url: myntra.HOMEPAGE_URL },
      { type: 'text', url: myntra.CAREERS_LANDING_URL },
      { type: 'text', url: myntra.JOB_PORTAL_URL },
      { type: 'text', url: myntra.buildWorkspaceBootstrapUrl() },
      { type: 'json', url: myntra.buildJobsCountUrl() },
      { type: 'json', url: myntra.buildJobsSearchUrl({ page: 1, size: 2 }) },
      { type: 'json', url: myntra.buildJobsSearchUrl({ page: 2, size: 2 }) },
    ],
  )
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].jobId, '8561214766')
  assert.equal(jobs[1].jobId, '596491491')
})

test('Myntra fails closed when the verified homepage, careers, portal, or workspace bootstrap contract drifts', async () => {
  const myntra = await loadMyntraModule()

  await assert.rejects(
    myntra.createMyntraScraper().run({
      fetchText: async (url) => {
        if (url === myntra.HOMEPAGE_URL) {
          return verifiedHomepageHtml.replace('https://careers.myntra.com', 'https://careers.example.com')
        }
        throw new Error(`Unexpected Myntra text fixture URL: ${url}`)
      },
      fetchJson: async () => countPayload,
    }),
    /verified Myntra homepage/i,
  )

  await assert.rejects(
    myntra.createMyntraScraper().run({
      fetchText: async (url) => {
        if (url === myntra.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === myntra.CAREERS_LANDING_URL) {
          return verifiedCareersLandingHtml
            .replaceAll('https://jobs.myntra.com/home', 'https://jobs.example.com/home')
            .replace('Explore Careers', 'Explore Opportunities')
        }
        throw new Error(`Unexpected Myntra text fixture URL: ${url}`)
      },
      fetchJson: async () => countPayload,
    }),
    /verified Myntra careers landing page/i,
  )

  await assert.rejects(
    myntra.createMyntraScraper().run({
      fetchText: async (url) => {
        if (url === myntra.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === myntra.CAREERS_LANDING_URL) return verifiedCareersLandingHtml
        if (url === myntra.JOB_PORTAL_URL) {
          return verifiedJobsPortalHtml.replace('Career Portal', 'Jobs')
        }
        throw new Error(`Unexpected Myntra text fixture URL: ${url}`)
      },
      fetchJson: async () => countPayload,
    }),
    /verified Myntra jobs portal/i,
  )

  await assert.rejects(
    myntra.createMyntraScraper().run({
      fetchText: async (url) => {
        if (url === myntra.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === myntra.CAREERS_LANDING_URL) return verifiedCareersLandingHtml
        if (url === myntra.JOB_PORTAL_URL) return verifiedJobsPortalHtml
        if (url === myntra.buildWorkspaceBootstrapUrl()) return 'invalid workspace'
        throw new Error(`Unexpected Myntra text fixture URL: ${url}`)
      },
      fetchJson: async () => countPayload,
    }),
    /workspace id/i,
  )
})
