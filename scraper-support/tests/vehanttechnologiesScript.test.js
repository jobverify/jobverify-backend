import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AJAX_URL,
  CAREERS_URL,
  createVehantTechnologiesScraper,
  extractJobDetail,
  extractListingCards,
} from '../../scraper/vehanttechnologies/script.js'

const careersPageHtml = `
  <section class="current-opening">
    <div class="head">
      <h3>Submit Your Resume - recruitment@vehant.com</h3>
      <h2>Job Listing</h2>
    </div>
    <div class="job-listing-inner">
      <div class="row post-data-body">
        <div class="col-lg-4 col-md-6 col-sm-12">
          <div class="job-box">
            <h4>Junior Tester</h4>
            <h6>Location: Noida</h6>
            <p></p>
            <a href="https://www.vehant.com/jobs/junior-tester/">More info</a>
          </div>
        </div>
        <div class="col-lg-4 col-md-6 col-sm-12">
          <div class="job-box">
            <h4>Service Engineer - Aviation</h4>
            <h6>Location: Mumbai</h6>
            <p></p>
            <a href="https://www.vehant.com/jobs/service-engineer-aviation/">More info</a>
          </div>
        </div>
      </div>
      <div class="explore">
        <a href="javascript:void(0)" class="load-more-button">LOAD MORE</a>
      </div>
    </div>
  </section>
`

const ajaxPageTwoPayload = {
  success: true,
  data: `
    <div class="col-lg-4 col-md-6 col-sm-12">
      <div class="job-box">
        <h4>Business Development Manager</h4>
        <h6>Location: Bangalore</h6>
        <p></p>
        <a href="https://www.vehant.com/jobs/business-development-manager/">More info</a>
      </div>
    </div>
  `,
}

const juniorTesterDetailHtml = `
  <div class="job-detail">
    <h1>Junior Tester</h1>
    <div class="profile-first">
      <div class="profile-exp"><span>Years of Experience: 2-3 Years</span></div>
      <div class="profile-exp"><span>Location: Noida</span></div>
    </div>
    <div class="job">
      <h5>Qualification</h5>
      <ul><li>BE/B-Tech</li></ul>
    </div>
    <div class="job">
      <h5>Responsibilities</h5>
      <ul>
        <li>At least 2-3 year of experience in Software testing in C/C++.</li>
        <li>Primary function is to carry out manual testing.</li>
      </ul>
    </div>
    <div class="apply-form-modify">
      <h3>Apply For This <span>Job</span></h3>
    </div>
  </div>
`

const serviceEngineerDetailHtml = `
  <div class="job-detail">
    <h1>Service Engineer - Aviation</h1>
    <div class="profile-first">
      <div class="profile-exp"><span>Years of Experience: 4-6 Years</span></div>
      <div class="profile-exp"><span>Location: Mumbai</span></div>
    </div>
    <div class="job">
      <h5>Qualification</h5>
      <ul><li>B.Tech in Electronics</li></ul>
    </div>
    <div class="job">
      <h5>Responsibilities</h5>
      <ul><li>Support field installations and preventive maintenance.</li></ul>
    </div>
  </div>
`

const businessDevelopmentManagerDetailHtml = `
  <div class="job-detail">
    <h1>Business Development Manager</h1>
    <div class="profile-first">
      <div class="profile-exp"><span>Years of Experience: 6-8 Years</span></div>
      <div class="profile-exp"><span>Location: Bangalore</span></div>
    </div>
    <div class="job">
      <h5>Qualification</h5>
      <ul><li>MBA</li></ul>
    </div>
    <div class="job">
      <h5>Responsibilities</h5>
      <ul><li>Own enterprise sales pipeline development.</li></ul>
    </div>
  </div>
`

test('extractListingCards parses Vehant public careers cards from official page HTML and AJAX HTML', () => {
  assert.equal(CAREERS_URL, 'https://www.vehant.com/careers/')

  const firstPageCards = extractListingCards(careersPageHtml)
  const ajaxCards = extractListingCards(ajaxPageTwoPayload.data)

  assert.deepEqual(firstPageCards, [
    {
      title: 'Junior Tester',
      location: 'Noida',
      sourceUrl: 'https://www.vehant.com/jobs/junior-tester/',
    },
    {
      title: 'Service Engineer - Aviation',
      location: 'Mumbai',
      sourceUrl: 'https://www.vehant.com/jobs/service-engineer-aviation/',
    },
  ])
  assert.deepEqual(ajaxCards, [
    {
      title: 'Business Development Manager',
      location: 'Bangalore',
      sourceUrl: 'https://www.vehant.com/jobs/business-development-manager/',
    },
  ])
})

test('extractJobDetail parses Vehant job detail sections into structured shared fields', () => {
  assert.deepEqual(extractJobDetail(juniorTesterDetailHtml), {
    location: 'Noida',
    experienceRequired: '2-3 Years',
    minimumQualification: 'BE/B-Tech',
    jobDescription:
      'Qualification BE/B-Tech Responsibilities At least 2-3 year of experience in Software testing in C/C++. Primary function is to carry out manual testing. Apply For This Job',
  })
})

test('run fetches the official Vehant careers page, paginates via admin-ajax, and enriches jobs from detail pages', async () => {
  const requestedTexts = []
  const requestedJson = []

  const jobs = await createVehantTechnologiesScraper({ maxJobs: 3 }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === CAREERS_URL) return careersPageHtml
      if (url === 'https://www.vehant.com/jobs/junior-tester/') return juniorTesterDetailHtml
      if (url === 'https://www.vehant.com/jobs/service-engineer-aviation/') return serviceEngineerDetailHtml
      if (url === 'https://www.vehant.com/jobs/business-development-manager/') {
        return businessDevelopmentManagerDetailHtml
      }

      throw new Error(`Unexpected Vehant text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requestedJson.push([url, options])
      const page = String(new URLSearchParams(options.body).get('page'))
      if (page === '2') return ajaxPageTwoPayload
      if (page === '3') return { success: true, data: '   ' }
      throw new Error(`Unexpected Vehant AJAX page: ${page}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    CAREERS_URL,
    'https://www.vehant.com/jobs/junior-tester/',
    'https://www.vehant.com/jobs/service-engineer-aviation/',
    'https://www.vehant.com/jobs/business-development-manager/',
  ])
  assert.deepEqual(
    requestedJson.map(([url, options]) => [
      url,
      String(new URLSearchParams(options.body).get('action')),
      String(new URLSearchParams(options.body).get('page')),
    ]),
    [
      [AJAX_URL, 'load_more', '2'],
      [AJAX_URL, 'load_more', '3'],
    ],
  )
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Junior Tester',
    company: 'Vehant Technologies',
    location: 'Noida',
    city: 'Noida',
    country: 'India',
    source: 'vehanttechnologies',
    jobId: 'junior-tester',
    requisitionId: 'junior-tester',
    sourceUrl: 'https://www.vehant.com/jobs/junior-tester/',
    applyUrl: 'https://www.vehant.com/jobs/junior-tester/',
    link: 'https://www.vehant.com/jobs/junior-tester/',
    employmentType: null,
    experienceRequired: '2-3 Years',
    minimumQualification: 'BE/B-Tech',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Qualification BE/B-Tech Responsibilities At least 2-3 year of experience in Software testing in C/C++. Primary function is to carry out manual testing. Apply For This Job',
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
  assert.equal(jobs[1].jobId, 'service-engineer-aviation')
  assert.equal(jobs[2].jobId, 'business-development-manager')
})
