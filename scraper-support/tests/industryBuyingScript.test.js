import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => import('../../scraper/industrybuying/script.js')

const kekaBootstrapHtml = `
<!DOCTYPE html>
<html>
  <head>
    <script>
      window.isCareersPage = true;
    </script>
  </head>
  <body>
    <script>
      fetch('/ats/documents/e3038951-eb0d-4a7c-86f2-ae81cdef2d70/careerportal/da655cd526254c25868607ec6d7ba738.html')
        .then(response => response.text())
    </script>
  </body>
</html>
`

const embeddedCareersHtml = `
<!DOCTYPE html>
<html>
  <head>
    <script>
      window.khConfig = {
        identifier: 'e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
        domain: 'https://industrybuying.keka.com/careers/',
        targetContainer: '#khembedjobs'
      }
    </script>
    <script src="https://industrybuying.keka.com/careers/api/embedjobs/js/e3038951-eb0d-4a7c-86f2-ae81cdef2d70" defer></script>
  </head>
  <body>
    <h1>Be a part of building something great</h1>
    <h2>Open positions</h2>
    <a>Browse all jobs</a>
  </body>
</html>
`

const portalInfo = {
  name: 'IndustryBuying',
  shortName: 'IndustryBuying',
  careersPortalDomain: 'industrybuying.keka.com',
}

test('IndustryBuying resolves the verified Keka bootstrap, embedded config, and portal identity', async () => {
  const industryBuying = await loadModule()

  assert.equal(industryBuying.SOURCE, 'industrybuying')
  assert.equal(industryBuying.COMPANY, 'IndustryBuying')
  assert.equal(industryBuying.KEKA_CAREER_PAGE_URL, 'https://industrybuying.keka.com/careers/')
  assert.equal(industryBuying.EXPECTED_IDENTIFIER, 'e3038951-eb0d-4a7c-86f2-ae81cdef2d70')
  assert.equal(industryBuying.EXPECTED_KEKA_DOMAIN, 'https://industrybuying.keka.com/careers/')
  assert.equal(industryBuying.EXPECTED_PORTAL_NAME, 'IndustryBuying')

  assert.equal(
    industryBuying.extractEmbeddedCareersDocumentPath(kekaBootstrapHtml),
    '/ats/documents/e3038951-eb0d-4a7c-86f2-ae81cdef2d70/careerportal/da655cd526254c25868607ec6d7ba738.html',
  )
  assert.deepEqual(industryBuying.extractCareerConfig(embeddedCareersHtml), {
    identifier: 'e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
    domain: 'https://industrybuying.keka.com/careers/',
    portalName: 'default',
  })
  assert.equal(
    industryBuying.buildCareerPortalInfoUrl(industryBuying.extractCareerConfig(embeddedCareersHtml)),
    'https://industrybuying.keka.com/careers/api/organization/default/careerportalinfo',
  )
  assert.equal(
    industryBuying.buildActiveJobsUrl(industryBuying.extractCareerConfig(embeddedCareersHtml)),
    'https://industrybuying.keka.com/careers/api/embedjobs/default/active/e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
  )
  assert.equal(industryBuying.hasExpectedPortalIdentity(portalInfo), true)
})

test('IndustryBuying maps only India jobs from the verified Keka payload into the shared contract', async () => {
  const industryBuying = await loadModule()

  const jobs = industryBuying.extractSearchResults(
    [
      {
        id: 137282,
        title: 'Senior Manager Finance',
        description: '<div>Own receivables, taxation, reporting, and financial analysis.</div>',
        departmentName: 'Finance & Accounts',
        jobLocations: [
          {
            name: 'New Delhi',
            city: 'New Delhi',
            state: 'Delhi',
            countryCode: 'IN',
            countryName: 'India',
          },
        ],
        jobType: 2,
        experience: '6-8 Years',
        publishedOn: '2026-04-28T05:15:21.413Z',
        skillNames: [
          'Account Reconciliation',
          'receivable',
          'taxation',
          'Financial Reporting',
          'Financial Analysis',
        ],
      },
      {
        id: 999999,
        title: 'Global Sales Lead',
        departmentName: 'Sales',
        jobLocations: [
          {
            name: 'Austin',
            city: 'Austin',
            state: 'TX',
            countryCode: 'US',
            countryName: 'United States',
          },
        ],
        jobType: 2,
      },
    ],
    {
      domain: 'https://industrybuying.keka.com/careers/',
    },
  )

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Manager Finance',
    company: 'IndustryBuying',
    department: 'Finance & Accounts',
    location: 'New Delhi, Delhi, India',
    city: 'New Delhi',
    country: 'India',
    jobId: '137282',
    requisitionId: '137282',
    sourceUrl: 'https://industrybuying.keka.com/careers/jobdetails/137282',
    applyUrl: 'https://industrybuying.keka.com/careers/applyjob/137282',
    employmentType: 'Full Time',
    experienceRequired: '6-8 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Account Reconciliation',
      'receivable',
      'taxation',
      'Financial Reporting',
      'Financial Analysis',
    ],
    postingDate: '2026-04-28',
    closingDate: null,
    jobDescription: 'Own receivables, taxation, reporting, and financial analysis.',
  })
})

test('IndustryBuying run validates the pinned Keka surface and decorates jobs', async () => {
  const industryBuying = await loadModule()

  const requestedTexts = []
  const requestedJson = []
  const scraper = industryBuying.createIndustryBuyingScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === industryBuying.KEKA_CAREER_PAGE_URL) return kekaBootstrapHtml
      if (url === 'https://industrybuying.keka.com/ats/documents/e3038951-eb0d-4a7c-86f2-ae81cdef2d70/careerportal/da655cd526254c25868607ec6d7ba738.html') {
        return embeddedCareersHtml
      }

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === 'https://industrybuying.keka.com/careers/api/organization/default/careerportalinfo') {
        return portalInfo
      }
      if (url === 'https://industrybuying.keka.com/careers/api/embedjobs/default/active/e3038951-eb0d-4a7c-86f2-ae81cdef2d70') {
        return [
          {
            id: 71810,
            title: 'Category Group Head - June',
            description: '<div>Lead category strategy and margin growth.</div>',
            departmentName: 'Category',
            jobLocations: [
              {
                name: 'New Delhi',
                city: 'New Delhi',
                state: 'Delhi',
                countryCode: 'IN',
                countryName: 'India',
              },
            ],
            jobType: 2,
            experience: '8-15 years',
            publishedOn: '2026-06-15T13:20:24.880Z',
            skillNames: ['Category Management'],
          },
        ]
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    industryBuying.KEKA_CAREER_PAGE_URL,
    'https://industrybuying.keka.com/ats/documents/e3038951-eb0d-4a7c-86f2-ae81cdef2d70/careerportal/da655cd526254c25868607ec6d7ba738.html',
  ])
  assert.deepEqual(requestedJson, [
    'https://industrybuying.keka.com/careers/api/organization/default/careerportalinfo',
    'https://industrybuying.keka.com/careers/api/embedjobs/default/active/e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'industrybuying')
  assert.equal(jobs[0].company, 'IndustryBuying')
  assert.equal(jobs[0].link, 'https://industrybuying.keka.com/careers/applyjob/71810')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('IndustryBuying fails closed when the verified Keka bootstrap, config, or portal identity changes', async () => {
  const industryBuying = await loadModule()

  await assert.rejects(
    industryBuying.createIndustryBuyingScraper().run({
      fetchText: async (url) => {
        if (url === industryBuying.KEKA_CAREER_PAGE_URL) return '<html><body>No embedded careers doc</body></html>'
        return embeddedCareersHtml
      },
      fetchJson: async () => portalInfo,
    }),
    /embedded careers document/i,
  )

  await assert.rejects(
    industryBuying.createIndustryBuyingScraper().run({
      fetchText: async (url) => {
        if (url === industryBuying.KEKA_CAREER_PAGE_URL) return kekaBootstrapHtml
        return embeddedCareersHtml.replace(
          'e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
          '11111111-2222-3333-4444-555555555555',
        )
      },
      fetchJson: async (url) => {
        if (url === 'https://industrybuying.keka.com/careers/api/organization/default/careerportalinfo') {
          return portalInfo
        }
        return []
      },
    }),
    /verified Keka job surface changed materially/i,
  )

  await assert.rejects(
    industryBuying.createIndustryBuyingScraper().run({
      fetchText: async (url) => {
        if (url === industryBuying.KEKA_CAREER_PAGE_URL) return kekaBootstrapHtml
        return embeddedCareersHtml
      },
      fetchJson: async (url) => {
        if (url === 'https://industrybuying.keka.com/careers/api/organization/default/careerportalinfo') {
          return { ...portalInfo, name: 'Different Company' }
        }
        return []
      },
    }),
    /exact company identity/i,
  )
})
