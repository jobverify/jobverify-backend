import assert from 'node:assert/strict'
import test from 'node:test'

const searchShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aurigo Software Technologies Jobs</title>
  </head>
  <body>
    <a href="https://careers.aurigo.com/search/?locale=en_US&amp;previewLink=true&amp;referrerSave=false&amp;searchResultView=LIST" title="Job listings">Job listings</a>
    <button title="Search jobs">Search jobs</button>
    <script>
      var resultStyles = { currentLocale: 'en_US' };
      var CSRFToken = "token-123";
      var appParams = { locale: "en_US" };
    </script>
    <script src="/platform/js/j2w/min/j2w.searchManager.min.js?h=example"></script>
  </body>
</html>
`

const pageZeroPayload = {
  totalJobs: 12,
  jobSearchResult: [
    {
      response: {
        id: '2207',
        unifiedStandardTitle: 'Director of Product',
        unifiedUrlTitle: 'Director-of-Product',
        unifiedStandardStart: '4/3/26',
        unifiedStandardEnd: '8/28/26',
        division_obj: ['Product Management'],
        filter1: ['India'],
      },
    },
    {
      response: {
        id: '1535',
        unifiedStandardTitle: 'Senior Account Executive - Southeast',
        unifiedUrlTitle: 'Senior-Account-Executive-Southeast',
        unifiedStandardStart: '6/17/26',
        unifiedStandardEnd: '8/31/26',
        division_obj: ['Sales'],
        filter1: ['United States'],
      },
    },
  ],
}

const pageOnePayload = {
  totalJobs: 12,
  jobSearchResult: [
    {
      response: {
        id: '2314',
        unifiedStandardTitle: 'Software Engineer II',
        unifiedUrlTitle: 'Software-Engineer-II',
        unifiedStandardStart: '7/3/26',
        unifiedStandardEnd: '8/31/26',
        division_obj: ['Product Engineering'],
        filter1: ['India'],
      },
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/aurigo/script.js')
  } catch {
    assert.fail('Expected Aurigo Software Technologies scraper module at ../../scraper/aurigo/script.js')
  }
}

test('Aurigo Software Technologies helpers stay pinned to the verified first-party search shell and jobs API', async () => {
  const aurigo = await loadModule()

  assert.equal(aurigo.SOURCE, 'aurigo')
  assert.equal(aurigo.COMPANY, 'Aurigo Software Technologies')
  assert.equal(aurigo.CAREERS_URL, 'https://careers.aurigo.com/')
  assert.equal(
    aurigo.SEARCH_RESULTS_URL,
    'https://careers.aurigo.com/search/?locale=en_US&previewLink=true&referrerSave=false&searchResultView=LIST',
  )
  assert.equal(aurigo.JOBS_API_URL, 'https://careers.aurigo.com/services/recruiting/v1/jobs')
  assert.equal(aurigo.VERIFIED_ON, '2026-08-01')
  assert.equal(
    aurigo.pageRedirectsToAurigoError('https://careers.aurigo.com/errorpage/?errortype=Exception'),
    true,
  )
  assert.equal(aurigo.hasOfficialCareersSignal(searchShellHtml), true)
  assert.equal(aurigo.extractCsrfToken(searchShellHtml), 'token-123')
  assert.equal(aurigo.extractSearchLocale(searchShellHtml), 'en_US')
  assert.deepEqual(
    aurigo.buildJobsApiRequestPayload({ pageNumber: 1 }),
    {
      keywords: '',
      locale: 'en_US',
      location: '',
      pageNumber: 1,
      sortBy: 'recent',
    },
  )
  assert.equal(aurigo.hasExpectedJobsApiSignal(pageZeroPayload), true)
  assert.deepEqual(aurigo.extractJobsFromApiPayload(pageZeroPayload), [
    {
      title: 'Director of Product',
      company: 'Aurigo Software Technologies',
      department: 'Product Management',
      location: 'India',
      city: null,
      country: 'India',
      jobId: '2207',
      requisitionId: '2207',
      sourceUrl: 'https://careers.aurigo.com/job/Director-of-Product/2207/',
      applyUrl: 'https://careers.aurigo.com/job/Director-of-Product/2207/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-04-03',
      closingDate: '2026-08-28',
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('Aurigo Software Technologies run validates the first-party search shell and paged jobs API', async () => {
  const aurigo = await loadModule()
  const requestedJson = []

  const jobs = await aurigo.createAurigoScraper({ maxPages: 3, maxJobs: 2 }).run({
    fetchText: async (url) => {
      assert.equal(url, aurigo.SEARCH_PAGE_URL)
      return searchShellHtml
    },
    fetchJson: async (url, options = {}) => {
      requestedJson.push({
        url,
        body: JSON.parse(options.body),
        headers: options.headers,
      })

      const pageNumber = JSON.parse(options.body).pageNumber
      if (pageNumber === 0) return pageZeroPayload
      if (pageNumber === 1) return pageOnePayload
      return { totalJobs: 12, jobSearchResult: [] }
    },
    fetchPage: async (url) => ({
      finalUrl: 'https://careers.aurigo.com/errorpage/?errortype=Exception',
      html: `<html><body>Error page for ${url}</body></html>`,
    }),
    now: () => '2026-08-04T00:00:00.000Z',
  })

  assert.deepEqual(
    requestedJson.map((entry) => ({
      url: entry.url,
      pageNumber: entry.body.pageNumber,
      locale: entry.body.locale,
      csrf: entry.headers['X-CSRF-Token'],
    })),
    [
      {
        url: aurigo.JOBS_API_URL,
        pageNumber: 0,
        locale: 'en_US',
        csrf: 'token-123',
      },
      {
        url: aurigo.JOBS_API_URL,
        pageNumber: 1,
        locale: 'en_US',
        csrf: 'token-123',
      },
      {
        url: aurigo.JOBS_API_URL,
        pageNumber: 2,
        locale: 'en_US',
        csrf: 'token-123',
      },
    ],
  )

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'aurigo')
  assert.equal(jobs[0].title, 'Director of Product')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.equal(jobs[1].title, 'Software Engineer II')
  assert.equal(jobs[1].publicExperienceChecked, true)
  assert.equal(jobs[0].scrapedAt, '2026-08-04T00:00:00.000Z')
})

test('Aurigo Software Technologies run fails closed when the verified search shell or jobs API drifts', async () => {
  const aurigo = await loadModule()

  await assert.rejects(
    aurigo.createAurigoScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified aurigo search shell/i,
  )

  await assert.rejects(
    aurigo.createAurigoScraper().run({
      fetchText: async () => searchShellHtml.replace('token-123', ''),
    }),
    /jobs api token/i,
  )

  await assert.rejects(
    aurigo.createAurigoScraper().run({
      fetchText: async () => searchShellHtml,
      fetchJson: async () => ({ totalJobs: 'oops', jobSearchResult: null }),
    }),
    /verified aurigo jobs api/i,
  )
})
