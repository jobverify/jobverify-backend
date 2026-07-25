import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected NTT Data Services scraper module at ./script.js')
  }
}

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Dare to redefine tomorrow</title>
    <link rel="canonical" href="https://www.nttdata.com/en-us">
  </head>
  <body>
    <a aria-label="Go to homepage" href="/en-us/">
      <img alt="NTT DATA Logo" src="/logo.svg">
    </a>
    <nav>
      <a href="/en-us/careers">Careers</a>
    </nav>
  </body>
</html>
`

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Accelerate your career</title>
  </head>
  <body>
    <main>
      <h1>Accelerate your career</h1>
      <h2>Career Opportunities</h2>
      <a href="https://careers.services.global.ntt/global/en/search-results">All jobs</a>
      <a href="https://careers.services.global.ntt/global/en">Experienced Professionals</a>
    </main>
  </body>
</html>
`

const officialJobsHomeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>NTT DATA Careers</title>
  </head>
  <body>
    <script>
      var phApp = phApp || {"widgetApiEndpoint":"https://careers.services.global.ntt/widgets"};
      phApp.pageName = "home";
    </script>
    <main>
      <a href="/global/en/c/sales-and-presales-jobs">Sales jobs</a>
      <a href="/global/en/c/consulting-and-advisory-services-jobs">Consulting jobs</a>
      <a href="https://nttglobaldatacenters.wd501.myworkdayjobs.com/External">Data center jobs</a>
      <p>To report a suspected recruiting scam, contact global.careers@nttdata.com.</p>
    </main>
  </body>
</html>
`

const buildSearchResultsHtml = (jobs) => `
<!doctype html>
<html lang="en">
  <head>
    <title>Search results | Find the available job openings at NTT Data</title>
  </head>
  <body>
    <script>
      var phApp = phApp || {"widgetApiEndpoint":"https://careers.services.global.ntt/widgets","pageName":"search-results"};
      phApp.ddo = ${JSON.stringify({
        eagerLoadRefineSearch: {
          totalHits: jobs.length,
          hits: jobs.length,
          data: {
            jobs,
            aggregations: [
              {
                field: 'country',
                value: {
                  India: 1,
                  'United States': 1,
                },
              },
            ],
          },
        },
      })};
    </script>
  </body>
</html>
`

const buildJobDetailHtml = (sourceUrl) => `
<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="${sourceUrl}">
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'http://schema.org',
      '@type': 'JobPosting',
      title: 'SASE ENGINEER ',
      datePosted: '2025-08-12',
      description:
        '<p>Secure the platform for enterprise clients.</p><p>Bachelor of Engineering or equivalent degree.</p>',
      employmentType: ['FULL_TIME'],
      occupationalCategory: 'Information Security',
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Noida',
          addressRegion: 'Uttar Pradesh',
          addressCountry: 'India',
        },
      },
      hiringOrganization: {
        '@type': 'Organization',
        name: 'NTT Data',
        url: sourceUrl,
      },
    })}</script>
  </head>
  <body>
    <script>
      var phApp = phApp || {};
      phApp.ddo = ${JSON.stringify({
        jobDetail: {
          data: {
            job: {
              jobId: 'P-100131',
              reqId: 'P-100131',
              title: 'SASE ENGINEER ',
              city: 'Noida',
              location: 'Noida, Uttar Pradesh, India',
              ml_country: 'India',
              category: 'Information Security',
              ml_Description:
                '<p>Secure the platform for enterprise clients.</p><p>Bachelor of Engineering or equivalent degree.</p>',
              experience_sentences: ['5+ years of experience in security operations.'],
              education_sentences: ['Bachelor of Engineering or equivalent degree.'],
              skills_sentences: ['Palo Alto Firewall', 'SASE'],
              job_type_fields: {
                job_type: 'Full-Time',
              },
              postedDate: '2025-08-12',
              applyUrl: `${sourceUrl}/apply`,
            },
          },
        },
      })};
    </script>
  </body>
</html>
`

test('NTT Data Services scraper exposes the verified first-party surfaces and Phenom URL builders', async () => {
  const ntt = await loadModule()

  assert.equal(ntt.SOURCE, 'nttdataservices')
  assert.equal(ntt.COMPANY, 'NTT Data Services')
  assert.equal(ntt.HOMEPAGE_URL, 'https://www.nttdata.com/en-us')
  assert.equal(ntt.CAREERS_URL, 'https://www.nttdata.com/en-us/careers')
  assert.equal(ntt.JOBS_HOME_URL, 'https://careers.services.global.ntt/global/en')
  assert.equal(
    ntt.SEARCH_RESULTS_URL,
    'https://careers.services.global.ntt/global/en/search-results',
  )
  assert.equal(ntt.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(ntt.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(ntt.hasOfficialJobsHomeSignal(officialJobsHomeHtml), true)
  assert.equal(
    ntt.hasOfficialSearchResultsSignal(buildSearchResultsHtml([])),
    true,
  )
  assert.equal(
    ntt.buildSearchResultsPageUrl(),
    'https://careers.services.global.ntt/global/en/search-results',
  )
  assert.equal(
    ntt.buildSearchResultsPageUrl(20),
    'https://careers.services.global.ntt/global/en/search-results?from=20',
  )
  assert.equal(
    ntt.buildJobDetailUrl({ reqId: 'P-100131', title: 'SASE ENGINEER ' }),
    'https://careers.services.global.ntt/global/en/job/P-100131/SASE-ENGINEER',
  )
})

test('NTT Data Services scraper verifies the official surfaces and returns India jobs from the public Phenom board', async () => {
  const ntt = await loadModule()
  const requestedUrls = []
  const searchResultsUrl = ntt.SEARCH_RESULTS_URL
  const detailUrl =
    'https://careers.services.global.ntt/global/en/job/P-100131/SASE-ENGINEER'

  const jobs = await ntt.createNttDataServicesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === ntt.HOMEPAGE_URL) return officialHomepageHtml
      if (url === ntt.CAREERS_URL) return officialCareersHtml
      if (url === ntt.JOBS_HOME_URL) return officialJobsHomeHtml
      if (url === searchResultsUrl) {
        return buildSearchResultsHtml([
          {
            reqId: 'P-100131',
            jobId: 'P-100131',
            title: 'SASE ENGINEER ',
            cityStateCountry: 'Noida, Uttar Pradesh, India',
            country: 'India',
            category: 'Information Security',
            type: 'Full-Time',
            postedDate: '2025-08-12',
            experience: '5+ years of experience in security operations.',
            ml_skills: ['Palo Alto Firewall', 'SASE'],
          },
          {
            reqId: 'US-001',
            jobId: 'US-001',
            title: 'Cloud Architect',
            cityStateCountry: 'Plano, Texas, United States',
            country: 'United States',
            category: 'Technical Engineering',
            type: 'Full-Time',
          },
        ])
      }
      if (url === detailUrl) return buildJobDetailHtml(detailUrl)
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ntt.HOMEPAGE_URL,
    ntt.CAREERS_URL,
    ntt.JOBS_HOME_URL,
    searchResultsUrl,
    detailUrl,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'NTT Data Services')
  assert.equal(jobs[0].source, 'nttdataservices')
  assert.equal(jobs[0].jobId, 'P-100131')
  assert.equal(jobs[0].requisitionId, 'P-100131')
  assert.equal(jobs[0].title, 'SASE ENGINEER')
  assert.equal(jobs[0].city, 'Noida')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].postingDate, '2025-08-12')
  assert.equal(
    jobs[0].applyUrl,
    'https://careers.services.global.ntt/global/en/job/P-100131/SASE-ENGINEER/apply',
  )
  assert.equal(jobs[0].sourceUrl, detailUrl)
  assert.equal(
    jobs[0].minimumQualification,
    'Bachelor of Engineering or equivalent degree.',
  )
  assert.deepEqual(jobs[0].requiredSkills, ['Palo Alto Firewall', 'SASE'])
  assert.match(jobs[0].jobDescription, /Secure the platform/i)
  assert.match(jobs[0].experienceRequired, /5\+ years of experience/i)
  assert.ok(jobs[0].scrapedAt)
})

test('NTT Data Services scraper fails closed when a verified first-party surface changes', async () => {
  const ntt = await loadModule()

  await assert.rejects(
    ntt.createNttDataServicesScraper().run({
      fetchText: async (url) => {
        if (url === ntt.HOMEPAGE_URL) {
          return '<html><body><h1>Welcome</h1></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official careers handoff/i,
  )

  await assert.rejects(
    ntt.createNttDataServicesScraper().run({
      fetchText: async (url) => {
        if (url === ntt.HOMEPAGE_URL) return officialHomepageHtml
        if (url === ntt.CAREERS_URL) return officialCareersHtml
        if (url === ntt.JOBS_HOME_URL) return officialJobsHomeHtml
        if (url === ntt.SEARCH_RESULTS_URL) {
          return '<html><head><title>Jobs</title></head><body>No verified board</body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified first-party public jobs surface/i,
  )
})
