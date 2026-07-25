import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Personal Banking, NRI Banking, Business Loans | Karur Vysya Bank</title>
  </head>
  <body>
    <header>
      <a href="https://careers.karurvysya.bank.in/karurvysyabank/jobslist">Careers</a>
    </header>
    <main>
      <h1>Karur Vysya Bank</h1>
      <p>Personal Banking</p>
      <p>Business Loans</p>
    </main>
  </body>
</html>
`

const careersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Home</title>
    <base href="/karurvysyabank/">
  </head>
  <body>
    <app-root></app-root>
    <script src="runtime.36d5a07efd54c143.js"></script>
    <script src="main.92af9ef27720e0e0.js"></script>
    <script>
      if (location.hostname.includes('impl.openings.co') || location.hostname.includes('preprod1.openings.co')) {
        console.log('internal openings host')
      }
    </script>
  </body>
</html>
`

const companyConfigPayload = {
  company: {
    id: 15551,
    companyName: 'Karur Vysya Bank',
    careerSiteUrl: 'careers.karurvysya.bank.in',
    website: 'https://www.kvb.co.in/',
    domainName: 'careers.karurvysya.bank.in',
  },
  configurationSeo: {
    pageTitle: 'Karur Vysya Bank - Careers',
    metDescription: 'View open positions at Karur Vysya Bank',
  },
}

const searchPayload = [
  {
    jobTitle: 'Cluster Sales Manager - GL',
    departmentName: 'Agri Banking Group',
    location: 'Karur',
    jobCode: 'KVB10080',
    referenceNumber: 'KVB10080',
    jobUrl: 'cluster-sales-manager-gl-karur-2025061119013220',
    experienceUIField: '3-8 years',
    displayStatus: 'Open',
    createDate: '01-Apr-2025',
    skillSet: 'Sales, Relationship Management',
    shortDescription: '<p>Drive gold loan sales across the cluster.</p>',
  },
  {
    jobTitle: 'Product Mgr.-Prod.&Partnership',
    departmentName: 'Product',
    location: 'Delhi, India;Bangalore, Karnataka, India;Chennai, Tamil Nadu, India',
    jobCode: 'KVB10101',
    referenceNumber: 'KVB10101',
    jobUrl: 'product-mgr-prod-partnership-all-branches-2025062618181035',
    experienceUIField: '3-10 years',
    displayStatus: 'Open',
    createdDate: '2025-06-26T00:00:00',
    skillsToEvaluate: 'Payments, Partnerships',
    shortDescription: '<p>Own product and partnership growth initiatives.</p>',
  },
  {
    jobTitle: 'Archived Role',
    departmentName: 'Operations',
    location: 'Chennai, Tamil Nadu, India',
    jobCode: 'KVB99999',
    referenceNumber: 'KVB99999',
    jobUrl: 'archived-role-2025061119013999',
    experienceUIField: '2-4 years',
    displayStatus: 'Closed',
    createDate: '11-Jun-2025',
    shortDescription: '<p>This closed role should be ignored.</p>',
  },
]

const loadKarurVysyaBankModule = async () => {
  try {
    return await import('../karurvysyabank/script.js')
  } catch {
    assert.fail('Expected Karur Vysya Bank scraper module at ../karurvysyabank/script.js')
  }
}

test('Karur Vysya Bank helpers stay pinned to the verified Zwayam careers contract', async () => {
  const karurVysyaBank = await loadKarurVysyaBankModule()

  assert.equal(karurVysyaBank.SOURCE, 'karurvysyabank')
  assert.equal(karurVysyaBank.COMPANY_NAME, 'Karur Vysya Bank')
  assert.equal(karurVysyaBank.HOMEPAGE_URL, 'https://www.kvb.bank.in/')
  assert.equal(
    karurVysyaBank.CAREERS_URL,
    'https://careers.karurvysya.bank.in/karurvysyabank/jobslist',
  )
  assert.equal(
    karurVysyaBank.COMPANY_CONFIGURATION_URL,
    'https://public.zwayam.com/data-service/v2/company/15551/careersite-configurations',
  )
  assert.equal(
    karurVysyaBank.SEARCH_API_URL,
    'https://public.zwayam.com/manageESQueries/searchJob',
  )
  assert.equal(karurVysyaBank.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(karurVysyaBank.hasOfficialCareersShellSignal(careersShellHtml), true)
  assert.equal(karurVysyaBank.hasVerifiedCompanyConfiguration(companyConfigPayload), true)
  assert.deepEqual(karurVysyaBank.buildSearchPayload(), {
    id: '15551',
    companyUrl: 'careers.karurvysya.bank.in/',
    job: '',
    city: '',
    userGeoLocation: '',
    departmentName: '',
    fieldName: '',
    fieldValue: '',
  })
  assert.equal(
    karurVysyaBank.buildJobDetailUrl('cluster-sales-manager-gl-karur-2025061119013220'),
    'https://careers.karurvysya.bank.in/karurvysyabank/jobview/cluster-sales-manager-gl-karur-2025061119013220',
  )
})

test('Karur Vysya Bank search extraction keeps only open jobs and normalizes locations', async () => {
  const karurVysyaBank = await loadKarurVysyaBankModule()
  const jobs = karurVysyaBank.extractSearchResults(searchPayload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Cluster Sales Manager - GL',
    company: 'Karur Vysya Bank',
    department: 'Agri Banking Group',
    location: 'Karur',
    city: 'Karur',
    jobId: 'KVB10080',
    requisitionId: 'KVB10080',
    sourceUrl: 'https://careers.karurvysya.bank.in/karurvysyabank/jobview/cluster-sales-manager-gl-karur-2025061119013220',
    applyUrl: 'https://careers.karurvysya.bank.in/karurvysyabank/jobview/cluster-sales-manager-gl-karur-2025061119013220',
    employmentType: null,
    experienceRequired: '3-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Sales',
      'Relationship Management',
    ],
    postingDate: '2025-04-01',
    closingDate: null,
    jobDescription: 'Drive gold loan sales across the cluster.',
  })
  assert.equal(
    jobs[1].location,
    'Delhi, India; Bangalore, Karnataka, India; Chennai, Tamil Nadu, India',
  )
  assert.equal(jobs[1].city, 'Delhi')
  assert.deepEqual(jobs[1].requiredSkills, [
    'Payments',
    'Partnerships',
  ])
})

test('Karur Vysya Bank scraper validates the verified surfaces before returning jobs', async () => {
  const karurVysyaBank = await loadKarurVysyaBankModule()
  const pageRequests = []
  const jsonRequests = []

  const jobs = await karurVysyaBank.createKarurVysyaBankScraper().run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === karurVysyaBank.HOMEPAGE_URL) {
        return {
          ok: true,
          status: 200,
          url,
          html: homepageHtml,
        }
      }

      if (url === karurVysyaBank.CAREERS_URL) {
        return {
          ok: true,
          status: 200,
          url,
          html: careersShellHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      jsonRequests.push({ url, options })

      if (url === karurVysyaBank.COMPANY_CONFIGURATION_URL) {
        return companyConfigPayload
      }

      if (url === karurVysyaBank.SEARCH_API_URL) {
        return searchPayload
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(pageRequests, [
    karurVysyaBank.HOMEPAGE_URL,
    karurVysyaBank.CAREERS_URL,
  ])
  assert.deepEqual(jsonRequests, [
    {
      url: 'https://public.zwayam.com/data-service/v2/company/15551/careersite-configurations',
      options: {},
    },
    {
      url: 'https://public.zwayam.com/manageESQueries/searchJob',
      options: {
        method: 'POST',
        form: {
          id: '15551',
          companyUrl: 'careers.karurvysya.bank.in/',
          job: '',
          city: '',
          userGeoLocation: '',
          departmentName: '',
          fieldName: '',
          fieldValue: '',
        },
      },
    },
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'karurvysyabank')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('Karur Vysya Bank fails closed when the verified homepage, careers shell, or company config changes', async () => {
  const karurVysyaBank = await loadKarurVysyaBankModule()

  await assert.rejects(
    karurVysyaBank.createKarurVysyaBankScraper().run({
      fetchPage: async (url) => ({
        ok: true,
        status: 200,
        url,
        html: url === karurVysyaBank.HOMEPAGE_URL
          ? '<html><head><title>Placeholder</title></head><body>Welcome</body></html>'
          : careersShellHtml,
      }),
      fetchJson: async () => companyConfigPayload,
    }),
    /official Karur Vysya Bank homepage/i,
  )

  await assert.rejects(
    karurVysyaBank.createKarurVysyaBankScraper().run({
      fetchPage: async (url) => ({
        ok: true,
        status: 200,
        url,
        html: url === karurVysyaBank.HOMEPAGE_URL
          ? homepageHtml
          : '<html><head><title>Jobs</title></head><body><main>No app shell</main></body></html>',
      }),
      fetchJson: async () => companyConfigPayload,
    }),
    /official Karur Vysya Bank careers shell/i,
  )

  await assert.rejects(
    karurVysyaBank.createKarurVysyaBankScraper().run({
      fetchPage: async (url) => ({
        ok: true,
        status: 200,
        url,
        html: url === karurVysyaBank.HOMEPAGE_URL ? homepageHtml : careersShellHtml,
      }),
      fetchJson: async (url) => {
        if (url === karurVysyaBank.COMPANY_CONFIGURATION_URL) {
          return {
            company: {
              id: 1,
              companyName: 'Unexpected Company',
              careerSiteUrl: 'example.com',
              domainName: 'example.com',
            },
          }
        }

        return searchPayload
      },
    }),
    /company configuration/i,
  )
})
