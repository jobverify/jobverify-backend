import assert from 'node:assert/strict'
import test from 'node:test'

const loadSapiensModule = async () => {
  try {
    return await import('../../scraper/sapiens/script.js')
  } catch {
    assert.fail('Expected Sapiens scraper module at ../../scraper/sapiens/script.js')
  }
}

const searchPageHtml = `
<div class="searchResultsShell">
  <table id="searchresults" class="searchResults full table table-striped table-hover" aria-label="Search results for . Page 1 of 6, Results 1 to 15 of 90">
    <tbody>
      <tr class="data-row">
        <td class="colTitle" headers="hdrTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Bangalore-L3-Architect/1413083733/" class="jobTitle-link">L3 Architect</a>
          </span>
        </td>
        <td class="colFacility hidden-phone" headers="hdrFacility">
          <span class="jobFacility">56618</span>
        </td>
        <td class="colLocation hidden-phone" headers="hdrLocation">
          <span class="jobLocation">Bangalore, IN</span>
        </td>
      </tr>
      <tr class="data-row">
        <td class="colTitle" headers="hdrTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/London-Business-Consultant/1402831533/" class="jobTitle-link">Business Consultant</a>
          </span>
        </td>
        <td class="colFacility hidden-phone" headers="hdrFacility">
          <span class="jobFacility">56538</span>
        </td>
        <td class="colLocation hidden-phone" headers="hdrLocation">
          <span class="jobLocation">London, GB</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
`

const detailPageHtml = `
<html>
  <head>
    <title>L3 Architect Job Details | SAPIENS</title>
    <meta itemprop="datePosted" content="Thu Jul 09 00:00:00 UTC 2026" />
  </head>
  <body>
    <h1>L3 Architect</h1>
    <p id="job-location">
      <span class="jobGeoLocation">Bangalore, IN</span>
    </p>
    <span data-careersite-propertyid="facility">56618</span>
    <div class="jobdescription">
      <p>Lead architecture for insurance platform modernization.</p>
      <ul>
        <li>Design scalable systems</li>
        <li>Partner with engineering teams</li>
      </ul>
    </div>
    <script type="text/javascript">
      j2w.Apply.init({
        jobID                    : 1413083733,
        sourceId                 : 'JATS-SapiensPRD',
        locale                   : 'en_US'
      });
    </script>
  </body>
</html>
`

test('buildSearchUrl keeps Sapiens requests on the official public SuccessFactors search route', async () => {
  const {
    SEARCH_PAGE_URL,
    buildSearchUrl,
  } = await loadSapiensModule()

  assert.equal(
    SEARCH_PAGE_URL,
    'https://careers.sapiens.com/search/?createNewAlert=false&q=&locationsearch=',
  )
  assert.equal(
    buildSearchUrl(),
    'https://careers.sapiens.com/search/?createNewAlert=false&q=&locationsearch=',
  )
  assert.equal(
    buildSearchUrl({ startRow: 15 }),
    'https://careers.sapiens.com/search/?createNewAlert=false&q=&locationsearch=&startrow=15',
  )
})

test('extractSearchResults keeps only India rows from the official Sapiens search table', async () => {
  const { extractSearchResults } = await loadSapiensModule()

  assert.deepEqual(extractSearchResults(searchPageHtml), [{
    title: 'L3 Architect',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '56618',
    requisitionId: '56618',
    sourceUrl: 'https://careers.sapiens.com/job/Bangalore-L3-Architect/1413083733/',
    detailJobId: '1413083733',
  }])
})

test('extractPaginationSummary reads Sapiens result counts from the public search page', async () => {
  const { extractPaginationSummary } = await loadSapiensModule()

  assert.deepEqual(extractPaginationSummary(searchPageHtml), {
    currentPage: 1,
    totalPages: 6,
    totalJobCount: 90,
    pageSize: 15,
  })
})

test('extractJobDetail builds the public Sapiens apply handoff from the detail job id', async () => {
  const {
    buildApplyUrl,
    extractJobDetail,
  } = await loadSapiensModule()

  assert.equal(
    buildApplyUrl('1413083733'),
    'https://careers.sapiens.com/talentcommunity/apply/1413083733/?locale=en_US',
  )

  assert.deepEqual(
    extractJobDetail(detailPageHtml, {
      title: 'L3 Architect',
      location: 'Bangalore, India',
      city: 'Bangalore',
      jobId: '56618',
      requisitionId: '56618',
      sourceUrl: 'https://careers.sapiens.com/job/Bangalore-L3-Architect/1413083733/',
      detailJobId: '1413083733',
    }),
    {
      title: 'L3 Architect',
      location: 'Bangalore, India',
      city: 'Bangalore',
      jobId: '56618',
      requisitionId: '56618',
      employmentType: null,
      experienceRequired: null,
      jobDescription:
        'Lead architecture for insurance platform modernization. Design scalable systems Partner with engineering teams',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Design scalable systems',
        'Partner with engineering teams',
      ],
      postingDate: '2026-07-09',
      closingDate: null,
      applyUrl: 'https://careers.sapiens.com/talentcommunity/apply/1413083733/?locale=en_US',
      sourceUrl: 'https://careers.sapiens.com/job/Bangalore-L3-Architect/1413083733/',
      department: null,
    },
  )
})

test('run fetches the official Sapiens listing page first, then enriches India results via detail pages', async () => {
  const {
    SEARCH_PAGE_URL,
    createSapiensScraper,
  } = await loadSapiensModule()

  const requests = []
  const jobs = await createSapiensScraper().run({
    maxPages: 1,
    fetchText: async (url) => {
      requests.push(url)
      if (url === SEARCH_PAGE_URL) return searchPageHtml
      if (url === 'https://careers.sapiens.com/job/Bangalore-L3-Architect/1413083733/') {
        return detailPageHtml
      }

      throw new Error(`Unexpected Sapiens URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requests, [
    SEARCH_PAGE_URL,
    'https://careers.sapiens.com/job/Bangalore-L3-Architect/1413083733/',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Sapiens')
  assert.equal(jobs[0].source, 'sapiens')
  assert.equal(jobs[0].jobId, '56618')
  assert.equal(
    jobs[0].applyUrl,
    'https://careers.sapiens.com/talentcommunity/apply/1413083733/?locale=en_US',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-10T00:00:00.000Z')
})
