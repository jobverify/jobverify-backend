import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../casepoint/script.js')
  } catch {
    assert.fail('Expected Casepoint scraper module at ../casepoint/script.js')
  }
}

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join Our Team | Careers | Casepoint</title>
  </head>
  <body>
    <h1>Join Our Team</h1>
    <a href="https://www.casepoint.com/us-careers/">View US Roles</a>
    <a href="https://casepoint.keka.com/careers/">View India Roles</a>
  </body>
</html>
`

const kekaBootstrapHtml = `
<!doctype html>
<html lang="en">
  <body>
    <script>
      fetch('/ats/documents/898e18ec-f5aa-44a9-b993-a3ccd6f94d11/careerportal/9bee1059fcfb404ebfb614167c306b06.html')
    </script>
  </body>
</html>
`

const embeddedCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <script>
      window.khConfig = {
        identifier: '898e18ec-f5aa-44a9-b993-a3ccd6f94d11',
        domain: 'https://casepoint.keka.com/careers/',
        targetContainer: '#khembedjobs'
      }
    </script>
    <script src="https://casepoint.keka.com/careers/api/embedjobs/js/898e18ec-f5aa-44a9-b993-a3ccd6f94d11"></script>
    <h2>Open Positions</h2>
    <div id="khembedjobs"></div>
  </body>
</html>
`

const portalInfo = {
  name: 'Casepoint Private Limited',
  shortName: 'Casepoint Private Limited',
  careersPortalDomain: 'casepoint.keka.com',
  companyWebsite: 'https://www.casepoint.com/',
}

test('Casepoint constants stay pinned to the verified India roles handoff and Keka surface', async () => {
  const casepoint = await loadModule()

  assert.equal(casepoint.SOURCE, 'casepoint')
  assert.equal(casepoint.COMPANY, 'Casepoint')
  assert.equal(casepoint.CAREERS_URL, 'https://www.casepoint.com/careers/')
  assert.equal(casepoint.KEKA_BOARD_URL, 'https://casepoint.keka.com/careers/')
  assert.equal(casepoint.EXPECTED_IDENTIFIER, '898e18ec-f5aa-44a9-b993-a3ccd6f94d11')
  assert.equal(casepoint.hasOfficialCareersSignal(careersPageHtml), true)
  assert.equal(
    casepoint.extractEmbeddedCareersDocumentPath(kekaBootstrapHtml),
    '/ats/documents/898e18ec-f5aa-44a9-b993-a3ccd6f94d11/careerportal/9bee1059fcfb404ebfb614167c306b06.html',
  )
  assert.deepEqual(casepoint.extractCareerConfig(embeddedCareersHtml), {
    identifier: '898e18ec-f5aa-44a9-b993-a3ccd6f94d11',
    domain: 'https://casepoint.keka.com/careers/',
    portalName: 'default',
  })
  assert.equal(casepoint.hasExpectedPortalIdentity(portalInfo), true)
})

test('Casepoint keeps only India jobs from the verified Keka payload', async () => {
  const casepoint = await loadModule()

  const jobs = casepoint.extractSearchResults(
    [
      {
        id: 44401,
        title: 'Performance Tester',
        description: '<div>Own performance test planning and execution for eDiscovery products.</div>',
        departmentName: 'Engineering',
        jobLocations: [
          {
            name: 'Surat Office',
            city: 'Surat',
            state: 'GJ',
            countryCode: 'IN',
            countryName: 'India',
          },
        ],
        jobType: 2,
        experience: '3-5 years',
        publishedOn: '2026-07-10T00:00:00.000Z',
        skillNames: ['JMeter'],
      },
      {
        id: 55555,
        title: 'US Solutions Architect',
        description: '<div>Should be filtered out.</div>',
        departmentName: 'Solutions',
        jobLocations: [
          {
            name: 'Austin',
            city: 'Austin',
            state: 'TX',
            countryCode: 'US',
            countryName: 'United States',
          },
        ],
      },
    ],
    {
      domain: 'https://casepoint.keka.com/careers/',
    },
  )

  assert.deepEqual(jobs, [
    {
      title: 'Performance Tester',
      company: 'Casepoint',
      department: 'Engineering',
      location: 'Surat, GJ, India',
      city: 'Surat',
      state: 'GJ',
      country: 'India',
      jobId: '44401',
      requisitionId: '44401',
      sourceUrl: 'https://casepoint.keka.com/careers/jobdetails/44401',
      applyUrl: 'https://casepoint.keka.com/careers/applyjob/44401',
      employmentType: 'Full Time',
      experienceRequired: '3-5 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['JMeter'],
      postingDate: '2026-07-10',
      closingDate: null,
      jobDescription: 'Own performance test planning and execution for eDiscovery products.',
    },
  ])
})

test('Casepoint run validates the verified handoff and decorates jobs', async () => {
  const casepoint = await loadModule()

  const requestedTexts = []
  const requestedJson = []
  const jobs = await casepoint.createCasepointScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === casepoint.CAREERS_URL) return careersPageHtml
      if (url === casepoint.KEKA_BOARD_URL) return kekaBootstrapHtml
      if (url === 'https://casepoint.keka.com/ats/documents/898e18ec-f5aa-44a9-b993-a3ccd6f94d11/careerportal/9bee1059fcfb404ebfb614167c306b06.html') {
        return embeddedCareersHtml
      }
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === 'https://casepoint.keka.com/careers/api/organization/default/careerportalinfo') {
        return portalInfo
      }
      if (url === 'https://casepoint.keka.com/careers/api/embedjobs/default/active/898e18ec-f5aa-44a9-b993-a3ccd6f94d11') {
        return [
          {
            id: 44402,
            title: 'Business Analyst',
            description: '<div>Translate legal technology requirements into deliverable product work.</div>',
            departmentName: 'Product',
            jobLocations: [
              {
                name: 'Surat Office',
                city: 'Surat',
                state: 'GJ',
                countryCode: 'IN',
                countryName: 'India',
              },
            ],
            jobType: 2,
            experience: '4-7 years',
            publishedOn: '2026-07-08T00:00:00.000Z',
            skillNames: ['Analysis', 'Documentation'],
          },
        ]
      }
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedTexts, [
    'https://www.casepoint.com/careers/',
    'https://casepoint.keka.com/careers/',
    'https://casepoint.keka.com/ats/documents/898e18ec-f5aa-44a9-b993-a3ccd6f94d11/careerportal/9bee1059fcfb404ebfb614167c306b06.html',
  ])
  assert.deepEqual(requestedJson, [
    'https://casepoint.keka.com/careers/api/organization/default/careerportalinfo',
    'https://casepoint.keka.com/careers/api/embedjobs/default/active/898e18ec-f5aa-44a9-b993-a3ccd6f94d11',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Business Analyst')
  assert.equal(jobs[0].source, 'casepoint')
  assert.equal(jobs[0].companyDomain, 'casepoint.com')
  assert.equal(jobs[0].link, 'https://casepoint.keka.com/careers/applyjob/44402')
})

test('Casepoint fails closed when the verified first-party or Keka identity changes', async () => {
  const casepoint = await loadModule()

  await assert.rejects(
    casepoint.createCasepointScraper().run({
      fetchText: async () => '<html><body>No verified India handoff</body></html>',
      fetchJson: async () => portalInfo,
    }),
    /trusted first-party surface/i,
  )

  await assert.rejects(
    casepoint.createCasepointScraper().run({
      fetchText: async (url) => {
        if (url === casepoint.CAREERS_URL) return careersPageHtml
        if (url === casepoint.KEKA_BOARD_URL) return kekaBootstrapHtml
        return embeddedCareersHtml
      },
      fetchJson: async (url) => {
        if (url.includes('careerportalinfo')) {
          return { ...portalInfo, careersPortalDomain: 'different.keka.com' }
        }
        return []
      },
    }),
    /exact company identity/i,
  )
})
