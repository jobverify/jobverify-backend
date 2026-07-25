import assert from 'node:assert/strict'
import test from 'node:test'

import {
  OFFICIAL_JOBS_URL,
  buildSearchPageUrl,
  createVodafoneIdeaScraper,
  extractJobDetail,
  extractPaginationSummary,
  extractSearchResults,
  hasOfficialListingSignal,
} from '../vodafoneidea/script.js'

const listingHtml = `
  <html>
    <head>
      <title>All Current Job Opportunities</title>
      <link rel="canonical" href="https://careers.vodafoneidea.com/go/All-Current-Job-Opportunities/4268701/" />
    </head>
    <body>
      <div class="pagination-label-row">
        <span class="paginationLabel" aria-label="Results 1 – 2">Results <b>1 – 2</b> of <b>2</b></span>
        <span class="srHelp" style="font-size:0px">Page 1 of 1</span>
      </div>
      <table class="searchResults full table table-striped table-hover" aria-label="Search results for . Page 1 of 1, Results 1 to 2 of 2">
        <tbody>
          <tr class="data-row">
            <td class="colTitle" headers="hdrTitle">
              <span class="jobTitle hidden-phone">
                <a href="/job/Siliguri-Manager-Vi-Store-Operations-West/1373958033/" class="jobTitle-link">Manager - Vi Store Operations</a>
              </span>
            </td>
            <td class="colDepartment hidden-phone" headers="hdrDepartment">
              <span class="jobDepartment">Retail</span>
            </td>
            <td class="colLocation hidden-phone" headers="hdrLocation">
              <span class="jobLocation">Siliguri, West Bengal, IN</span>
            </td>
            <td class="colDate hidden-phone" headers="hdrDate">
              <span class="jobDate">9 Jul 2026</span>
            </td>
          </tr>
          <tr class="data-row">
            <td class="colTitle" headers="hdrTitle">
              <span class="jobTitle hidden-phone">
                <a href="/job/Mumbai-AGM-Technical-Service-Manager-Maha/1402147233/" class="jobTitle-link">AGM - Technical Service Manager</a>
              </span>
            </td>
            <td class="colDepartment hidden-phone" headers="hdrDepartment">
              <span class="jobDepartment">VIBS</span>
            </td>
            <td class="colLocation hidden-phone" headers="hdrLocation">
              <span class="jobLocation">Mumbai, Maharashtra, IN</span>
            </td>
            <td class="colDate hidden-phone" headers="hdrDate">
              <span class="jobDate">8 Jul 2026</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p>Vodafone Idea Limited (formerly Idea Cellular Limited) An Aditya Birla Group &amp; Vodafone partnership</p>
    </body>
  </html>
`

const managerDetailHtml = `
  <html>
    <head>
      <title>AGM - Technical Service Manager Job Details | Vodafoneidea</title>
      <meta property="og:title" content="AGM - Technical Service Manager" />
    </head>
    <body>
      <meta itemprop="addressLocality" content="Mumbai">
      <meta itemprop="addressRegion" content="Maharashtra">
      <meta itemprop="addressCountry" content="IN">
      <meta itemprop="datePosted" content="Wed Jul 08 02:00:00 UTC 2026">
      <meta itemprop="validThrough" content="Mon Jul 20 18:30:00 UTC 2026">
      <div class="jobTitle">
        <h1>
          <span itemprop="title" data-careersite-propertyid="title">AGM - Technical Service Manager</span>
        </h1>
      </div>
      <p id="job-location" class="jobLocation job-location-inline">
        <span class="jobGeoLocation">Mumbai, Maharashtra, IN</span>
      </p>
      <div itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Vodafone Idea Limited is an Aditya Birla Group and Vodafone Group partnership.</p>
          <p>Own and manage service lifecycle activities for enterprise customers.</p>
        </span>
      </div>
      <div class="applylink pull-right">
        <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/1402147233/?locale=en_GB">Apply now »</a>
      </div>
    </body>
  </html>
`

const retailDetailHtml = `
  <html>
    <head>
      <title>Manager - Vi Store Operations Job Details | Vodafoneidea</title>
      <meta property="og:title" content="Manager - Vi Store Operations" />
    </head>
    <body>
      <meta itemprop="addressLocality" content="Siliguri">
      <meta itemprop="addressRegion" content="West Bengal">
      <meta itemprop="addressCountry" content="IN">
      <meta itemprop="datePosted" content="Thu Jul 09 02:00:00 UTC 2026">
      <meta itemprop="validThrough" content="Thu Jul 31 18:30:00 UTC 2026">
      <div class="jobTitle">
        <h1>
          <span itemprop="title" data-careersite-propertyid="title">Manager - Vi Store Operations</span>
        </h1>
      </div>
      <p id="job-location" class="jobLocation job-location-inline">
        <span class="jobGeoLocation">Siliguri, West Bengal, IN</span>
      </p>
      <div itemprop="description" data-careersite-propertyid="description">
        <span class="jobdescription">
          <p>Deliver strong store operations and customer experience.</p>
        </span>
      </div>
      <div class="applylink pull-right">
        <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/1373958033/?locale=en_GB">Apply now »</a>
      </div>
    </body>
  </html>
`

test('buildSearchPageUrl stays pinned to the official Vodafone Idea jobs2web category route', () => {
  assert.equal(
    OFFICIAL_JOBS_URL,
    'https://careers.vodafoneidea.com/go/All-Current-Job-Opportunities/4268701/',
  )
  assert.equal(
    buildSearchPageUrl(),
    'https://careers.vodafoneidea.com/go/All-Current-Job-Opportunities/4268701/?q=&sortColumn=referencedate&sortDirection=desc',
  )
  assert.equal(
    buildSearchPageUrl(7),
    'https://careers.vodafoneidea.com/go/All-Current-Job-Opportunities/4268701/7/?q=&sortColumn=referencedate&sortDirection=desc',
  )
})

test('extractSearchResults parses Vodafone Idea jobs2web rows into shared scraper fields', () => {
  assert.equal(hasOfficialListingSignal(listingHtml), true)

  assert.deepEqual(extractSearchResults(listingHtml), [
    {
      title: 'Manager - Vi Store Operations',
      department: 'Retail',
      location: 'Siliguri, West Bengal, India',
      city: 'Siliguri',
      jobId: '1373958033',
      requisitionId: '1373958033',
      sourceUrl: 'https://careers.vodafoneidea.com/job/Siliguri-Manager-Vi-Store-Operations-West/1373958033/',
      postingDate: '2026-07-09',
    },
    {
      title: 'AGM - Technical Service Manager',
      department: 'VIBS',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: '1402147233',
      requisitionId: '1402147233',
      sourceUrl: 'https://careers.vodafoneidea.com/job/Mumbai-AGM-Technical-Service-Manager-Maha/1402147233/',
      postingDate: '2026-07-08',
    },
  ])
})

test('extractPaginationSummary reads Vodafone Idea result counts from pagination chrome', () => {
  assert.deepEqual(extractPaginationSummary(listingHtml), {
    totalResults: 2,
    currentPage: 1,
    totalPages: 1,
    pageSize: 2,
  })
})

test('extractJobDetail pulls Vodafone Idea detail metadata, description, and apply URL from the public job page', () => {
  assert.deepEqual(
    extractJobDetail(managerDetailHtml, {
      title: 'AGM - Technical Service Manager',
      department: 'VIBS',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: '1402147233',
      requisitionId: '1402147233',
      sourceUrl: 'https://careers.vodafoneidea.com/job/Mumbai-AGM-Technical-Service-Manager-Maha/1402147233/',
      postingDate: '2026-07-08',
    }),
    {
      title: 'AGM - Technical Service Manager',
      department: 'VIBS',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: '1402147233',
      requisitionId: '1402147233',
      employmentType: null,
      experienceRequired: null,
      jobDescription: 'Vodafone Idea Limited is an Aditya Birla Group and Vodafone Group partnership. Own and manage service lifecycle activities for enterprise customers.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-08',
      closingDate: '2026-07-20',
      applyUrl: 'https://careers.vodafoneidea.com/talentcommunity/apply/1402147233/?locale=en_GB',
      sourceUrl: 'https://careers.vodafoneidea.com/job/Mumbai-AGM-Technical-Service-Manager-Maha/1402147233/',
    },
  )
})

test('run validates the official Vodafone Idea listing page and decorates parsed jobs', async () => {
  const requestedUrls = []
  const detailByUrl = new Map([
    ['https://careers.vodafoneidea.com/job/Siliguri-Manager-Vi-Store-Operations-West/1373958033/', retailDetailHtml],
    ['https://careers.vodafoneidea.com/job/Mumbai-AGM-Technical-Service-Manager-Maha/1402147233/', managerDetailHtml],
  ])

  const jobs = await createVodafoneIdeaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === buildSearchPageUrl()) {
        return listingHtml
      }
      return detailByUrl.get(url) || '<html></html>'
    },
    now: () => '2026-07-09T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    buildSearchPageUrl(),
    'https://careers.vodafoneidea.com/job/Siliguri-Manager-Vi-Store-Operations-West/1373958033/',
    'https://careers.vodafoneidea.com/job/Mumbai-AGM-Technical-Service-Manager-Maha/1402147233/',
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Manager - Vi Store Operations',
    company: 'Vodafone Idea Limited',
    department: 'Retail',
    location: 'Siliguri, West Bengal, India',
    city: 'Siliguri',
    country: 'India',
    jobId: '1373958033',
    requisitionId: '1373958033',
    sourceUrl: 'https://careers.vodafoneidea.com/job/Siliguri-Manager-Vi-Store-Operations-West/1373958033/',
    applyUrl: 'https://careers.vodafoneidea.com/talentcommunity/apply/1373958033/?locale=en_GB',
    link: 'https://careers.vodafoneidea.com/talentcommunity/apply/1373958033/?locale=en_GB',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09',
    closingDate: '2026-07-31',
    jobDescription: 'Deliver strong store operations and customer experience.',
    source: 'vodafoneidea',
    scrapedAt: '2026-07-09T00:00:00.000Z',
  })
  assert.equal(jobs[1].company, 'Vodafone Idea Limited')
  assert.equal(jobs[1].source, 'vodafoneidea')
  assert.equal(jobs[1].scrapedAt, '2026-07-09T00:00:00.000Z')
})

test('run fails closed when the Vodafone Idea official listing signal disappears', async () => {
  await assert.rejects(
    createVodafoneIdeaScraper().run({
      fetchText: async () => '<html><body>Unexpected page</body></html>',
    }),
    /official Vodafone Idea jobs page/i,
  )
})
