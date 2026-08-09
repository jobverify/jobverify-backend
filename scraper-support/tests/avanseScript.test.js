import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Avanse Financial Services: NBFC Education Loan for Students</title>
  </head>
  <body>
    <main>
      <nav>
        <a href="/career" class="nav-link">Careers</a>
      </nav>
      <a href="https://customerportal.avanse.com/apply-now?utm_source=Organic&utm_campaign=Header" id="apply-header">Apply Now</a>
      <footer>
        <a href="/career">Careers</a>
      </footer>
    </main>
  </body>
</html>
`

const careerShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career At Avanse Financial Services</title>
    <meta name="description" content="Explore job opportunities for different roles and responsibilities at Avanse Financial Services">
    <link rel="canonical" href="https://www.avanse.com/career" />
  </head>
  <body>
    <main>
      <nav>
        <a href="/career">Careers</a>
        <a href="https://customerportal.avanse.com/apply-now?utm_source=Organic&utm_campaign=Header">Apply Now</a>
        <a href="https://www.linkedin.com/company/avanse-financial-services-ltd/">LinkedIn</a>
      </nav>
      <section>
        <h2><span>Job Openings</span></h2>
        <p>Discover your new career</p>
        <select id="job-cities" onChange="renderJobs(document.getElementById('job-cities').value)">
          <option>Please select city</option>
          <option value="mumbai">Mumbai</option>
          <option value="ahmedabad">Ahmedabad</option>
          <option value="chandigarh">Chandigarh</option>
          <option value="bangalore">Bangalore</option>
          <option value="others">Others</option>
        </select>
      </section>

      <div id="jobCardContainer" class="row s_service_info">
        <div class="col-lg-4 col-sm-6">
          <div class="s_service_item latest_job_box">
            <h5>Branch Sales Manager- Overseas</h5>
            <p>Ensure the target set is achieved. Motivate and monitor the team performance.</p>
            <a href="#" class="learn_btn_two">Learn More</a>
          </div>
        </div>
        <div class="col-lg-4 col-sm-6">
          <div class="s_service_item latest_job_box">
            <h5>Contact Centre Manager</h5>
            <p>Responsible for seamless customer service and complaint management through contact centre.</p>
            <a href="#" class="learn_btn_two">Learn More</a>
          </div>
        </div>
        <div class="col-lg-4 col-sm-6">
          <div class="s_service_item latest_job_box">
            <h5>HR Business Partner</h5>
            <p>As a Corporate HRBP, you will be responsible for end to end employee life cycle.</p>
            <a href="#" class="learn_btn_two">Learn More</a>
          </div>
        </div>
      </div>

      <script>
        function renderJobs(city) {
          let urlForAllJobs = window.location.origin + "/public/api/getAllJobs";
          urlForAllJobs = urlForAllJobs + '?city=' + city;
          let http = new XMLHttpRequest();
          http.open('GET', urlForAllJobs);
          http.onloadend = () => {
            let listOfJobs = JSON.parse(http.responseText);
            for (let job of listOfJobs) {
              jobContainer.innerHTML = jobContainer.innerHTML + '<div><h5>' + job.jobTitle + '</h5><p>' + job.jobDescription + '</p><a target="_blank" href="' + job.applyUrl + '" class="btn_six">Apply Now</a></div>';
            }
          }
          http.send();
        }
        renderJobs('mumbai');
      </script>
    </main>
  </body>
</html>
`

const gatewayTimeoutHtml = `
<html>
  <head><title>504 Gateway Time-out</title></head>
  <body>
    <center><h1>504 Gateway Time-out</h1></center>
  </body>
</html>
`

const notFoundHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>404 - Error</title>
  </head>
  <body>
    <h1>Like The Fact That This Page Doesn't Exist.</h1>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career At Avanse Financial Services</title>
  </head>
  <body>
    <main>
      <section>
        <h2><span>Job Openings</span></h2>
      </section>
      <div id="jobCardContainer">
        <div class="latest_job_box">
          <h5>Regional Sales Manager</h5>
          <p>Lead branch growth.</p>
          <a target="_blank" href="https://jobs.example.com/avanse/regional-sales-manager" class="btn_six">Apply Now</a>
        </div>
      </div>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/avanse/script.js')
  } catch {
    assert.fail('Expected Avanse scraper module at ../../scraper/avanse/script.js')
  }
}

test('Avanse constants and parsers stay pinned to the verified fail-closed careers shell contract', async () => {
  const avanse = await loadModule()

  assert.equal(avanse.COMPANY, 'Avanse')
  assert.equal(avanse.OFFICIAL_BRAND_NAME, 'Avanse Financial Services')
  assert.equal(avanse.SOURCE, 'avanse')
  assert.equal(avanse.VERIFIED_AT, '2026-07-15')
  assert.equal(avanse.HOMEPAGE_URL, 'https://www.avanse.com/')
  assert.equal(avanse.CAREERS_URL, 'https://www.avanse.com/career')
  assert.equal(
    avanse.JOBS_API_URL,
    'https://www.avanse.com/public/api/getAllJobs?city=mumbai',
  )
  assert.deepEqual(avanse.NO_TRUST_PUBLIC_JOB_ROUTE_URLS, [
    'https://www.avanse.com/careers',
    'https://www.avanse.com/careers/',
    'https://www.avanse.com/jobs',
    'https://www.avanse.com/jobs/',
    'https://www.avanse.com/work-with-us',
    'https://www.avanse.com/join-us',
  ])
  assert.equal(avanse.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(avanse.extractCareersUrl(homepageHtml), 'https://www.avanse.com/career')
  assert.equal(avanse.hasUnreliableJobsShellSignal(careerShellHtml), true)
  assert.equal(avanse.careerPageExposesTrustworthyPublicJobs(careerShellHtml), false)
  assert.equal(avanse.careerPageExposesTrustworthyPublicJobs(publicJobsHtml), true)
  assert.equal(
    avanse.isVerifiedJobsApiGatewayTimeout(
      {
        status: 504,
        url: 'https://www.avanse.com/public/api/getAllJobs?city=mumbai',
        html: gatewayTimeoutHtml,
      },
      'https://www.avanse.com/public/api/getAllJobs?city=mumbai',
    ),
    true,
  )
  assert.equal(
    avanse.isVerifiedJobsApiGatewayTimeout(
      {
        url: 'https://www.avanse.com/public/api/getAllJobs?city=mumbai',
        error: new DOMException('This operation was aborted', 'AbortError'),
      },
      'https://www.avanse.com/public/api/getAllJobs?city=mumbai',
    ),
    true,
  )
  assert.equal(
    avanse.isVerifiedNoTrustPublicJobRoute(
      {
        status: 404,
        url: 'https://www.avanse.com/jobs',
        html: notFoundHtml,
      },
      'https://www.avanse.com/jobs',
    ),
    true,
  )
  assert.equal(
    avanse.isVerifiedNoTrustPublicJobRoute(
      {
        status: 404,
        url: 'https://www.avanse.com/jobs',
        html: notFoundHtml,
      },
      'https://www.avanse.com/jobs/',
    ),
    true,
  )
})

test('Avanse returns no jobs only while the verified careers shell stays non-actionable and the jobs API remains timed out', async () => {
  const avanse = await loadModule()
  const requestedUrls = []

  const jobs = await avanse.createAvanseScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === avanse.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === avanse.CAREERS_URL) {
        return { status: 200, url, html: careerShellHtml }
      }

      if (url === avanse.JOBS_API_URL) {
        return { status: 504, url, html: gatewayTimeoutHtml }
      }

      if (avanse.NO_TRUST_PUBLIC_JOB_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: notFoundHtml }
      }

      throw new Error(`Unexpected Avanse URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    avanse.HOMEPAGE_URL,
    avanse.CAREERS_URL,
    avanse.JOBS_API_URL,
    ...avanse.NO_TRUST_PUBLIC_JOB_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Avanse fails closed when the homepage, careers shell, jobs API, or alternate routes drift into a trustworthy public jobs surface', async () => {
  const avanse = await loadModule()

  await assert.rejects(
    avanse.createAvanseScraper().run({
      fetchPage: async (url) => {
        if (url === avanse.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Placeholder</title></head><body>Welcome</body></html>',
          }
        }

        throw new Error(`Unexpected Avanse URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    avanse.createAvanseScraper().run({
      fetchPage: async (url) => {
        if (url === avanse.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avanse.CAREERS_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected Avanse URL: ${url}`)
      },
    }),
    /trustworthy public jobs surface|career jobs shell/i,
  )

  await assert.rejects(
    avanse.createAvanseScraper().run({
      fetchPage: async (url) => {
        if (url === avanse.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avanse.CAREERS_URL) {
          return { status: 200, url, html: careerShellHtml }
        }

        if (url === avanse.JOBS_API_URL) {
          return { status: 200, url, html: '[{"jobTitle":"Regional Sales Manager","applyUrl":"https://jobs.example.com/avanse/regional-sales-manager"}]' }
        }

        throw new Error(`Unexpected Avanse URL: ${url}`)
      },
    }),
    /verified first-party jobs api/i,
  )

  await assert.rejects(
    avanse.createAvanseScraper().run({
      fetchPage: async (url) => {
        if (url === avanse.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === avanse.CAREERS_URL) {
          return { status: 200, url, html: careerShellHtml }
        }

        if (url === avanse.JOBS_API_URL) {
          return { status: 504, url, html: gatewayTimeoutHtml }
        }

        if (url === avanse.NO_TRUST_PUBLIC_JOB_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        if (avanse.NO_TRUST_PUBLIC_JOB_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 404, url, html: notFoundHtml }
        }

        throw new Error(`Unexpected Avanse URL: ${url}`)
      },
    }),
    /verified no-trust public job route changed/i,
  )
})
