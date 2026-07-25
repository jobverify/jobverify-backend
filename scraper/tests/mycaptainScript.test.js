import assert from 'node:assert/strict'
import test from 'node:test'

const loadMyCaptainModule = async () => {
  try {
    return await import('../mycaptain/script.js')
  } catch {
    assert.fail('Expected MyCaptain scraper module at ../mycaptain/script.js')
  }
}

const verifiedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>MyCaptain - E-Learning Platform with Job Ready &amp; Certification Programs</title>
    <meta
      name="description"
      content="Learn from real-world mentors and launch your career with MyCaptain's live programs."
    />
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/about-us">About Us</a>
      <a href="https://app.mycaptain.in/">Login</a>
    </nav>
    <main>
      <h1>Transform your Career with</h1>
      <ul>
        <li>Live Programs</li>
        <li>Stellar Captains</li>
        <li>Job Assistance</li>
        <li>MyCaptain</li>
      </ul>
      <p><strong>3,80,000+</strong> learners already have! When will you?</p>
      <p>800+ Hiring Partners</p>
      <footer>Copyright © 2026 Imarticus Learning Pvt Ltd</footer>
    </main>
  </body>
</html>
`

const verifiedCareerHtml = `
<!doctype html>
<html lang="en">
  <head>
    <script type="text/javascript" id="zt-script-loader" async src="https://scripts.zipteams.com/v2.0/index.js"></script>
  </head>
  <body>
    <div id="__next">
      <main>
        <section class="careerBannerSection_careerBannerContainer__R4bvo">
          <h2 class="careerBannerSection_careerBannerHeading__Z4vtE mycapProHeading">Join us in creating an Impact</h2>
          <p class="careerBannerSection_careerBannerHeadingSub__lXFPE mb-0">
            We're on a mission to help people do what they truly love &amp; we’d love for you to join us
          </p>
          <button id="career_openings">See Current Openings</button>
        </section>
        <section class="jobOpenings_jobOpeningsContainer__IpKH_">
          <div class="jobOpenings_headerContainer__8U9Qd">
            <h2 class="jobOpenings_jobOpeningsHeading__RGaaW mycapProHeading">Current Job Openings</h2>
            <p class="jobOpenings_jobOpeningsHeadingSub__DPrYn mb-0">
              If you’re looking for an opportunity to showcase your talent &amp; grow, then see what you’d be a fit for
            </p>
          </div>
          <div class="jobOpenings_searchBox__NlSmU">
            <input placeholder="Search by job role" class="form-control" />
            <button id="search_job">Search</button>
          </div>
          <div class="jobOpenings_capsules_wrapper__EhFvT">
            <div class="jobOpenings_capscules__IGURz card"><div class="card-body">All departments (12)</div></div>
            <div class="jobOpenings_capscules__IGURz card"><div class="card-body">Product (7)</div></div>
            <div class="jobOpenings_capscules__IGURz card"><div class="card-body">Finance (20)</div></div>
            <div class="jobOpenings_capscules__IGURz card"><div class="card-body">Technology (10)</div></div>
          </div>
          <div class="row">
            <div class="col-md-6 col-sm-4">
              <div class="jobOpenings_jobCards__jbc_0 card">
                <div class="card-body">
                  <div class="jobOpenings_jobTitle__PS9_f card-title h5">Program Manager Executive</div>
                  <p class="nextImageBlock card-text"><img alt="location" /> <!-- -->Bangalore</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-sm-4">
              <div class="jobOpenings_jobCards__jbc_0 card">
                <div class="card-body">
                  <div class="jobOpenings_jobTitle__PS9_f card-title h5">Finance Controller</div>
                  <p class="nextImageBlock card-text"><img alt="location" /> <!-- -->Bangalore</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-sm-4">
              <div class="jobOpenings_jobCards__jbc_0 card">
                <div class="card-body">
                  <div class="jobOpenings_jobTitle__PS9_f card-title h5">Finance Controller</div>
                  <p class="nextImageBlock card-text"><img alt="location" /> <!-- -->Bangalore</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <footer>
          <a href="https://www.linkedin.com/company/mycaptain-in/">LinkedIn</a>
          <p>Copyright © 2026 Imarticus Learning Pvt Ltd</p>
        </footer>
      </main>
    </div>
    <script id="__NEXT_DATA__" type="application/json">
      {"props":{"pageProps":{}},"page":"/career","query":{},"buildId":"sDA1vobK2MokZf81M8sZc","nextExport":true,"autoExport":true}
    </script>
  </body>
</html>
`

test('MyCaptain validates the verified official homepage and first-party /career jobs surface', async () => {
  const mycaptain = await loadMyCaptainModule()

  assert.equal(mycaptain.SOURCE, 'mycaptain')
  assert.equal(mycaptain.COMPANY, 'MyCaptain')
  assert.equal(mycaptain.HOMEPAGE_URL, 'https://mycaptain.in/')
  assert.equal(mycaptain.CAREER_URL, 'https://mycaptain.in/career')
  assert.equal(mycaptain.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(mycaptain.hasOfficialCareerPageSignal(verifiedCareerHtml), true)

  assert.deepEqual(mycaptain.extractInlineJobCards(verifiedCareerHtml), [
    {
      title: 'Program Manager Executive',
      company: 'MyCaptain',
      location: 'Bangalore',
      city: 'Bangalore',
      country: 'India',
      jobId: 'mycaptain-program-manager-executive-bangalore',
      requisitionId: 'mycaptain-program-manager-executive-bangalore',
      sourceUrl: 'https://mycaptain.in/career',
      applyUrl: null,
      department: null,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
    {
      title: 'Finance Controller',
      company: 'MyCaptain',
      location: 'Bangalore',
      city: 'Bangalore',
      country: 'India',
      jobId: 'mycaptain-finance-controller-bangalore',
      requisitionId: 'mycaptain-finance-controller-bangalore',
      sourceUrl: 'https://mycaptain.in/career',
      applyUrl: null,
      department: null,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
    {
      title: 'Finance Controller',
      company: 'MyCaptain',
      location: 'Bangalore',
      city: 'Bangalore',
      country: 'India',
      jobId: 'mycaptain-finance-controller-bangalore-2',
      requisitionId: 'mycaptain-finance-controller-bangalore-2',
      sourceUrl: 'https://mycaptain.in/career',
      applyUrl: null,
      department: null,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
  ])
})

test('MyCaptain run fetches the verified homepage and /career page and returns the inline public job cards', async () => {
  const mycaptain = await loadMyCaptainModule()
  const requestedUrls = []

  const jobs = await mycaptain.createMyCaptainScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === mycaptain.HOMEPAGE_URL) return verifiedHomepageHtml
      if (url === mycaptain.CAREER_URL) return verifiedCareerHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [mycaptain.HOMEPAGE_URL, mycaptain.CAREER_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'mycaptain')
  assert.equal(jobs[0].company, 'MyCaptain')
  assert.equal(jobs[0].companyCareerPage, 'https://mycaptain.in/career')
  assert.equal(jobs[0].companyDomain, 'mycaptain.in')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].sourceUrl, 'https://mycaptain.in/career')
  assert.equal(jobs[0].applyUrl, null)
  assert.equal(jobs[0].scrapedAt, '2026-07-11T00:00:00.000Z')
  assert.equal(jobs[2].jobId, 'mycaptain-finance-controller-bangalore-2')
})

test('MyCaptain fails closed when the verified homepage or /career jobs shell drifts materially', async () => {
  const mycaptain = await loadMyCaptainModule()

  await assert.rejects(
    mycaptain.createMyCaptainScraper().run({
      fetchText: async (url) => {
        if (url === mycaptain.HOMEPAGE_URL) return '<html><title>Unexpected</title></html>'
        return verifiedCareerHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    mycaptain.createMyCaptainScraper().run({
      fetchText: async (url) => {
        if (url === mycaptain.HOMEPAGE_URL) return verifiedHomepageHtml
        return verifiedCareerHtml.replace('Current Job Openings', 'Join our team')
      },
    }),
    /verified first-party \/career page/i,
  )

  await assert.rejects(
    mycaptain.createMyCaptainScraper().run({
      fetchText: async (url) => {
        if (url === mycaptain.HOMEPAGE_URL) return verifiedHomepageHtml
        return verifiedCareerHtml.replace(/jobOpenings_jobCards__jbc_0 card/g, 'job-card')
      },
    }),
    /inline job cards/i,
  )
})
