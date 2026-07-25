import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Anthem - Home - Anthem</title>
    <meta
      name="description"
      content="Integrated CRDMO services across discovery, development and commercial manufacturing for small molecules, peptides, lipids, oligos, high-potent APIs and large"
    >
    <link rel="canonical" href="https://anthembio.com/">
  </head>
  <body>
    <a class="site-logo" href="https://anthembio.com">
      <img alt="Anthem Biosciences Logo" src="https://anthembio.com/wp-content/uploads/2023/09/Anthem-2.webp">
    </a>
    <a class="ekit-wrapper-link" href="https://anthembio.com/careers/"></a>
    <span class="ekit-stylish-list-content-title">Careers</span>
  </body>
</html>
`

const careersPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers - Anthem</title>
    <meta
      name="description"
      content="We are not just following the science, we are leading it. To do that, we need the curious, the relentless and the visionary. We need YOU."
    >
    <link rel="canonical" href="https://anthembio.com/careers/">
  </head>
  <body>
    <p>
      We are not just following the science, we are leading it.
      To do that, we need the curious, the relentless and the visionary.
      We need <strong>YOU.</strong>
    </p>
    <h3>Health & Wellness Plans</h3>
    <h3>Financial Security & Growth</h3>
    <h3>Flexible & Generous Time Off</h3>
    <h3>Life & Learning Support</h3>
    <h3>Wealth Creation Opportunity</h3>
    <a class="elementor-button" href="https://anthemhrcp.peoplestrong.com/" rel="noopener">
      Explore openings
    </a>
    <h2>Open Positions (5)</h2>
  </body>
</html>
`

const portalShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Candidate Portal</title>
    <base href="/">
  </head>
  <body class="LtR candidate-portal">
    <app-root data-testid="src-index-app-root-page-1"></app-root>
    <script src="main-IQMZX3K4.js" type="module"></script>
  </body>
</html>
`

const samplePayload = {
  totalRecords: 1,
  response: [
    {
      organizationUnitComplete: 'Manufacturing>Process Development>Process Development',
      jobPostedDate: '2026-07-10',
      locationHierarchyComplete: 'India>Karnataka>Bengaluru>Bengaluru',
      jobDetailUrl: 'https://anthemhrcp.peoplestrong.com/job/detail/ANT_MFG_123456',
      designation: 'Senior Scientist',
      requisitionId: 123456,
      jobTitle: 'Senior Scientist',
      jobCode: 'ANT/MFG/123456',
      organizationUnit: 'Manufacturing',
      jobClosureDate: '2026-08-15',
      locationHierarchy: 'Bengaluru',
      expRange: '4-8 years',
      skills: {
        mustTohave: ['HPLC'],
        goodtohave: ['Scale-up'],
      },
      employmentTenureType: 'Full Time',
      minimumQualification: 'M.Sc',
      preferredQualification: 'PhD',
      jobDescription: 'Lead analytical method development.',
    },
  ],
  messageCode: {
    code: 200,
    messages: 'success',
  },
  campusHiring: 0,
  solrSearch: false,
}

const emptyPayload = {
  totalRecords: 0,
  response: [],
  messageCode: {
    code: 200,
    messages: 'success',
  },
  campusHiring: 0,
  solrSearch: false,
}

const loadModule = async () => {
  try {
    return await import('../anthem/script.js')
  } catch {
    assert.fail('Expected Anthem scraper module at ../anthem/script.js')
  }
}

test('Anthem scraper constants stay pinned to the verified first-party careers page and public PeopleStrong feed', async () => {
  const anthem = await loadModule()

  assert.equal(anthem.SOURCE, 'anthem')
  assert.equal(anthem.COMPANY, 'Anthem')
  assert.equal(anthem.HOMEPAGE_URL, 'https://anthembio.com/')
  assert.equal(anthem.CAREERS_PAGE_URL, 'https://anthembio.com/careers/')
  assert.equal(anthem.PORTAL_ORIGIN, 'https://anthemhrcp.peoplestrong.com')
  assert.equal(anthem.JOB_LISTINGS_URL, 'https://anthemhrcp.peoplestrong.com/')
  assert.equal(
    anthem.buildApiUrl(),
    'https://anthemhrcp.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  )
  assert.equal(
    anthem.buildApiUrl({ offset: 20, limit: 10 }),
    'https://anthemhrcp.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=20&limit=10',
  )
  assert.equal(
    anthem.buildJobDetailUrl('ANT/MFG/123456'),
    'https://anthemhrcp.peoplestrong.com/job/detail/ANT%2FMFG%2F123456',
  )
  assert.equal(anthem.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(anthem.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(
    anthem.extractPeopleStrongHandoffUrl(careersPageHtml),
    'https://anthemhrcp.peoplestrong.com/',
  )
  assert.equal(anthem.hasPublicPortalShell(portalShellHtml), true)
  assert.equal(anthem.buildPublicHeaders().Origin, 'https://anthemhrcp.peoplestrong.com')
  assert.equal(anthem.buildPublicHeaders().Referer, 'https://anthemhrcp.peoplestrong.com/')

  const jobs = anthem.extractSearchResults(samplePayload)
  assert.deepEqual(jobs, [
    {
      title: 'Senior Scientist',
      company: 'Anthem',
      department: 'Manufacturing',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'ANT/MFG/123456',
      requisitionId: '123456',
      sourceUrl: 'https://anthemhrcp.peoplestrong.com/job/detail/ANT_MFG_123456',
      applyUrl: 'https://anthemhrcp.peoplestrong.com/job/detail/ANT_MFG_123456',
      employmentType: 'Full Time',
      experienceRequired: '4-8 years',
      minimumQualification: 'M.Sc',
      preferredQualification: 'PhD',
      requiredSkills: ['HPLC', 'Scale-up'],
      postingDate: '2026-07-10',
      closingDate: '2026-08-15',
      jobDescription: 'Lead analytical method development.',
    },
  ])
  assert.deepEqual(anthem.extractSearchResults(emptyPayload), [])
})

test('Anthem returns no jobs while the verified careers page still hands off to an empty public PeopleStrong feed', async () => {
  const anthem = await loadModule()
  const pageRequests = []
  const apiRequests = []

  const jobs = await anthem.createAnthemScraper().run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === anthem.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === anthem.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersPageHtml }
      }

      if (url === anthem.JOB_LISTINGS_URL) {
        return { status: 200, url, html: portalShellHtml }
      }

      throw new Error(`Unexpected Anthem page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      apiRequests.push({ url, options })
      return emptyPayload
    },
  })

  assert.deepEqual(pageRequests, [
    anthem.HOMEPAGE_URL,
    anthem.CAREERS_PAGE_URL,
    anthem.JOB_LISTINGS_URL,
  ])
  assert.equal(apiRequests.length, 1)
  assert.equal(apiRequests[0].url, anthem.buildApiUrl())
  assert.equal(apiRequests[0].options.method, 'POST')
  assert.equal(apiRequests[0].options.body, JSON.stringify(anthem.DEFAULT_SEARCH_BODY))
  assert.equal(apiRequests[0].options.headers.Origin, 'https://anthemhrcp.peoplestrong.com')
  assert.deepEqual(jobs, [])
})

test('Anthem fails closed when the verified homepage, careers handoff, or public PeopleStrong portal drift', async () => {
  const anthem = await loadModule()

  await assert.rejects(
    anthem.createAnthemScraper().run({
      fetchPage: async (url) => {
        if (url === anthem.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Anthem page URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    anthem.createAnthemScraper().run({
      fetchPage: async (url) => {
        if (url === anthem.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === anthem.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: careersPageHtml.replace('https://anthemhrcp.peoplestrong.com/', 'https://example.com/jobs'),
          }
        }

        throw new Error(`Unexpected Anthem page URL: ${url}`)
      },
    }),
    /known PeopleStrong handoff/i,
  )

  await assert.rejects(
    anthem.createAnthemScraper().run({
      fetchPage: async (url) => {
        if (url === anthem.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === anthem.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === anthem.JOB_LISTINGS_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Anthem page URL: ${url}`)
      },
    }),
    /verified public PeopleStrong portal/i,
  )
})
