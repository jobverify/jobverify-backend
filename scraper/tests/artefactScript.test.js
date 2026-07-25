import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Artefact is a global data and AI consulting company</title>
    <link rel="canonical" href="https://www.artefact.com/" />
  </head>
  <body>
    <a href="https://www.artefact.com/careers/explore-our-jobs/">Careers</a>
    <a href="https://www.artefact.com/careers/explore-our-jobs/">Explore our Jobs</a>
    <a href="https://www.artefact.com/careers/working-at-artefact/">Working at Artefact</a>
    <p>Artefact is a global leader in data and AI consulting services.</p>
  </body>
</html>
`

const careersPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers: Explore our job offers - Artefact</title>
    <link rel="canonical" href="https://www.artefact.com/careers/explore-our-jobs/" />
  </head>
  <body>
    <h1>Explore our jobs</h1>
    <h2>Join our teams of game-changers in data and marketing</h2>
    <p>Filter by: All Departments Data Analytics Data Engineering South Asia India</p>
    <div class="ds_flex_item">
      <h3 class="ds_h3">Data Analyst</h3>
      <h4 class="ds_h4">Data Analytics</h4>
      <h4 class="ds_h4">Lebanon</h4>
      <div class="ds_secondary_button"><a href="https://www.artefact.com/job/data-analyst/">View Job</a></div>
      <div class="ds_submit"><a href="https://job-boards.greenhouse.io/artefact/jobs/8042693002">Apply Now</a></div>
    </div>
    <div class="ds_flex_item">
      <h3 class="ds_h3">Data Analyst - India (2026)</h3>
      <h4 class="ds_h4">Data Analytics</h4>
      <h4 class="ds_h4">India</h4>
      <div class="ds_secondary_button"><a href="https://www.artefact.com/job/data-analyst-india-2026/">View Job</a></div>
      <div class="ds_submit"><a href="https://job-boards.greenhouse.io/artefact/jobs/8360407002">Apply Now</a></div>
    </div>
    <nav class="pagination">
      <a href="https://www.artefact.com/careers/explore-our-jobs/page/2/">2</a>
    </nav>
  </body>
</html>
`

const careersPage2Html = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers: Explore our job offers - Artefact</title>
    <link rel="canonical" href="https://www.artefact.com/careers/explore-our-jobs/page/2/" />
  </head>
  <body>
    <h1>Explore our jobs</h1>
    <p>Filter by: All Departments Data Analytics Data Engineering South Asia India</p>
    <div class="ds_flex_item">
      <h3>Data Architect</h3>
      <h4>Data Engineering</h4>
      <h4>India</h4>
      <a href="https://www.artefact.com/job/data-architect/">View Job</a>
      <a href="https://job-boards.greenhouse.io/artefact/jobs/7884340002">Apply Now</a>
    </div>
    <div class="ds_flex_item">
      <h3>Consulting Manager</h3>
      <h4>Consulting</h4>
      <h4>Brussels</h4>
      <a href="https://www.artefact.com/job/consulting-manager-brussels/">View Job</a>
      <a href="https://job-boards.greenhouse.io/artefact/jobs/9999999999">Apply Now</a>
    </div>
  </body>
</html>
`

const dataAnalystDetailHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Data Analyst - India (2026) - Artefact</title>
  </head>
  <body>
    <h1>Data Analyst - India (2026)</h1>
    <p>Job Description - Data Analyst</p>
    <p>Artefact is a new generation of data service providers specialising in data consulting and data-driven digital marketing.</p>
    <p>1. What you will be doing?</p>
    <ul>
      <li>Data Analysis: Employing Python and SQL to extract, clean, and analyze data to derive actionable insights.</li>
      <li>Visualization Techniques: Using Tableau, PowerBI, and Web Applications to create intuitive and insightful visual representations of data.</li>
    </ul>
    <p>2. What we are looking for?</p>
    <p>Technical Expertise:</p>
    <ul>
      <li>Proficiency in Python, SQL, and data manipulation for analysis purposes.</li>
      <li>Experience in data visualization tools such as Tableau, PowerBI, and Web Applications.</li>
    </ul>
    <p>Attitude & Soft Skills:</p>
    <ul>
      <li>Excellent communication skills to collaborate effectively within teams and with stakeholders.</li>
    </ul>
    <a href="https://job-boards.greenhouse.io/artefact/jobs/8360407002">APPLY NOW</a>
  </body>
</html>
`

const dataArchitectDetailHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Data Architect - Artefact</title>
  </head>
  <body>
    <h1>Data Architect</h1>
    <h3>Key Responsibilities</h3>
    <ul>
      <li>Design and optimize both logical and physical data models to support enterprise-wide systems.</li>
      <li>Architect data warehousing solutions and oversee the integration of data from multiple sources.</li>
    </ul>
    <h3>Required Qualifications</h3>
    <ul>
      <li>Bachelor’s or Master’s degree in Computer Science, Information Systems, Data Science, or a related field.</li>
      <li>10+ years of experience in data architecture, data engineering, or related roles.</li>
      <li>Expertise in data modeling, data warehousing, and database design.</li>
      <li>Hands-on experience with cloud data platforms and modern data processing frameworks.</li>
    </ul>
    <a href="https://job-boards.greenhouse.io/artefact/jobs/7884340002">APPLY NOW</a>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../artefact/script.js')
  } catch {
    assert.fail('Expected Artefact scraper module at ../artefact/script.js')
  }
}

test('Artefact scraper constants stay pinned to the verified first-party careers pages and India job detail URLs', async () => {
  const artefact = await loadScriptModule()

  assert.equal(artefact.SOURCE, 'artefact')
  assert.equal(artefact.COMPANY, 'Artefact')
  assert.equal(artefact.HOMEPAGE_URL, 'https://www.artefact.com/')
  assert.equal(artefact.CAREERS_URL, 'https://www.artefact.com/careers/')
  assert.equal(artefact.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(artefact.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(artefact.hasOfficialDetailPageSignal(dataAnalystDetailHtml), true)
  assert.equal(artefact.hasOfficialDetailPageSignal(dataArchitectDetailHtml), true)
  assert.deepEqual(artefact.extractPaginationUrls(careersPageHtml), [
    'https://www.artefact.com/careers/explore-our-jobs/page/2/',
  ])
  assert.deepEqual(artefact.extractListingCards(careersPageHtml), [
    {
      title: 'Data Analyst',
      department: 'Data Analytics',
      location: 'Lebanon',
      sourceUrl: 'https://www.artefact.com/job/data-analyst/',
      applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/8042693002',
    },
    {
      title: 'Data Analyst - India (2026)',
      department: 'Data Analytics',
      location: 'India',
      sourceUrl: 'https://www.artefact.com/job/data-analyst-india-2026/',
      applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/8360407002',
    },
  ])
  assert.deepEqual(artefact.filterIndiaListings([
    ...artefact.extractListingCards(careersPageHtml),
    ...artefact.extractListingCards(careersPage2Html),
    {
      title: 'Consulting Manager',
      department: 'Consulting',
      location: 'Brussels',
      sourceUrl: 'https://www.artefact.com/job/consulting-manager-brussels/',
      applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/9999999999',
    },
  ]), [
    {
      title: 'Data Analyst - India (2026)',
      department: 'Data Analytics',
      location: 'India',
      sourceUrl: 'https://www.artefact.com/job/data-analyst-india-2026/',
      applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/8360407002',
    },
    {
      title: 'Data Architect',
      department: 'Data Engineering',
      location: 'India',
      sourceUrl: 'https://www.artefact.com/job/data-architect/',
      applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/7884340002',
    },
  ])
  assert.equal(
    artefact.extractApplyUrlFromDetailPage(dataAnalystDetailHtml),
    'https://job-boards.greenhouse.io/artefact/jobs/8360407002',
  )
  assert.equal(
    artefact.extractApplyUrlFromDetailPage(dataArchitectDetailHtml),
    'https://job-boards.greenhouse.io/artefact/jobs/7884340002',
  )
})

test('Artefact maps first-party India detail pages into normalized jobs', async () => {
  const artefact = await loadScriptModule()

  const analystJob = artefact.extractJobFromDetailPage(dataAnalystDetailHtml, {
    title: 'Data Analyst - India (2026)',
    department: 'Data Analytics',
    location: 'India',
    sourceUrl: 'https://www.artefact.com/job/data-analyst-india-2026/',
    applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/8360407002',
  })

  assert.deepEqual(analystJob, {
    title: 'Data Analyst - India (2026)',
    company: 'Artefact',
    department: 'Data Analytics',
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'artefact-data-analyst-india-2026',
    requisitionId: 'artefact-data-analyst-india-2026',
    sourceUrl: 'https://www.artefact.com/job/data-analyst-india-2026/',
    applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/8360407002',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Data Analysis: Employing Python and SQL to extract, clean, and analyze data to derive actionable insights.',
      'Visualization Techniques: Using Tableau, PowerBI, and Web Applications to create intuitive and insightful visual representations of data.',
      'Proficiency in Python, SQL, and data manipulation for analysis purposes.',
      'Experience in data visualization tools such as Tableau, PowerBI, and Web Applications.',
      'Excellent communication skills to collaborate effectively within teams and with stakeholders.',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Job Description - Data Analyst',
      'Artefact is a new generation of data service providers specialising in data consulting and data-driven digital marketing.',
      '1. What you will be doing?',
      'Data Analysis: Employing Python and SQL to extract, clean, and analyze data to derive actionable insights.',
      'Visualization Techniques: Using Tableau, PowerBI, and Web Applications to create intuitive and insightful visual representations of data.',
      '2. What we are looking for?',
      'Technical Expertise:',
      'Proficiency in Python, SQL, and data manipulation for analysis purposes.',
      'Experience in data visualization tools such as Tableau, PowerBI, and Web Applications.',
      'Attitude & Soft Skills:',
      'Excellent communication skills to collaborate effectively within teams and with stakeholders.',
    ].join('\n'),
  })

  const architectJob = artefact.extractJobFromDetailPage(dataArchitectDetailHtml, {
    title: 'Data Architect',
    department: 'Data Engineering',
    location: 'India',
    sourceUrl: 'https://www.artefact.com/job/data-architect/',
    applyUrl: 'https://job-boards.greenhouse.io/artefact/jobs/7884340002',
  })

  assert.equal(architectJob.title, 'Data Architect')
  assert.equal(architectJob.department, 'Data Engineering')
  assert.equal(architectJob.location, 'India')
  assert.equal(architectJob.country, 'India')
  assert.equal(architectJob.jobId, 'artefact-data-architect')
  assert.equal(architectJob.experienceRequired, '10+ years of experience in data architecture, data engineering, or related roles.')
  assert.equal(
    architectJob.minimumQualification,
    'Bachelor’s or Master’s degree in Computer Science, Information Systems, Data Science, or a related field.',
  )
  assert.deepEqual(architectJob.requiredSkills, [
    'Design and optimize both logical and physical data models to support enterprise-wide systems.',
    'Architect data warehousing solutions and oversee the integration of data from multiple sources.',
    'Expertise in data modeling, data warehousing, and database design.',
    'Hands-on experience with cloud data platforms and modern data processing frameworks.',
  ])
  assert.match(architectJob.jobDescription, /Key Responsibilities/)
  assert.match(architectJob.jobDescription, /Required Qualifications/)
})

test('Artefact run validates the verified first-party careers flow, follows pagination, and deduplicates India jobs', async () => {
  const artefact = await loadScriptModule()
  const requestedUrls = []

  const jobs = await artefact.createArtefactScraper({
    now: () => '2026-07-15T09:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === artefact.HOMEPAGE_URL) return homepageHtml
      if (url === artefact.CAREERS_URL) return careersPageHtml
      if (url === 'https://www.artefact.com/careers/explore-our-jobs/page/2/') return careersPage2Html
      if (url === 'https://www.artefact.com/job/data-analyst-india-2026/') return dataAnalystDetailHtml
      if (url === 'https://www.artefact.com/job/data-architect/') return dataArchitectDetailHtml

      throw new Error(`Unexpected Artefact URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    artefact.HOMEPAGE_URL,
    artefact.CAREERS_URL,
    'https://www.artefact.com/careers/explore-our-jobs/page/2/',
    'https://www.artefact.com/job/data-analyst-india-2026/',
    'https://www.artefact.com/job/data-architect/',
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Data Analyst - India (2026)',
    'Data Architect',
  ])
  assert.deepEqual(jobs.map((job) => job.source), ['artefact', 'artefact'])
  assert.deepEqual(jobs.map((job) => job.link), [
    'https://job-boards.greenhouse.io/artefact/jobs/8360407002',
    'https://job-boards.greenhouse.io/artefact/jobs/7884340002',
  ])
  assert.equal(jobs[0].scrapedAt, '2026-07-15T09:00:00.000Z')
})

test('Artefact fails closed when the verified homepage, careers page, listing cards, or detail pages drift', async () => {
  const artefact = await loadScriptModule()

  await assert.rejects(
    artefact.createArtefactScraper().run({
      fetchText: async (url) => {
        if (url === artefact.HOMEPAGE_URL) return '<html><title>Unexpected</title></html>'
        throw new Error(`Unexpected Artefact URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    artefact.createArtefactScraper().run({
      fetchText: async (url) => {
        if (url === artefact.HOMEPAGE_URL) return homepageHtml
        if (url === artefact.CAREERS_URL) {
          return careersPageHtml.replace(/https:\/\/job-boards\.greenhouse\.io\/artefact\/jobs\/\d+/g, 'https://example.com/apply')
        }
        throw new Error(`Unexpected Artefact URL: ${url}`)
      },
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    artefact.createArtefactScraper().run({
      fetchText: async (url) => {
        if (url === artefact.HOMEPAGE_URL) return homepageHtml
        if (url === artefact.CAREERS_URL) {
          return careersPageHtml.replace('https://www.artefact.com/careers/explore-our-jobs/page/2/', 'https://example.com/page/2/')
        }
        throw new Error(`Unexpected Artefact URL: ${url}`)
      },
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    artefact.createArtefactScraper().run({
      fetchText: async (url) => {
        if (url === artefact.HOMEPAGE_URL) return homepageHtml
        if (url === artefact.CAREERS_URL) return careersPageHtml
        if (url === 'https://www.artefact.com/careers/explore-our-jobs/page/2/') return careersPage2Html
        if (url === 'https://www.artefact.com/job/data-analyst-india-2026/') return '<html><title>Broken</title></html>'
        if (url === 'https://www.artefact.com/job/data-architect/') return dataArchitectDetailHtml
        throw new Error(`Unexpected Artefact URL: ${url}`)
      },
    }),
    /detail page/i,
  )
})
