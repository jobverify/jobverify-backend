import assert from 'node:assert/strict'
import test from 'node:test'

const loadIndiaMartModule = async () => {
  try {
    return await import('../indiamart/script.js')
  } catch {
    assert.fail('Expected IndiaMART scraper module at ../indiamart/script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>IndiaMART InterMESH Ltd - Careers</title>
  </head>
  <body>
    <a href="field-sales-and-servicing.html">Field Sales and Servicing</a>
    <a href="tele-sales-and-servicing.html">Tele Sales and Servicing</a>
    <a href="leadership-product-tech-corporate-roles.html">Leadership / Product / Tech &amp; Corporate Roles</a>
    <a href="https://imerp.intermesh.net/im-job-application/auth/jobid/MjIx">Submit Your Resume</a>
    <footer>Copyright &copy; 1996 - 2026 IndiaMART InterMESH Ltd.</footer>
  </body>
</html>
`

const leadershipJobsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>IndiaMART InterMESH Ltd - Jobs in IndiaMART InterMESH Ltd</title>
  </head>
  <body>
    <script type="text/javascript" src="https://joblist.klimb.io/js/embedscripts/embed.js"></script>
    <script type="text/javascript">
      klimb_init({
        company : "indiamart",
        klimbStyleLite: true,
        klimbStyle: true,
        bootstrap: true,
        chatBot: true
      })
    </script>
    <h1>Leadership / Product / Tech &amp; Corporate Roles</h1>
    <div id="klimbjobs" class="plr1"></div>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html>
  <head>
    <title>IndiaMART InterMESH Ltd. Careers</title>
  </head>
  <body onload="getFilterContent('5dd7966c6c4d197f68105048','indiamart','true','careers');">
    <input type="hidden" id="cusId" value="5dd7966c6c4d197f68105048">
    <h1 class="jobtitleleft cjob-title">Jobs at IndiaMART InterMESH Ltd.</h1>
    <ul id="jobsContainer">
      <div
        data-template-department="Marketplace Technology"
        data-template-role="Sr. Engineer"
        data-template-locaName="Noida"
        id="idPos0"
        class="col-md-12 padd-off clearfix">
        <div class="cursor-point" onclick="redirectToPage('/indiamart/6a58d49959bf203aed056b9a?source=careers')">
          <li class="col-md-12 job-list-box">
            <div class="posloc">
              <div class="role-new role">Sr. Engineer/Lead- Data Engineering</div>
              <ul class="list-inline" id="hideover">
                <li class="info list-inline-item">Individual Contributor</li>
                <li class="info list-inline-item">4-7 years</li>
              </ul>
              <div class="info padd-off-new">Sr. Engineer</div>
              <div class="info padd-off-new">Noida</div>
              <div class="cursor-point info padd-off-new apply-now maincolor" target="_blank" onclick="redirectToPage('/indiamart/6a58d49959bf203aed056b9a/apply?source=careers') ">Apply Now</div>
              <div class="current-opening-desc" onclick="redirectToPage('/indiamart/6a58d49959bf203aed056b9a?source=careers') ">We are seeking an experienced and motivated Data Engineers to&nbsp; join our growing team...</div>
            </div>
          </li>
        </div>
      </div>
      <div
        data-template-department="Client Acquisition"
        data-template-role="Executive"
        data-template-locaName="Noida"
        id="idPos1"
        class="col-md-12 padd-off clearfix">
        <div class="cursor-point" onclick="redirectToPage('/indiamart/6a55cd5bced0eb55bb81a929?source=careers')">
          <li class="col-md-12 job-list-box">
            <div class="posloc">
              <div class="role-new role">Executive/Sr. Executive- Winback</div>
              <ul class="list-inline" id="hideover">
                <li class="info list-inline-item">Individual Contributor</li>
                <li class="info list-inline-item">0-3 years</li>
              </ul>
              <div class="info padd-off-new">Executive</div>
              <div class="info padd-off-new">Noida</div>
              <div class="cursor-point info padd-off-new apply-now maincolor" target="_blank" onclick="redirectToPage('/indiamart/6a55cd5bced0eb55bb81a929/apply?source=careers') ">Apply Now</div>
              <div class="current-opening-desc" onclick="redirectToPage('/indiamart/6a55cd5bced0eb55bb81a929?source=careers') ">Job Description: Executive/Sr. Executive- Winback for paid supplier acquisition...</div>
            </div>
          </li>
        </div>
      </div>
    </ul>
    <div class="loadmorebtnCS" onclick="loadMoreJobs('careers','6a55cd5bced0eb55bb81a929')" id="loadmorebtn">
      Load more
    </div>
  </body>
</html>
`

const pageTwoPayload = {
  jobs: {
    positions: [
      {
        id: '6a4ca8548e987dcafeff6906',
        title: 'Regional Sales Manager',
        department: 'Client Servicing',
        role: 'Regional Manager',
        positionType: 'Leadership',
        description: '<p>Lead regional sales for the client servicing organization.</p>',
        expRange: { minimum: '4', maximum: '8' },
        remote: false,
        location: {
          searchText: 'Chennai, Tamil Nadu, India',
          gPlace: {
            formatted_address: 'Chennai, Tamil Nadu, India',
            address_components: [
              { long_name: 'Chennai', types: ['locality', 'political'] },
              { long_name: 'Tamil Nadu', types: ['administrative_area_level_1', 'political'] },
              { long_name: 'India', types: ['country', 'political'] },
            ],
          },
        },
      },
    ],
    loadMore: false,
  },
  showLoadMore: false,
}

const detailPageHtml = `
<!doctype html>
<html>
  <head>
    <title>IndiaMART InterMESH Ltd., Sr. Engineer/Lead- Data Engineering, Noida, Uttar Pradesh, India</title>
  </head>
  <body>
    <h1 class="cjob-title jd-title-new">Sr. Engineer/Lead- Data Engineering</h1>
    <p class="jd-company-name">IndiaMART InterMESH Ltd.</p>
    <a id="lnkApplyForJob" data-position="6a58d49959bf203aed056b9a" href="/indiamart/6a58d49959bf203aed056b9a/apply?source=careers">
      Apply
    </a>
    <input type="hidden" id="googleobj" value='{"@context":"https://schema.org/","@type":"JobPosting","title":"Sr. Engineer/Lead- Data Engineering"}'>
  </body>
</html>
`

test('IndiaMART pins the verified careers microsite, Klimb board, and public pagination contract', async () => {
  const indiaMart = await loadIndiaMartModule()

  assert.equal(indiaMart.SOURCE, 'indiamart')
  assert.equal(indiaMart.COMPANY, 'IndiaMART')
  assert.equal(indiaMart.VERIFIED_ON, '2026-07-16')
  assert.equal(indiaMart.CAREERS_HOMEPAGE_URL, 'https://careers.indiamart.com/')
  assert.equal(
    indiaMart.LEADERSHIP_JOBS_PAGE_URL,
    'https://careers.indiamart.com/leadership-product-tech-corporate-roles.html',
  )
  assert.equal(indiaMart.JOBS_BOARD_URL, 'https://joblist.klimb.io/indiamart')
  assert.equal(indiaMart.KLIMB_CUSTOMER_ID, '5dd7966c6c4d197f68105048')
  assert.equal(indiaMart.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(indiaMart.hasOfficialLeadershipJobsPageSignal(leadershipJobsPageHtml), true)
  assert.equal(indiaMart.hasOfficialJobsBoardSignal(boardHtml), true)
  assert.equal(indiaMart.extractLoadMoreCursor(boardHtml), '6a55cd5bced0eb55bb81a929')

  assert.deepEqual(indiaMart.extractInitialBoardJobs(boardHtml), [
    {
      title: 'Sr. Engineer/Lead- Data Engineering',
      company: 'IndiaMART',
      department: 'Marketplace Technology',
      location: 'Noida, India',
      city: 'Noida',
      state: null,
      country: 'India',
      jobId: '6a58d49959bf203aed056b9a',
      requisitionId: '6a58d49959bf203aed056b9a',
      sourceUrl: 'https://joblist.klimb.io/indiamart/6a58d49959bf203aed056b9a?source=careers',
      applyUrl: 'https://joblist.klimb.io/indiamart/6a58d49959bf203aed056b9a/apply?source=careers',
      employmentType: null,
      experienceRequired: '4-7 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'We are seeking an experienced and motivated Data Engineers to join our growing team...',
      remoteStatus: 'On-site',
    },
    {
      title: 'Executive/Sr. Executive- Winback',
      company: 'IndiaMART',
      department: 'Client Acquisition',
      location: 'Noida, India',
      city: 'Noida',
      state: null,
      country: 'India',
      jobId: '6a55cd5bced0eb55bb81a929',
      requisitionId: '6a55cd5bced0eb55bb81a929',
      sourceUrl: 'https://joblist.klimb.io/indiamart/6a55cd5bced0eb55bb81a929?source=careers',
      applyUrl: 'https://joblist.klimb.io/indiamart/6a55cd5bced0eb55bb81a929/apply?source=careers',
      employmentType: null,
      experienceRequired: '0-3 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Job Description: Executive/Sr. Executive- Winback for paid supplier acquisition...',
      remoteStatus: 'On-site',
    },
  ])

  assert.deepEqual(indiaMart.extractPaginatedJobs(pageTwoPayload), [
    {
      title: 'Regional Sales Manager',
      company: 'IndiaMART',
      department: 'Client Servicing',
      location: 'Chennai, Tamil Nadu, India',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: '6a4ca8548e987dcafeff6906',
      requisitionId: '6a4ca8548e987dcafeff6906',
      sourceUrl: 'https://joblist.klimb.io/indiamart/6a4ca8548e987dcafeff6906?source=careers',
      applyUrl: 'https://joblist.klimb.io/indiamart/6a4ca8548e987dcafeff6906/apply?source=careers',
      employmentType: null,
      experienceRequired: '4-8 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Lead regional sales for the client servicing organization.',
      remoteStatus: 'On-site',
    },
  ])
})

test('IndiaMART run validates the first-party careers chain, paginates the Klimb board, and decorates jobs', async () => {
  const indiaMart = await loadIndiaMartModule()
  const requestedPageUrls = []
  const requestedJsonUrls = []

  const jobs = await indiaMart.createIndiaMartScraper({ maxJobs: 3 }).run({
    fetchPage: async (url) => {
      requestedPageUrls.push(url)

      if (url === indiaMart.CAREERS_HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === indiaMart.LEADERSHIP_JOBS_PAGE_URL) {
        return { status: 200, url, html: leadershipJobsPageHtml }
      }

      if (url === indiaMart.JOBS_BOARD_URL) {
        return { status: 200, url, html: boardHtml }
      }

      if (url === 'https://joblist.klimb.io/indiamart/6a58d49959bf203aed056b9a?source=careers') {
        return { status: 200, url, html: detailPageHtml }
      }

      throw new Error(`Unexpected page request: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === 'https://joblist.klimb.io/indiamart?lastPosId=6a55cd5bced0eb55bb81a929') {
        return pageTwoPayload
      }

      throw new Error(`Unexpected JSON request: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requestedPageUrls, [
    indiaMart.CAREERS_HOMEPAGE_URL,
    indiaMart.LEADERSHIP_JOBS_PAGE_URL,
    indiaMart.JOBS_BOARD_URL,
    'https://joblist.klimb.io/indiamart/6a58d49959bf203aed056b9a?source=careers',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://joblist.klimb.io/indiamart?lastPosId=6a55cd5bced0eb55bb81a929',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'indiamart')
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
  assert.equal(
    jobs[0].link,
    'https://joblist.klimb.io/indiamart/6a58d49959bf203aed056b9a/apply?source=careers',
  )
  assert.equal(jobs[2].title, 'Regional Sales Manager')
  assert.equal(jobs[2].state, 'Tamil Nadu')
})

test('IndiaMART fails closed when the verified first-party chain or Klimb detail surface drifts', async () => {
  const indiaMart = await loadIndiaMartModule()

  await assert.rejects(
    indiaMart.createIndiaMartScraper().run({
      fetchPage: async (url) => {
        if (url === indiaMart.CAREERS_HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Unexpected</body></html>' }
        }

        throw new Error(`Unexpected page request: ${url}`)
      },
      fetchJson: async () => pageTwoPayload,
    }),
    /official indiamart careers homepage/i,
  )

  await assert.rejects(
    indiaMart.createIndiaMartScraper().run({
      fetchPage: async (url) => {
        if (url === indiaMart.CAREERS_HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === indiaMart.LEADERSHIP_JOBS_PAGE_URL) {
          return { status: 200, url, html: leadershipJobsPageHtml }
        }

        if (url === indiaMart.JOBS_BOARD_URL) {
          return { status: 200, url, html: '<html><body>Broken board</body></html>' }
        }

        throw new Error(`Unexpected page request: ${url}`)
      },
      fetchJson: async () => pageTwoPayload,
    }),
    /public indiamart klim[b]? board/i,
  )

  await assert.rejects(
    indiaMart.createIndiaMartScraper().run({
      fetchPage: async (url) => {
        if (url === indiaMart.CAREERS_HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === indiaMart.LEADERSHIP_JOBS_PAGE_URL) {
          return { status: 200, url, html: leadershipJobsPageHtml }
        }

        if (url === indiaMart.JOBS_BOARD_URL) {
          return { status: 200, url, html: boardHtml }
        }

        if (url === 'https://joblist.klimb.io/indiamart/6a58d49959bf203aed056b9a?source=careers') {
          return { status: 200, url, html: '<html><body>Unexpected detail</body></html>' }
        }

        throw new Error(`Unexpected page request: ${url}`)
      },
      fetchJson: async () => pageTwoPayload,
    }),
    /job detail pages no longer match/i,
  )
})
