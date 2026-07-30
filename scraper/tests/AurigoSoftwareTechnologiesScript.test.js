import assert from 'node:assert/strict'
import test from 'node:test'

const searchPageOneHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aurigo Software Technologies Jobs</title>
  </head>
  <body>
    <h1 class="keyword-title">Search results for<span class="securitySearchQuery"> "".</span></h1>
    <div class="pagination-label-row">
      <span class="paginationLabel" aria-label="Results 1 – 5">Results <b>1 – 5</b> of <b>6</b></span>
      <span class="srHelp">Page 1 of 2</span>
    </div>
    <ul class="pagination">
      <li class="active"><a href="?q=&amp;sortColumn=referencedate&amp;sortDirection=desc" class="current-page">1</a></li>
      <li><a href="?q=&amp;sortColumn=referencedate&amp;sortDirection=desc&amp;startrow=5" title="Page 2">2</a></li>
    </ul>
    <table id="searchresults" class="searchResults full table table-striped table-hover">
      <tr class="data-row">
        <td class="colTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Manager-Legal/1/" class="jobTitle-link">Manager - Legal</a>
          </span>
        </td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Nov 25, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Software-Engineer-II/2/" class="jobTitle-link">Software Engineer II</a>
          </span>
        </td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Nov 13, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Information-Developer-II/3/" class="jobTitle-link">Information Developer II</a>
          </span>
        </td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Nov 11, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Sales-Engineer/4/" class="jobTitle-link">Sales Engineer</a>
          </span>
        </td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> US </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Nov 7, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle">
          <span class="jobTitle hidden-phone">
            <a href="/job/Information-Developer-II-2/5/" class="jobTitle-link">Information Developer - II</a>
          </span>
        </td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Nov 6, 2025 </span></td>
      </tr>
    </table>
  </body>
</html>
`

const searchPageTwoHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aurigo Software Technologies Jobs</title>
  </head>
  <body>
    <h1 class="keyword-title">Search results for<span class="securitySearchQuery"> "".</span></h1>
    <div class="pagination-label-row">
      <span class="paginationLabel" aria-label="Results 6 – 10">Results <b>6 – 10</b> of <b>23</b></span>
      <span class="srHelp">Page 2 of 5</span>
    </div>
    <table id="searchresults" class="searchResults full table table-striped table-hover">
      <tr class="data-row">
        <td class="colTitle"><span class="jobTitle hidden-phone"><a href="/job/Senior-Manager-Product-Operations/6/" class="jobTitle-link">Senior Manager - Product Operations</a></span></td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Jul 19, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle"><span class="jobTitle hidden-phone"><a href="/job/Senior-Specialist-Content-and-Design/7/" class="jobTitle-link">Senior Specialist - Content and Design</a></span></td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Jul 17, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle"><span class="jobTitle hidden-phone"><a href="/job/Senior-Software-Engineer-I-DevOps/8/" class="jobTitle-link">Senior Software Engineer I - DevOps</a></span></td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Jul 16, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle"><span class="jobTitle hidden-phone"><a href="/job/Administrator-I-Enterprise-IT/9/" class="jobTitle-link">Administrator I - Enterprise IT</a></span></td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Jul 16, 2025 </span></td>
      </tr>
      <tr class="data-row">
        <td class="colTitle"><span class="jobTitle hidden-phone"><a href="/job/Product-Manager-Reporting-Data-Analytics/10/" class="jobTitle-link">Product Manager - Reporting & Data Analytics</a></span></td>
        <td class="colLocation hidden-phone"><span class="jobLocation"> IN </span></td>
        <td class="colDate hidden-phone"><span class="jobDate">Jul 15, 2025 </span></td>
      </tr>
    </table>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../aurigo/script.js')
  } catch {
    assert.fail('Expected Aurigo Software Technologies scraper module at ../aurigo/script.js')
  }
}

test('Aurigo Software Technologies helpers stay pinned to the verified first-party jobs search pages', async () => {
  const aurigo = await loadModule()

  assert.equal(aurigo.SOURCE, 'aurigo')
  assert.equal(aurigo.COMPANY, 'Aurigo Software Technologies')
  assert.equal(aurigo.CAREERS_URL, 'https://careers.aurigo.com/')
  assert.equal(
    aurigo.SEARCH_RESULTS_URL,
    'https://careers.aurigo.com/search/?createNewAlert=false&locationsearch=&q=',
  )
  assert.equal(aurigo.VERIFIED_ON, '2026-07-17')
  assert.equal(aurigo.hasOfficialCareersSignal(searchPageOneHtml), true)
  assert.equal(aurigo.hasOfficialCareersSignal('<html><body><h1>Search results</h1></body></html>'), false)
  assert.equal(
    aurigo.extractNextPageUrl(searchPageOneHtml),
    'https://careers.aurigo.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=5',
  )
  assert.deepEqual(aurigo.extractJobs(searchPageOneHtml), [
    {
      title: 'Manager - Legal',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'manager-legal-1',
      requisitionId: 'manager-legal-1',
      sourceUrl: 'https://careers.aurigo.com/job/Manager-Legal/1/',
      applyUrl: 'https://careers.aurigo.com/job/Manager-Legal/1/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-25',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Software Engineer II',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'software-engineer-ii-2',
      requisitionId: 'software-engineer-ii-2',
      sourceUrl: 'https://careers.aurigo.com/job/Software-Engineer-II/2/',
      applyUrl: 'https://careers.aurigo.com/job/Software-Engineer-II/2/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-13',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Information Developer II',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'information-developer-ii-3',
      requisitionId: 'information-developer-ii-3',
      sourceUrl: 'https://careers.aurigo.com/job/Information-Developer-II/3/',
      applyUrl: 'https://careers.aurigo.com/job/Information-Developer-II/3/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-11',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Information Developer - II',
      company: 'Aurigo Software Technologies',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'information-developer-ii-2-5',
      requisitionId: 'information-developer-ii-2-5',
      sourceUrl: 'https://careers.aurigo.com/job/Information-Developer-II-2/5/',
      applyUrl: 'https://careers.aurigo.com/job/Information-Developer-II-2/5/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-11-06',
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('Aurigo Software Technologies run validates the verified search pages and decorates India jobs only', async () => {
  const aurigo = await loadModule()
  const requestedUrls = []

  const jobs = await aurigo.createAurigoScraper({ maxPages: 2, maxJobs: 3 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === aurigo.SEARCH_RESULTS_URL) return searchPageOneHtml
      if (url === 'https://careers.aurigo.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=5') {
        return searchPageTwoHtml
      }
      throw new Error(`Unexpected Aurigo URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    aurigo.SEARCH_RESULTS_URL,
    'https://careers.aurigo.com/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=5',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'aurigo')
  assert.equal(jobs[0].link, 'https://careers.aurigo.com/job/Manager-Legal/1/')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Aurigo Software Technologies run fails closed when the verified jobs search surface drifts', async () => {
  const aurigo = await loadModule()

  await assert.rejects(
    aurigo.createAurigoScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified aurigo search surface/i,
  )
})
