import assert from 'node:assert/strict'
import test from 'node:test'

const loadHeroMotoCorpModule = async () => {
  try {
    return await import('../../scraper/heromotocorp/script.js')
  } catch {
    assert.fail('Expected Hero MotoCorp scraper module at ../../scraper/heromotocorp/script.js')
  }
}

const officialCareersHtml = `
<html>
  <body>
    <h1>Hero MotoCorp Career Overview</h1>
    <a href="https://jobs.heromotocorp.com/viewalljobs/">View all jobs</a>
  </body>
</html>
`

const viewAllJobsHtml = `
<html>
  <body>
    <a href="/go/RESEARCH-&amp;-DEVELOPMENT/5388301/">RESEARCH &amp; DEVELOPMENT</a>
    <a href="/go/HUMAN-RESOURCES/5388201/">HUMAN RESOURCES</a>
    <a href="/default/go/STRATEGIC-SOURCING-AND-SUPPLY-CHAIN/1240401/">STRATEGIC SOURCING AND SUPPLY CHAIN</a>
    <a href="/go/RESEARCH-&amp;-DEVELOPMENT/5388301/">RESEARCH &amp; DEVELOPMENT</a>
  </body>
</html>
`

const researchCategoryHtml = `
<html>
  <body>
    <span class="paginationLabel">Results 1 – 1 of 1 Page 1 of 1</span>
    <tr class="data-row">
      <td class="colTitle" headers="hdrTitle">
        <span class="jobTitle hidden-phone">
          <a href="/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/" class="jobTitle-link">Digital Sculptor</a>
        </span>
        <div class="jobdetail-phone visible-phone">
          <span class="jobTitle visible-phone">
            <a class="jobTitle-link" href="/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/">Digital Sculptor</a>
          </span>
          <span class="jobLocation visible-phone">
            <span class="jobLocation">Jaipur, RJ, IN, 302028</span>
          </span>
          <span class="jobDate visible-phone">14 Jul 2026</span>
        </div>
      </td>
      <td class="colDepartment hidden-phone" headers="hdrDepartment">
        <span class="jobDepartment">RESEARCH &amp; DEVELOPMENT - JAIPUR</span>
      </td>
      <td class="colLocation hidden-phone" headers="hdrLocation">
        <span class="jobLocation">Jaipur, RJ, IN, 302028</span>
      </td>
      <td class="colDate hidden-phone" nowrap="nowrap" headers="hdrDate">
        <span class="jobDate">14 Jul 2026</span>
      </td>
    </tr>
  </body>
</html>
`

const emptyCategoryHtml = `
<html>
  <body>
    <span class="paginationLabel">Results 0 – 0 of 0 Page 1 of 1</span>
    <p>There are currently no open positions matching this category or location.</p>
  </body>
</html>
`

const detailHtml = `
<html>
  <head>
    <meta itemprop="datePosted" content="Thu Jul 02 00:00:00 UTC 2026" />
    <meta itemprop="validThrough" content="Thu Jul 23 18:30:00 UTC 2026" />
  </head>
  <body>
    <h1 itemprop="title">Digital Sculptor</h1>
    <span itemprop="description">
      <span class="jobdescription">
        <p>Create production-ready digital clay surfaces for upcoming motorcycles and scooters.</p>
        <ul>
          <li>Alias surface development</li>
          <li>Class A surfacing reviews</li>
        </ul>
      </span>
    </span>
    <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/1364277966/?locale=en_GB">Apply now</a>
  </body>
</html>
`

test('extractCategoryUrls keeps Hero MotoCorp category discovery on the official jobs host', async () => {
  const heroMotoCorp = await loadHeroMotoCorpModule()

  assert.equal(
    heroMotoCorp.OFFICIAL_CAREERS_URL,
    'https://www.heromotocorp.com/en-in/company/careers/career-overview.html',
  )
  assert.equal(heroMotoCorp.BASE_URL, 'https://jobs.heromotocorp.com')
  assert.equal(heroMotoCorp.VIEW_ALL_JOBS_URL, 'https://jobs.heromotocorp.com/viewalljobs/')
  assert.equal(
    heroMotoCorp.extractOfficialJobsBoardUrl(officialCareersHtml),
    'https://jobs.heromotocorp.com/viewalljobs/',
  )
  assert.equal(heroMotoCorp.hasOfficialHeroMotoCorpCareersSignals(officialCareersHtml), true)
  assert.deepEqual(heroMotoCorp.extractCategoryUrls(viewAllJobsHtml), [
    'https://jobs.heromotocorp.com/go/RESEARCH-&-DEVELOPMENT/5388301/',
    'https://jobs.heromotocorp.com/go/HUMAN-RESOURCES/5388201/',
    'https://jobs.heromotocorp.com/default/go/STRATEGIC-SOURCING-AND-SUPPLY-CHAIN/1240401/',
  ])
  assert.equal(
    heroMotoCorp.buildCategoryPageUrl('https://jobs.heromotocorp.com/go/HUMAN-RESOURCES/5388201/', 25),
    'https://jobs.heromotocorp.com/go/HUMAN-RESOURCES/5388201/?startrow=25',
  )
})

test('extractSearchResults parses Hero MotoCorp server-rendered category rows', async () => {
  const heroMotoCorp = await loadHeroMotoCorpModule()

  assert.deepEqual(heroMotoCorp.extractResultsSummary(researchCategoryHtml), {
    totalResults: 1,
    currentPage: 1,
    totalPages: 1,
    pageSize: 1,
  })

  assert.deepEqual(heroMotoCorp.extractSearchResults(researchCategoryHtml), [
    {
      title: 'Digital Sculptor',
      department: 'RESEARCH & DEVELOPMENT - JAIPUR',
      location: 'Jaipur, RJ, IN, 302028',
      city: 'Jaipur',
      jobId: '1364277966',
      requisitionId: '1364277966',
      sourceUrl: 'https://jobs.heromotocorp.com/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/',
      postingDate: '14 Jul 2026',
    },
  ])
})

test('extractJobDetail maps Hero MotoCorp public detail metadata and apply handoff', async () => {
  const heroMotoCorp = await loadHeroMotoCorpModule()

  assert.deepEqual(heroMotoCorp.extractJobDetail(detailHtml, {
    title: 'Digital Sculptor',
    department: 'RESEARCH & DEVELOPMENT - JAIPUR',
    location: 'Jaipur, RJ, IN, 302028',
    city: 'Jaipur',
    jobId: '1364277966',
    requisitionId: '1364277966',
    sourceUrl: 'https://jobs.heromotocorp.com/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/',
    postingDate: '02 Jul 2026',
  }), {
    title: 'Digital Sculptor',
    department: 'RESEARCH & DEVELOPMENT - JAIPUR',
    location: 'Jaipur, RJ, IN, 302028',
    city: 'Jaipur',
    jobId: '1364277966',
    requisitionId: '1364277966',
    sourceUrl: 'https://jobs.heromotocorp.com/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Alias surface development', 'Class A surfacing reviews'],
    postingDate: 'Thu Jul 02 00:00:00 UTC 2026',
    closingDate: 'Thu Jul 23 18:30:00 UTC 2026',
    jobDescription: 'Create production-ready digital clay surfaces for upcoming motorcycles and scooters. - Alias surface development - Class A surfacing reviews',
    applyUrl: 'https://jobs.heromotocorp.com/talentcommunity/apply/1364277966/?locale=en_GB',
  })
})

test('run discovers Hero MotoCorp category pages from the official landing page and returns enriched jobs', async () => {
  const { createHeroMotoCorpScraper, VIEW_ALL_JOBS_URL } = await loadHeroMotoCorpModule()
  const requestedUrls = []
  const scraper = createHeroMotoCorpScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === 'https://www.heromotocorp.com/en-in/company/careers/career-overview.html') {
        return officialCareersHtml
      }
      if (url === VIEW_ALL_JOBS_URL) return viewAllJobsHtml
      if (url === 'https://jobs.heromotocorp.com/go/RESEARCH-&-DEVELOPMENT/5388301/') return researchCategoryHtml
      if (url === 'https://jobs.heromotocorp.com/go/HUMAN-RESOURCES/5388201/') return emptyCategoryHtml
      if (url === 'https://jobs.heromotocorp.com/default/go/STRATEGIC-SOURCING-AND-SUPPLY-CHAIN/1240401/') return emptyCategoryHtml
      if (url === 'https://jobs.heromotocorp.com/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/') return detailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-16T18:30:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.heromotocorp.com/en-in/company/careers/career-overview.html',
    'https://jobs.heromotocorp.com/viewalljobs/',
    'https://jobs.heromotocorp.com/go/RESEARCH-&-DEVELOPMENT/5388301/',
    'https://jobs.heromotocorp.com/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/',
    'https://jobs.heromotocorp.com/go/HUMAN-RESOURCES/5388201/',
    'https://jobs.heromotocorp.com/default/go/STRATEGIC-SOURCING-AND-SUPPLY-CHAIN/1240401/',
  ])
  assert.deepEqual(jobs, [
    {
      jobId: '1364277966',
      requisitionId: '1364277966',
      title: 'Digital Sculptor',
      company: 'Hero MotoCorp',
      department: 'RESEARCH & DEVELOPMENT - JAIPUR',
      location: 'Jaipur, RJ, IN, 302028',
      city: 'Jaipur',
      link: 'https://jobs.heromotocorp.com/talentcommunity/apply/1364277966/?locale=en_GB',
      applyUrl: 'https://jobs.heromotocorp.com/talentcommunity/apply/1364277966/?locale=en_GB',
      sourceUrl: 'https://jobs.heromotocorp.com/job/Jaipur-Digital-Sculptor-RJ-302028/1364277966/',
      source: 'heromotocorp',
      employmentType: 'Full-time',
      experienceRequired: null,
      jobDescription: 'Create production-ready digital clay surfaces for upcoming motorcycles and scooters. - Alias surface development - Class A surfacing reviews',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Alias surface development', 'Class A surfacing reviews'],
      postingDate: 'Thu Jul 02 00:00:00 UTC 2026',
      closingDate: 'Thu Jul 23 18:30:00 UTC 2026',
      scrapedAt: '2026-07-16T18:30:00.000Z',
    },
  ])
})

test('run fails closed when the verified Hero MotoCorp careers overview no longer points to the first-party jobs board', async () => {
  const { createHeroMotoCorpScraper } = await loadHeroMotoCorpModule()
  const scraper = createHeroMotoCorpScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === 'https://www.heromotocorp.com/en-in/company/careers/career-overview.html') {
          return '<html><body><h1>Careers</h1><a href="/join-us">Apply</a></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /hero motocorp verified official careers page no longer matches/i,
  )
})
