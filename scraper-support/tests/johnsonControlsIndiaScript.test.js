import assert from 'node:assert/strict'
import test from 'node:test'

const officialSearchHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Search - Johnson Controls Careers</title>
  </head>
  <body>
    <div id="searchbox"></div>
    <a id="clear-refinements" href="https://jobs.johnsoncontrols.com/job-search">Reset filters</a>
    <script src="https://cdn.jsdelivr.net/npm/algoliasearch/dist/algoliasearch-lite.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/instantsearch.js/dist/instantsearch.production.min.js"></script>
    <a href="/job-search?production_JCI_jobs%5BrefinementList%5D%5Blocations_list%5D%5B0%5D=Asia%20and%20Pacific">Asia-Pacific</a>
    <a href="/job-search?production_JCI_jobs%5BrefinementList%5D%5Bparent_category%5D%5B0%5D=Engineering">Engineering</a>
  </body>
</html>
`

const pageZeroPayload = {
  results: [
    {
      hits: [
        {
          id: 560575,
          objectID: 'Job::560575',
          external_id: 'WD30274611',
          title: 'Technical Lead II',
          location: ['India, Mahārāshtra, Pune'],
          locations_list: ['Pune, Mahārāshtra, India', 'India', 'Mahārāshtra, India'],
          country: ['India'],
          geo_city: ['Pune'],
          posted_date: ['2026-07-16'],
          employee_type: ['Full-Time'],
          parent_category: ['Engineering'],
          job_family_group: ['Engineering'],
          job_requisition_id: ['WD30274611'],
          application_url: [
            'https://apply.johnsoncontrols.com/johnson-controls/apply/job_requisition_id/WD30274611',
          ],
          description: [
            '<p>Lead hardware product development for fire detection systems.</p>',
          ],
        },
        {
          id: 560500,
          objectID: 'Job::560500',
          external_id: 'WD30273559',
          title: 'HR ServiceNow Developer',
          location: ['India, Mahārāshtra, Pune'],
          locations_list: ['Pune, Mahārāshtra, India', 'India', 'Mahārāshtra, India'],
          country: ['India'],
          geo_city: ['Pune'],
          posted_date: ['2026-07-16'],
          employee_type: ['Full-Time'],
          parent_category: ['Other'],
          job_family_group: ['Human Resources'],
          job_requisition_id: ['WD30273559'],
          application_url: [
            'https://apply.johnsoncontrols.com/johnson-controls/apply/job_requisition_id/WD30273559',
          ],
          description: [
            '<p>Support ServiceNow operations for HR teams.</p>',
          ],
        },
      ],
      nbPages: 2,
      page: 0,
    },
  ],
}

const pageOnePayload = {
  results: [
    {
      hits: [
        {
          id: 560327,
          objectID: 'Job::560327',
          external_id: 'WD30274210',
          title: 'Projects & Documentation Coordinator',
          location: ['India, Mahārāshtra, Pune'],
          locations_list: ['Pune, Mahārāshtra, India', 'India', 'Mahārāshtra, India'],
          country: ['India'],
          geo_city: ['Pune'],
          posted_date: ['2026-07-15'],
          employee_type: ['Full-Time'],
          parent_category: ['Other'],
          job_family_group: ['Field Operations'],
          job_requisition_id: ['WD30274210'],
          application_url: [
            'https://apply.johnsoncontrols.com/johnson-controls/apply/job_requisition_id/WD30274210',
          ],
          description: [
            '<p>Coordinate documentation, logistics and purchasing for projects.</p>',
          ],
        },
      ],
      nbPages: 2,
      page: 1,
    },
  ],
}

const technicalLeadDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Technical Lead II - Johnson Controls Careers</title>
    <meta
      name="description"
      content="Lead hardware product development for fire detection systems. Requires 6 years of experience leading embedded product teams."
    />
  </head>
  <body>
    <main>
      <h1>Technical Lead II</h1>
      <section>
        <h2>Job Description</h2>
        <p>Lead hardware product development for fire detection systems.</p>
        <p>Requires 6 years of experience leading embedded product teams.</p>
      </section>
    </main>
  </body>
</html>
`

const hrServiceNowDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>HR ServiceNow Developer - Johnson Controls Careers</title>
    <meta
      name="description"
      content="Support ServiceNow operations for HR teams by managing workflows, integrations, and reporting."
    />
  </head>
  <body>
    <main>
      <h1>HR ServiceNow Developer</h1>
      <section>
        <h2>What you will do</h2>
        <p>Support ServiceNow operations for HR teams by managing workflows, integrations, and reporting.</p>
        <p>Partner with stakeholders to improve case management, automate recurring processes, and maintain platform quality.</p>
      </section>
    </main>
  </body>
</html>
`

const coordinatorDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Projects &amp; Documentation Coordinator - Johnson Controls Careers</title>
    <meta
      name="description"
      content="Coordinate documentation, logistics and purchasing for projects. 2-4 years of experience in project coordination is preferred."
    />
  </head>
  <body>
    <main>
      <h1>Projects &amp; Documentation Coordinator</h1>
      <section>
        <h2>Job Description</h2>
        <p>Coordinate documentation, logistics and purchasing for projects.</p>
        <p>2-4 years of experience in project coordination is preferred.</p>
      </section>
    </main>
  </body>
</html>
`

const loadJohnsonControlsIndiaModule = async () => {
  try {
    return await import('../../scraper/johnsoncontrolsindia/script.js')
  } catch {
    assert.fail('Expected Johnson Controls India scraper module at ../../scraper/johnsoncontrolsindia/script.js')
  }
}

test('Johnson Controls India scraper pins the verified official search page and Algolia query contract', async () => {
  const johnsonControlsIndia = await loadJohnsonControlsIndiaModule()

  assert.equal(
    johnsonControlsIndia.CAREERS_URL,
    'https://jobs.johnsoncontrols.com/job-search?production_JCI_jobs%5BrefinementList%5D%5Blocations_list%5D%5B0%5D=India',
  )
  assert.equal(
    johnsonControlsIndia.ALGOLIA_SEARCH_URL,
    'https://um59dwrpa1-dsn.algolia.net/1/indexes/*/queries',
  )
  assert.equal(johnsonControlsIndia.ALGOLIA_APPLICATION_ID, 'UM59DWRPA1')
  assert.equal(johnsonControlsIndia.ALGOLIA_API_KEY, '28f2dc2a092d52003624307b16ed44a5')
  assert.equal(johnsonControlsIndia.ALGOLIA_INDEX_NAME, 'production_JCI_jobs')
  assert.equal(johnsonControlsIndia.hasOfficialSearchPageSignal(officialSearchHtml), true)

  const requestBody = johnsonControlsIndia.buildAlgoliaSearchRequestBody({ page: 1 })
  assert.equal(Array.isArray(requestBody.requests), true)
  assert.equal(requestBody.requests[0].indexName, 'production_JCI_jobs')
  assert.match(requestBody.requests[0].params, /locations_list%3AIndia/)
  assert.match(requestBody.requests[0].params, /page=1/)
})

test('Johnson Controls India extracts verified India jobs from the Algolia search payload', async () => {
  const johnsonControlsIndia = await loadJohnsonControlsIndiaModule()
  const jobs = johnsonControlsIndia.extractJohnsonControlsIndiaJobsFromAlgoliaPayload(
    pageZeroPayload,
    { scrapedAt: '2026-07-16T00:00:00.000Z' },
  )

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      country: job.country,
      link: job.link,
      applyUrl: job.applyUrl,
      department: job.department,
      remoteStatus: job.remoteStatus,
    })),
    [
      {
        title: 'Technical Lead II',
        location: 'India, Mahārāshtra, Pune',
        city: 'Pune',
        country: 'India',
        link: 'https://jobs.johnsoncontrols.com/job/WD30274611',
        applyUrl: 'https://apply.johnsoncontrols.com/johnson-controls/apply/job_requisition_id/WD30274611',
        department: 'Engineering',
        remoteStatus: 'On-site',
      },
      {
        title: 'HR ServiceNow Developer',
        location: 'India, Mahārāshtra, Pune',
        city: 'Pune',
        country: 'India',
        link: 'https://jobs.johnsoncontrols.com/job/WD30273559',
        applyUrl: 'https://apply.johnsoncontrols.com/johnson-controls/apply/job_requisition_id/WD30273559',
        department: 'Other',
        remoteStatus: 'On-site',
      },
    ],
  )
  assert.equal(jobs[0].source, 'johnsoncontrolsindia')
  assert.match(jobs[0].jobDescription, /fire detection systems/i)
})

test('Johnson Controls India run validates the official search page and paginates the verified Algolia index', async () => {
  const johnsonControlsIndia = await loadJohnsonControlsIndiaModule()
  const requestedText = []
  const requestedJson = []

  const jobs = await johnsonControlsIndia.createJohnsonControlsIndiaScraper().run({
    fetchText: async (url) => {
      requestedText.push(url)
      if (url === johnsonControlsIndia.CAREERS_URL) return officialSearchHtml
      if (url === 'https://jobs.johnsoncontrols.com/job/WD30274611') return technicalLeadDetailHtml
      if (url === 'https://jobs.johnsoncontrols.com/job/WD30273559') return hrServiceNowDetailHtml
      if (url === 'https://jobs.johnsoncontrols.com/job/WD30274210') return coordinatorDetailHtml
      throw new Error(`Unexpected Johnson Controls India fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      const body = JSON.parse(options.body)
      const params = new URLSearchParams(body.requests[0].params)
      const page = Number(params.get('page') || '0')

      requestedJson.push({
        url,
        method: options.method,
        page,
        indexName: body.requests[0].indexName,
      })

      if (page === 0) return pageZeroPayload
      if (page === 1) return pageOnePayload

      throw new Error(`Unexpected Johnson Controls India page ${page}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requestedText, [
    johnsonControlsIndia.CAREERS_URL,
    'https://jobs.johnsoncontrols.com/job/WD30274611',
    'https://jobs.johnsoncontrols.com/job/WD30273559',
    'https://jobs.johnsoncontrols.com/job/WD30274210',
  ])
  assert.deepEqual(requestedJson, [
    {
      url: 'https://um59dwrpa1-dsn.algolia.net/1/indexes/*/queries',
      method: 'POST',
      page: 0,
      indexName: 'production_JCI_jobs',
    },
    {
      url: 'https://um59dwrpa1-dsn.algolia.net/1/indexes/*/queries',
      method: 'POST',
      page: 1,
      indexName: 'production_JCI_jobs',
    },
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].experienceRequired, '6 years')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.equal(jobs[1].experienceRequired, null)
  assert.equal(jobs[1].publicExperienceChecked, true)
  assert.equal(jobs[2].title, 'Projects & Documentation Coordinator')
  assert.equal(jobs[2].experienceRequired, '2-4 years')
  assert.equal(jobs[2].source, 'johnsoncontrolsindia')
})

test('Johnson Controls India fails closed when the verified search page or Algolia payload drifts materially', async () => {
  const johnsonControlsIndia = await loadJohnsonControlsIndiaModule()

  await assert.rejects(
    johnsonControlsIndia.createJohnsonControlsIndiaScraper().run({
      fetchText: async () => officialSearchHtml.replace('Reset filters', 'Clear selections'),
      fetchJson: async () => pageZeroPayload,
    }),
    /verified official job search surface/i,
  )

  await assert.rejects(
    johnsonControlsIndia.createJohnsonControlsIndiaScraper().run({
      fetchText: async () => officialSearchHtml,
      fetchJson: async () => ({ results: [{ hits: null, nbPages: 1, page: 0 }] }),
    }),
    /Algolia payload/i,
  )
})
