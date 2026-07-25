import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected scraper module at ${relativePath}`)
  }
}

const nextCommRedirectHtml = '<!DOCTYPE html><html><head><script>window.onload=function(){window.location.href="/lander"}</script></head></html>'
const nextCommLanderHtml = '<!doctype html><html lang="en"><head><script>window.LANDER_SYSTEM="PW"</script><script defer="defer" src="https://img1.wsimg.com/parking-lander/static/js/main.3ff36aae.js"></script></head><body><div id="root"></div></body></html>'

const mobileumCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <section class="section-job-opportunities no-pad-bottom">
      <h2 class="h2 m-md-alt">Job Opportunities</h2>
      <iframe class="iframe" src="https://mobileum-node.my.salesforce-sites.com/Recruit/" frameborder="0"></iframe>
    </section>
  </body>
</html>
`

const mobileumRecruitHtml = `
<!doctype html>
<html lang="en_US">
  <body>
    <div class="bPageTitle">
      <h1 class="pageType">Applicant Portal</h1>
      <h2 class="pageDescription">Current Vacancies</h2>
    </div>
    <table class="list jobListPanel">
      <thead>
        <tr>
          <th>Vacancy Name</th>
          <th>Vacancy No</th>
          <th>Employment Type</th>
          <th>Location Country</th>
          <th>Location City</th>
        </tr>
      </thead>
      <tbody>
        <tr class="dataRow even first">
          <td><a href="/Recruit/fRecruit__ApplyJob?vacancyNo=VN5825&portal=Vacancies">Senior Director - Technical Delivery</a></td>
          <td><span>VN5825</span></td>
          <td><span>Full-Time</span></td>
          <td><span>United States</span></td>
          <td><span>Seattle,Washington</span></td>
        </tr>
        <tr class="dataRow odd last">
          <td><a href="/Recruit/fRecruit__ApplyJob?vacancyNo=VN5205&portal=Vacancies">Technical Delivery Manager</a></td>
          <td><span>VN5205</span></td>
          <td><span>Full-Time</span></td>
          <td><span>Portugal/Greece</span></td>
          <td><span></span></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const strategicErpCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <section class="why-work-sec">
      <h2>Why work</h2>
    </section>
    <div class='position-box'>
      <div class='position-title-box'>
        <h4>Implementation Consultant <small class='ms-3'>(Fulltime)</small></h4>
        <p class='mb-3'>2 year</p>
        <p><img src='https://strategicerp.com/images/career/Group.png' class='img-fluid'> Mumbai</p>
      </div>
      <button type='button' class='btn btn-outline-primary'><a href='job_details.php?id=3'>Apply Now</a></button>
    </div>
    <div class='position-box'>
      <div class='position-title-box'>
        <h4>Customer Success Executive <small class='ms-3'>(Fulltime)</small></h4>
        <p class='mb-3'>1 year</p>
        <p><img src='https://strategicerp.com/images/career/Group.png' class='img-fluid'> Mumbai</p>
      </div>
      <button type='button' class='btn btn-outline-primary'><a href='job_details.php?id=7'>Apply Now</a></button>
    </div>
  </body>
</html>
`

const mcafeeJoinHtml = `
<!doctype html>
<html lang="en">
  <body>
    <section class="footer defaults">
      <p>Careers At McAfee</p>
      <a href="/jobs">Jobs</a>
      <a href="/join/talentcommunity/form">Join our Talent Community</a>
    </section>
    <div class="internal-footer">
      <p>See jobs by:</p>
      <a href="/categories">Categories</a>
      <a href="/locations">Locations</a>
    </div>
  </body>
</html>
`

const mcafeeSearchShellHtml = `
<!doctype html>
<html lang="en">
  <body>
    <div class="404-page main-404">
      <p>The page you are looking for no longer exists.</p>
      <p>Find out more about <a href="https://careers.mcafee.com/home">McAfee Careers</a> here or <a href="https://careers.mcafee.com/jobs">start your job search</a>.</p>
    </div>
    <div class="internal-footer">
      <p>See jobs by:</p>
      <a href="/categories">Categories</a>
      <a href="/locations">Locations</a>
    </div>
  </body>
</html>
`

const betsolBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <a href="https://www.betsol.com/">Home Page</a>
    <h2>Jobs at Betsol LLC</h2>
    <section class="openings-section opening opening--grouped js-group">
      <header class="opening-header">
        <ul class="list--dotted title-list">
          <li><h3 class="opening-title title display--inline-block text--default spl-text-h5">Bengaluru, India</h3></li>
          <li><span class="title">3 jobs</span></li>
        </ul>
      </header>
      <ul class="opening-jobs grid--gutter padding--none js-group-list">
        <li class="opening-job job column wide-7of16 medium-1of2">
          <a href="https://jobs.smartrecruiters.com/Betsol/744000137153001-telecom-voice-operations-engineer" class="link--block details js-job-ad-link">
            <h4 class="details-title job-title link--block-target spl-text-h6">Telecom Voice Operations Engineer</h4>
            <p class="details-desc job-desc"><span class="margin--right--s">Mid-Senior Level</span></p>
          </a>
        </li>
        <li class="opening-job job column wide-7of16 medium-1of2">
          <a href="https://jobs.smartrecruiters.com/Betsol/744000137153002-servicenow-qa-engineer" class="link--block details js-job-ad-link">
            <h4 class="details-title job-title link--block-target spl-text-h6">ServiceNow QA Engineer</h4>
            <p class="details-desc job-desc"><span class="margin--right--s">Mid-Senior Level</span></p>
          </a>
        </li>
        <li class="opening-job job column wide-7of16 medium-1of2">
          <a href="https://jobs.smartrecruiters.com/Betsol/744000137153003-noc-technician" class="link--block details js-job-ad-link">
            <h4 class="details-title job-title link--block-target spl-text-h6">NOC Technician</h4>
            <p class="details-desc job-desc"><span class="margin--right--s">Associate</span></p>
          </a>
        </li>
      </ul>
    </section>
    <section class="openings-section opening opening--grouped js-group">
      <header class="opening-header">
        <ul class="list--dotted title-list">
          <li><h3 class="opening-title title display--inline-block text--default spl-text-h5">Broomfield, CO</h3></li>
          <li><span class="title">1 job</span></li>
        </ul>
      </header>
      <ul class="opening-jobs grid--gutter padding--none js-group-list">
        <li class="opening-job job column wide-7of16 medium-1of2">
          <a href="https://jobs.smartrecruiters.com/Betsol/744000137153100-it-support-engineer" class="link--block details js-job-ad-link">
            <h4 class="details-title job-title link--block-target spl-text-h6">IT Support Engineer</h4>
            <p class="details-desc job-desc"><span class="margin--right--s">Mid-Senior Level</span></p>
          </a>
        </li>
      </ul>
    </section>
  </body>
</html>
`

test('NextComm Corporation fail-closed scraper validates the redirect shell and parking lander', async () => {
  const nextComm = await loadModule('../nextcommcorporation/script.js')
  const requestedUrls = []

  assert.equal(nextComm.hasRedirectShellSignal(nextCommRedirectHtml), true)
  assert.equal(nextComm.hasParkingLanderSignal(nextCommLanderHtml), true)

  const jobs = await nextComm.createNextCommCorporationScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === nextComm.HOMEPAGE_URL) return nextCommRedirectHtml
      if (url === nextComm.CAREERS_URL) return nextCommRedirectHtml
      if (url === nextComm.LANDER_URL) return nextCommLanderHtml
      throw new Error(`Unexpected NextComm URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    nextComm.HOMEPAGE_URL,
    nextComm.CAREERS_URL,
    nextComm.LANDER_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Mobileum scraper validates the first-party iframe handoff and filters the public vacancy table to India', async () => {
  const mobileum = await loadModule('../mobileum/script.js')
  const requestedUrls = []

  assert.equal(mobileum.hasOfficialCareersSignal(mobileumCareersHtml), true)
  assert.equal(mobileum.hasRecruitTableSignal(mobileumRecruitHtml), true)
  assert.deepEqual(
    mobileum.extractJobsFromRecruitHtml(mobileumRecruitHtml).map((job) => job.title),
    ['Senior Director - Technical Delivery', 'Technical Delivery Manager'],
  )

  const jobs = await mobileum.createMobileumScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === mobileum.CAREERS_URL) return mobileumCareersHtml
      if (url === mobileum.RECRUIT_URL) return mobileumRecruitHtml
      throw new Error(`Unexpected Mobileum URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [mobileum.CAREERS_URL, mobileum.RECRUIT_URL])
  assert.deepEqual(jobs, [])
})

test('StrategicERP scraper returns normalized first-party position cards', async () => {
  const strategicErp = await loadModule('../strategicerp/script.js')

  assert.equal(strategicErp.hasOfficialCareersSignal(strategicErpCareersHtml), true)
  assert.deepEqual(
    strategicErp.extractPositionCards(strategicErpCareersHtml).map((job) => job.title),
    ['Implementation Consultant', 'Customer Success Executive'],
  )

  const jobs = await strategicErp.createStrategicErpScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, strategicErp.CAREERS_URL)
      return strategicErpCareersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Customer Success Executive')
  assert.equal(jobs[0].location, 'Mumbai')
  assert.equal(jobs[0].employmentType, 'Fulltime')
  assert.equal(jobs[1].applyUrl, 'https://www.strategicerp.com/job_details.php?id=3')
  assert.equal(jobs[1].experienceRequired, '2 year')
})

test('McAfee fail-closed scraper validates the careers shell and non-enumerable search wrapper', async () => {
  const mcafee = await loadModule('../mcafee/script.js')
  const requestedUrls = []

  assert.equal(mcafee.hasJoinShellSignal(mcafeeJoinHtml), true)
  assert.equal(
    mcafee.hasNonEnumerableSearchShellSignal({
      status: 200,
      html: mcafeeSearchShellHtml,
    }),
    true,
  )

  const jobs = await mcafee.createMcAfeeScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === mcafee.JOIN_URL) {
        return { status: 200, url, html: mcafeeJoinHtml }
      }
      if (url === mcafee.SEARCH_RESULTS_URL) {
        return { status: 200, url, html: mcafeeSearchShellHtml }
      }
      throw new Error(`Unexpected McAfee URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [mcafee.JOIN_URL, mcafee.SEARCH_RESULTS_URL])
  assert.deepEqual(jobs, [])
})

test('Betsol scraper returns India jobs from the verified exact-name SmartRecruiters board', async () => {
  const betsol = await loadModule('../betsol/script.js')

  assert.equal(betsol.hasVerifiedBoardSignal(betsolBoardHtml), true)
  assert.deepEqual(
    betsol.extractBoardJobs(betsolBoardHtml).map((job) => job.title),
    [
      'Telecom Voice Operations Engineer',
      'ServiceNow QA Engineer',
      'NOC Technician',
      'IT Support Engineer',
    ],
  )

  const jobs = await betsol.createBetsolScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, betsol.BOARD_URL)
      return betsolBoardHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => job.title),
    ['NOC Technician', 'ServiceNow QA Engineer', 'Telecom Voice Operations Engineer'],
  )
  assert.equal(jobs[0].location, 'Bengaluru, India')
  assert.equal(jobs[2].jobId, '744000137153001-telecom-voice-operations-engineer')
})
