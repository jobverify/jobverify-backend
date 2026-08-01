import assert from 'node:assert/strict'
import test from 'node:test'

const loadAmberstudentModule = async () => {
  try {
    return await import('../workbookbatch02/amberstudent.js')
  } catch {
    assert.fail('Expected Amberstudent scraper module at ../workbookbatch02/amberstudent.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Amber - Join Our Team</title>
  </head>
  <body>
    <main>
      <section>
        <h1>Your Next Big Break</h1>
        <p>There is always room for more &amp; we're looking for the best!</p>
        <button type="button">Find Roles</button>
      </section>
      <footer>
        <p>Amberstudent</p>
      </footer>
    </main>
  </body>
</html>
`

const smartRecruitersBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Amber Student</title>
  </head>
  <body>
    <main id="st-main">
      <section id="st-openings" class="site-section openings">
        <h2 class="openings-title">Jobs at Amber Student</h2>
        <div class="openings-body js-openings">
          <div data-groups-pages="1" data-page="0" data-more="/AmberStudent/api/groups" class="js-openings-load">
            <section data-qty="1" class="openings-section opening--grouped js-group">
              <header class="opening-header">
                <ul class="title-list">
                  <li><h3 class="opening-title">Pune,, India</h3></li>
                  <li><span class="title">1 job</span></li>
                </ul>
              </header>
              <ul class="opening-jobs">
                <li class="opening-job">
                  <a
                    href="https://jobs.smartrecruiters.com/amberstudent/743999728950415-sales-associate"
                    aria-label="Sales Associate - REF2N"
                    class="js-job-ad-link"
                  >
                    <h4 class="job-title">Sales Associate</h4>
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
`

const smartRecruitersListingsPayload = {
  offset: 0,
  limit: 100,
  totalFound: 1,
  content: [
    {
      id: '743999728950415',
      name: 'Sales Associate',
      refNumber: 'REF2N',
      releasedDate: '2020-12-22T14:06:59.000Z',
      location: {
        city: 'Pune,',
        region: 'Maharashtra',
        country: 'in',
        fullLocation: 'Pune,, Maharashtra, India',
        remote: true,
        hybrid: false,
      },
      company: {
        identifier: 'AmberStudent',
        name: 'Amber Student',
      },
      function: {
        id: 'sales',
        label: 'Sales',
      },
      department: {},
      typeOfEmployment: {
        id: 'permanent',
        label: 'Full-time',
      },
      experienceLevel: {
        id: 'entry_level',
        label: 'Entry Level',
      },
      visibility: 'PUBLIC',
      ref: 'https://api.smartrecruiters.com/v1/companies/amberstudent/postings/743999728950415',
    },
  ],
}

const smartRecruitersDetailPayload = {
  id: '743999728950415',
  name: 'Sales Associate',
  refNumber: 'REF2N',
  releasedDate: '2020-12-22T14:06:59.000Z',
  postingUrl: 'https://jobs.smartrecruiters.com/AmberStudent/743999728950415-sales-associate',
  applyUrl: 'https://jobs.smartrecruiters.com/AmberStudent/743999728950415-sales-associate?oga=true',
  location: {
    city: 'Pune,',
    region: 'Maharashtra',
    country: 'in',
    fullLocation: 'Pune,, Maharashtra, India',
    remote: true,
    hybrid: false,
  },
  company: {
    identifier: 'AmberStudent',
    name: 'Amber Student',
  },
  function: {
    id: 'sales',
    label: 'Sales',
  },
  department: {},
  typeOfEmployment: {
    id: 'permanent',
    label: 'Full-time',
  },
  experienceLevel: {
    id: 'entry_level',
    label: 'Entry Level',
  },
  jobAd: {
    sections: {
      jobDescription: {
        text: `
          <ul>
            <li>Act as a mediator between the students and the property management groups.</li>
            <li>Closing the deal and getting the paperwork done.</li>
          </ul>
        `,
      },
      qualifications: {
        text: `
          <p>Requirements</p>
          <ul>
            <li>Excellent written and oral communication skills Active Listening skills</li>
            <li>Education level - Graduate Experience - 0-2years</li>
          </ul>
        `,
      },
      additionalInformation: {
        text: `
          <p>Benefits</p>
          <ul>
            <li>Fully remote</li>
            <li>Great Incentives</li>
          </ul>
        `,
      },
    },
  },
}

test('Amberstudent pins the verified first-party careers page, SmartRecruiters board, and public API endpoints', async () => {
  const amberstudent = await loadAmberstudentModule()

  assert.equal(amberstudent.SOURCE, 'amberstudent')
  assert.equal(amberstudent.COMPANY, 'Amberstudent')
  assert.equal(amberstudent.VERIFIED_ON, '2026-07-30')
  assert.equal(amberstudent.CAREERS_URL, 'https://amberstudent.com/career')
  assert.equal(
    amberstudent.SMARTRECRUITERS_BOARD_URL,
    'https://careers.smartrecruiters.com/amberstudent',
  )
  assert.equal(
    amberstudent.SMARTRECRUITERS_LISTING_API_URL,
    'https://api.smartrecruiters.com/v1/companies/amberstudent/postings',
  )
  assert.equal(amberstudent.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(amberstudent.hasVerifiedJobsBoardSignal(smartRecruitersBoardHtml), true)
})

test('Amberstudent run validates the first-party careers page, public SmartRecruiters board, and India API payload', async () => {
  const amberstudent = await loadAmberstudentModule()
  const requestedUrls = []

  const jobs = await amberstudent.createAmberstudentScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === amberstudent.CAREERS_URL) return officialCareersHtml
      if (url === amberstudent.SMARTRECRUITERS_BOARD_URL) return smartRecruitersBoardHtml
      throw new Error(`Unexpected Amberstudent text fixture URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (
        url
        === 'https://api.smartrecruiters.com/v1/companies/amberstudent/postings?limit=100&country=in&offset=0'
      ) {
        return smartRecruitersListingsPayload
      }
      if (url === 'https://api.smartrecruiters.com/v1/companies/amberstudent/postings/743999728950415') {
        return smartRecruitersDetailPayload
      }
      throw new Error(`Unexpected Amberstudent JSON fixture URL: ${url}`)
    },
    now: () => '2026-07-30T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    amberstudent.CAREERS_URL,
    amberstudent.SMARTRECRUITERS_BOARD_URL,
    'https://api.smartrecruiters.com/v1/companies/amberstudent/postings?limit=100&country=in&offset=0',
    'https://api.smartrecruiters.com/v1/companies/amberstudent/postings/743999728950415',
  ])

  assert.deepEqual(jobs, [
    {
      title: 'Sales Associate',
      company: 'Amberstudent',
      department: 'Sales',
      location: 'Pune,, Maharashtra, India',
      city: 'Pune,',
      country: 'India',
      link: 'https://jobs.smartrecruiters.com/AmberStudent/743999728950415-sales-associate',
      applyUrl:
        'https://jobs.smartrecruiters.com/AmberStudent/743999728950415-sales-associate?oga=true',
      sourceUrl: 'https://jobs.smartrecruiters.com/AmberStudent/743999728950415-sales-associate',
      source: 'amberstudent',
      jobId: '743999728950415',
      requisitionId: 'REF2N',
      employmentType: 'Full-time',
      experienceRequired: null,
      experienceLevel: 'Entry Level',
      minimumQualification:
        'Requirements Excellent written and oral communication skills Active Listening skills Education level - Graduate Experience - 0-2years',
      preferredQualification: 'Benefits Fully remote Great Incentives',
      requiredSkills: [],
      postingDate: '2020-12-22T14:06:59.000Z',
      closingDate: null,
      jobDescription:
        'Act as a mediator between the students and the property management groups. Closing the deal and getting the paperwork done.',
      remoteStatus: 'Remote',
      scrapedAt: '2026-07-30T00:00:00.000Z',
    },
  ])
})

test('Amberstudent fails closed when the verified careers shell or SmartRecruiters board changes', async () => {
  const amberstudent = await loadAmberstudentModule()

  await assert.rejects(
    amberstudent.createAmberstudentScraper().run({
      fetchText: async (url) => {
        if (url === amberstudent.CAREERS_URL) return '<html><body><h1>Careers</h1></body></html>'
        return smartRecruitersBoardHtml
      },
      fetchJson: async () => smartRecruitersListingsPayload,
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    amberstudent.createAmberstudentScraper().run({
      fetchText: async (url) => {
        if (url === amberstudent.CAREERS_URL) return officialCareersHtml
        return smartRecruitersBoardHtml.replace('Jobs at Amber Student', 'Jobs at Another Company')
      },
      fetchJson: async () => smartRecruitersListingsPayload,
    }),
    /verified smartrecruiters jobs board/i,
  )
})
