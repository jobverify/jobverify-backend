import assert from 'node:assert/strict'
import test from 'node:test'

const loadWabtecModule = async () => {
  try {
    return await import('../wabtec/script.js')
  } catch {
    assert.fail('Expected Wabtec scraper module at ../wabtec/script.js')
  }
}

const indiaSearchPageHtml = `
  <html>
    <head><title>Search Jobs Here | Wabtec</title></head>
    <body>
      <h1>Search Jobs Here</h1>
      <div class="attrax-vacancy-tile sector-engineeringtechnology attrax-vacancy-tile--fulltime attrax-vacancy-tile--bengaluru attrax-vacancy-tile--karnataka attrax-vacancy-tile--india attrax-vacancy-tile--hybrid attrax-vacancy-tile--no-author" data-jobid="2831">
        <a aria-level="3" class="attrax-vacancy-tile__title attrax-vacancy-tile__item attrax-button" href="/in/job/senior-software-engineer-in-bengaluru-ka-india-jid-2831" role="heading" tabindex="0">
          Senior Software Engineer
        </a>
        <div class="attrax-vacancy-tile__location-freetext attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__item-label">Location</p>
          <p class="attrax-vacancy-tile__item-value">Bengaluru, KA, India</p>
        </div>
        <div class="attrax-vacancy-tile__option-location attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__option-location-label attrax-vacancy-tile__item-label">Location</p>
          <div class="attrax-vacancy-tile__item-valueset">
            <p class="attrax-vacancy-tile__item-value">Bengaluru</p>
          </div>
        </div>
        <div class="attrax-vacancy-tile__option-time-type attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__option-time-type-label attrax-vacancy-tile__item-label">Time Type</p>
          <div class="attrax-vacancy-tile__item-valueset">
            <p class="attrax-vacancy-tile__item-value">Full - Time</p>
          </div>
        </div>
        <div class="attrax-vacancy-tile__option-remote-type attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__option-remote-type-label attrax-vacancy-tile__item-label">Remote Type</p>
          <div class="attrax-vacancy-tile__item-valueset">
            <p class="attrax-vacancy-tile__item-value">Hybrid</p>
          </div>
        </div>
        <div class="attrax-vacancy-tile__option-job-family attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__option-job-family-label attrax-vacancy-tile__item-label">Job Family</p>
          <div class="attrax-vacancy-tile__item-valueset">
            <p class="attrax-vacancy-tile__item-value">Engineering/Technology</p>
          </div>
        </div>
        <div class="attrax-vacancy-tile__description attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__description-label attrax-vacancy-tile__item-label">Description</p>
          <p class="attrax-vacancy-tile__description-value attrax-vacancy-tile__item-value">
            It&#x2019;s about who you are and the impact you will make on the world.
          </p>
        </div>
        <div class="attrax-vacancy-tile__reference attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__reference-label attrax-vacancy-tile__item-label">Reference</p>
          <p class="attrax-vacancy-tile__reference-value attrax-vacancy-tile__item-value">92c32a55-4573-40fe-b050-ead75d7d2dee</p>
        </div>
        <div class="attrax-vacancy-tile__expiry attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__expiry-label attrax-vacancy-tile__item-label">Expiry Date</p>
          <p class="attrax-vacancy-tile__expiry-value attrax-vacancy-tile__item-value">01/01/0001</p>
        </div>
      </div>
      <div class="attrax-vacancy-tile sector-operations attrax-vacancy-tile--fulltime attrax-vacancy-tile--milwaukee attrax-vacancy-tile--wisconsin attrax-vacancy-tile--united-states-of-america attrax-vacancy-tile--on-site attrax-vacancy-tile--no-author" data-jobid="3148">
        <a class="attrax-vacancy-tile__title attrax-vacancy-tile__item attrax-button" href="/in/job/shipping-receiving-clerk-in-milwaukee-wi-united-states-jid-3148">
          Shipping Receiving Clerk
        </a>
        <div class="attrax-vacancy-tile__location-freetext attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__item-label">Location</p>
          <p class="attrax-vacancy-tile__item-value">Milwaukee, WI, United States</p>
        </div>
      </div>
      <div class="attrax-pagination__container">
        <a href="javascript:pagination(1)">1</a>
        <a href="javascript:pagination(2)">2</a>
        <a href="javascript:pagination(25)">25</a>
      </div>
    </body>
  </html>
`

const secondIndiaSearchPageHtml = `
  <html>
    <head><title>Search Jobs Here | Wabtec</title></head>
    <body>
      <h1>Search Jobs Here</h1>
      <div class="attrax-vacancy-tile sector-finance attrax-vacancy-tile--fulltime attrax-vacancy-tile--marhowra attrax-vacancy-tile--bihar attrax-vacancy-tile--india attrax-vacancy-tile--on-site attrax-vacancy-tile--no-author" data-jobid="3260">
        <a aria-level="3" class="attrax-vacancy-tile__title attrax-vacancy-tile__item attrax-button" href="/in/job/fp-and-a-mfg-ops-in-marhowra-br-india-jid-3260" role="heading" tabindex="0">
          FP&amp;A - Mfg Ops
        </a>
        <div class="attrax-vacancy-tile__location-freetext attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__item-label">Location</p>
          <p class="attrax-vacancy-tile__item-value">Marhowra, BR, India</p>
        </div>
        <div class="attrax-vacancy-tile__option-location attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__option-location-label attrax-vacancy-tile__item-label">Location</p>
          <div class="attrax-vacancy-tile__item-valueset">
            <p class="attrax-vacancy-tile__item-value">Marhowra</p>
          </div>
        </div>
        <div class="attrax-vacancy-tile__option-time-type attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__option-time-type-label attrax-vacancy-tile__item-label">Time Type</p>
          <div class="attrax-vacancy-tile__item-valueset">
            <p class="attrax-vacancy-tile__item-value">Full - Time</p>
          </div>
        </div>
        <div class="attrax-vacancy-tile__option-job-family attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__option-job-family-label attrax-vacancy-tile__item-label">Job Family</p>
          <div class="attrax-vacancy-tile__item-valueset">
            <p class="attrax-vacancy-tile__item-value">Finance</p>
          </div>
        </div>
        <div class="attrax-vacancy-tile__description attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__description-label attrax-vacancy-tile__item-label">Description</p>
          <p class="attrax-vacancy-tile__description-value attrax-vacancy-tile__item-value">
            Support manufacturing operations through finance planning and analysis.
          </p>
        </div>
        <div class="attrax-vacancy-tile__reference attrax-vacancy-tile__item">
          <p class="attrax-vacancy-tile__reference-label attrax-vacancy-tile__item-label">Reference</p>
          <p class="attrax-vacancy-tile__reference-value attrax-vacancy-tile__item-value">a1eb1f7b-1663-4fef-a085-120ca8df0326</p>
        </div>
      </div>
      <div class="attrax-pagination__container">
        <a href="javascript:pagination(1)">1</a>
        <a href="javascript:pagination(2)">2</a>
      </div>
    </body>
  </html>
`

const detailPageHtml = `
  <html>
    <head>
      <title>Senior Software Engineer job in Bengaluru, KA, India | Wabtec</title>
    </head>
    <body>
      <div class="vacancy-buttons-widget">
        <a class="jobApplyBtn btn btn-default" href="/in/Workflow?workflowId=617ea0f6-c301-4656-964e-b54501455547&amp;vacancyId=2831">
          Apply
        </a>
      </div>
      <div class="description-widget">
        <div aria-label="Job description">
          <div class="jobad-jobdescription">Job Description</div>
          <p>It&#x2019;s about who you are and the impact you will make on the world.</p>
          <p>TCOS (Train Control Office Suite) team is committed to delivering high-quality results.</p>
          <ul>
            <li>Design and maintain cloud-native services for train control workflows.</li>
            <li>Collaborate with cross-functional engineering teams on secure releases.</li>
          </ul>
          <div class="jobad-qualifications">What do we need from you</div>
          <ul>
            <li>Bachelor&#x2019;s degree in Computer Science or a related field.</li>
            <li>Strong experience with Java, Spring Boot, and distributed systems.</li>
          </ul>
        </div>
      </div>
    </body>
  </html>
`

test('Wabtec scraper constants point to the official India-localized Attrax jobs pages', async () => {
  const { CAREERS_URL, COMPANY, buildSearchPageUrl } = await loadWabtecModule()

  assert.equal(CAREERS_URL, 'https://careers.wabtec.com/in/jobs')
  assert.equal(COMPANY, 'Wabtec Corporation')
  assert.equal(
    buildSearchPageUrl(),
    'https://careers.wabtec.com/in/jobs?page=1',
  )
  assert.equal(
    buildSearchPageUrl(4),
    'https://careers.wabtec.com/in/jobs?page=4',
  )
})

test('extractSearchResults keeps India Attrax vacancies and normalizes shared scraper fields', async () => {
  const { extractSearchResults, extractTotalPages } = await loadWabtecModule()

  const jobs = extractSearchResults(indiaSearchPageHtml)

  assert.equal(extractTotalPages(indiaSearchPageHtml), 25)
  assert.deepEqual(jobs, [{
    title: 'Senior Software Engineer',
    company: 'Wabtec Corporation',
    department: 'Engineering/Technology',
    location: 'Bengaluru, KA, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '2831',
    requisitionId: '92c32a55-4573-40fe-b050-ead75d7d2dee',
    sourceUrl: 'https://careers.wabtec.com/in/job/senior-software-engineer-in-bengaluru-ka-india-jid-2831',
    applyUrl: 'https://careers.wabtec.com/in/job/senior-software-engineer-in-bengaluru-ka-india-jid-2831',
    employmentType: 'Full - Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: "It's about who you are and the impact you will make on the world.",
  }])
})

test('extractJobDetail enriches Wabtec detail pages with workflow apply links and qualifications', async () => {
  const { extractJobDetail, extractSearchResults } = await loadWabtecModule()

  const [listing] = extractSearchResults(indiaSearchPageHtml)
  const job = extractJobDetail(detailPageHtml, listing)

  assert.deepEqual(job, {
    ...listing,
    applyUrl: 'https://careers.wabtec.com/in/Workflow?workflowId=617ea0f6-c301-4656-964e-b54501455547&vacancyId=2831',
    minimumQualification: "Bachelor's degree in Computer Science or a related field.",
    requiredSkills: [
      "Bachelor's degree in Computer Science or a related field.",
      'Strong experience with Java, Spring Boot, and distributed systems.',
    ],
    jobDescription: "Job Description It's about who you are and the impact you will make on the world. TCOS (Train Control Office Suite) team is committed to delivering high-quality results. Design and maintain cloud-native services for train control workflows. Collaborate with cross-functional engineering teams on secure releases. What do we need from you Bachelor's degree in Computer Science or a related field. Strong experience with Java, Spring Boot, and distributed systems.",
  })
})

test('run crawls Wabtec paginated listing pages and enriches India detail pages', async () => {
  const { createWabtecScraper } = await loadWabtecModule()

  const requests = []
  const scraper = createWabtecScraper({
    maxPages: 2,
    fetchText: async (url) => {
      requests.push(url)

      if (url === 'https://careers.wabtec.com/in/jobs?page=1') {
        return indiaSearchPageHtml
      }

      if (url === 'https://careers.wabtec.com/in/jobs?page=2') {
        return secondIndiaSearchPageHtml
      }

      if (url === 'https://careers.wabtec.com/in/job/senior-software-engineer-in-bengaluru-ka-india-jid-2831') {
        return detailPageHtml
      }

      if (url === 'https://careers.wabtec.com/in/job/fp-and-a-mfg-ops-in-marhowra-br-india-jid-3260') {
        return detailPageHtml
          .replace(/2831/g, '3260')
          .replace(/Senior Software Engineer/g, 'FP&A - Mfg Ops')
          .replace(/Bengaluru, KA, India/g, 'Marhowra, BR, India')
          .replace(/TCOS \(Train Control Office Suite\) team is committed to delivering high-quality results\./g, 'The manufacturing finance team partners with operations leaders across the plant.')
          .replace(/cloud-native services for train control workflows/g, 'finance planning models for manufacturing workflows')
          .replace(/cross-functional engineering teams on secure releases/g, 'operations and controllership stakeholders on monthly reviews')
          .replace(/Computer Science/g, 'Finance')
          .replace(/Java, Spring Boot, and distributed systems/g, 'forecasting, variance analysis, and SAP reporting')
      }

      throw new Error(`Unexpected Wabtec URL: ${url}`)
    },
    now: () => '2026-07-09T00:00:00.000Z',
  })

  const jobs = await scraper.run()

  assert.deepEqual(requests, [
    'https://careers.wabtec.com/in/jobs?page=1',
    'https://careers.wabtec.com/in/job/senior-software-engineer-in-bengaluru-ka-india-jid-2831',
    'https://careers.wabtec.com/in/jobs?page=2',
    'https://careers.wabtec.com/in/job/fp-and-a-mfg-ops-in-marhowra-br-india-jid-3260',
  ])

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'wabtec')
  assert.equal(jobs[0].company, 'Wabtec Corporation')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-09T00:00:00.000Z')
  assert.equal(jobs[1].city, 'Marhowra')
  assert.equal(
    jobs[1].applyUrl,
    'https://careers.wabtec.com/in/Workflow?workflowId=617ea0f6-c301-4656-964e-b54501455547&vacancyId=3260',
  )
})
