import assert from 'node:assert/strict'
import test from 'node:test'

const loadCyfutureModule = async () => {
  try {
    return await import('../cyfuture/script.js')
  } catch {
    assert.fail('Expected Cyfuture scraper module at ../cyfuture/script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Data Centers | Cloud Hosting | Tech Support BPO Services – Cyfuture </title>
    <meta
      name="description"
      content="Cyfuture India Specializes in Setting up Data Centers, Provides Enterprise Cloud Storage and Cloud Hosting Solutions."
    >
    <link rel="canonical" href="https://cyfuture.com/" />
  </head>
  <body>
    <main>
      <h2>Be A Techvolutionary @ Cyfuture</h2>
      <p>At Cyfuture we push for excellence, reward practicable and implementable zeal.</p>
      <a href="https://cyfuture.com/careers.html">Explore OPPORTUNITIES</a>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Cyfuture Careers | A Place for People Who Love Innovation | Join Us</title>
    <link rel="canonical" href="https://cyfuture.com/careers.html" />
  </head>
  <body>
    <main>
      <h1>Be a part of our inevitable journey to Success</h1>
      <p>Stimulate your creative instinct by becoming a Cyfuturian.</p>
      <ul class="innerpgfxnav">
        <li><a href="why-choose-cyfuture.html">Why Choose Cyfuture?</a></li>
        <li><a href="life-cyfuture.html">Life @ Cyfuture</a></li>
        <li><a href="current-opportunities.html">Current Opportunities</a></li>
      </ul>
    </main>
  </body>
</html>
`

const currentOpportunitiesHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Opportunities at Cyfuture</title>
    <meta
      name="description"
      content="Cyfuture comprehends that every employee has a distinctive role to play."
    >
    <link rel="canonical" href="https://cyfuture.com/current-opportunities.html" />
  </head>
  <body>
    <section id="section1">
      <h2 class="main-heading">Current Opening's</h2>
    </section>
    <section class="customer-slider current-boxbg">
      <ul class="nav nav-pills currenttabbtn">
        <li class="active"><a data-toggle="pill" href="#currenttab1">Noida</a></li>
        <li><a data-toggle="pill" href="#currenttab4">Jaipur</a></li>
        <li><a data-toggle="pill" href="#currenttab5">UK</a></li>
      </ul>
      <div class="row tab-content">
        <div class="tab-pane fade in active" id="currenttab1">
          <div class="col-sm-4 col-md-4 col-xs-12">
            <div class="current-fulbox">
              <p><span class="opningbtn">1&nbsp; Opening</span></p>
              <h2>SOCIAL MEDIA EXECUTIVE / Sr EXECUTIVE</h2>
              <p class="currentborder">(Digital Marketing)</p>
              <p><strong>Experience</strong><br />3-6 years relevant experience</p>
              <p><strong>Educational Qualifications</strong><br />PostGraduate</p>
              <p class="text-center">
                <a target="_blank" href="apply-job/146/SOCIAL-MEDIA-EXECUTIVE---Sr-EXECUTIVE">View Details</a>
              </p>
            </div>
          </div>
        </div>
        <div class="tab-pane fade" id="currenttab4">
          <div class="col-sm-4 col-md-4 col-xs-12">
            <div class="current-fulbox">
              <p><span class="opningbtn">300&nbsp; Opening</span></p>
              <h2>Customer Care</h2>
              <p class="currentborder">(BPO)</p>
              <p><strong>Experience</strong><br />0-5 years relevant experience</p>
              <p><strong>Educational Qualifications</strong><br />Undergraduate/Graduate both can apply.</p>
              <p class="text-center">
                <a target="_blank" href="apply-job/93/Customer-Care">View Details</a>
              </p>
            </div>
          </div>
        </div>
        <div class="tab-pane fade" id="currenttab5">
          <div class="col-sm-4 col-md-4 col-xs-12">
            <div class="current-fulbox">
              <p><span class="opningbtn">2&nbsp; Opening</span></p>
              <h2>Account Executive</h2>
              <p class="currentborder">(Sales)</p>
              <p><strong>Experience</strong><br />4-6 years relevant experience</p>
              <p><strong>Educational Qualifications</strong><br />Graduate</p>
              <p class="text-center">
                <a target="_blank" href="apply-job/777/Account-Executive">View Details</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section>
      <div class="row uploadresue">
        <div class="col-sm-4">
          <a href="upload-resume.html" class="resumebtn"><span>Apply Now</span></a>
        </div>
      </div>
    </section>
  </body>
</html>
`

const socialMediaExecutiveDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Apply for Job ID 146 SOCIAL MEDIA EXECUTIVE   Sr EXECUTIVE</title>
    <link rel="canonical" href="https://cyfuture.com/apply-job/146/SOCIAL-MEDIA-EXECUTIVE---Sr-EXECUTIVE" />
  </head>
  <body>
    <p>Chart your career to the befitting opportunity</p>
    <div class="row career-section1 padd0 padding-all">
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Job Title</h2>
        SOCIAL MEDIA EXECUTIVE / Sr EXECUTIVE
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Job Responsibilities</h2>
        <ul>
          <li>Develop creative and engaging social media strategies.</li>
          <li>Monitor analytics and research market competition.</li>
        </ul>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Skill Requirement</h2>
        <ul>
          <li>Post Graduate with 3+ years of relevant experience.</li>
          <li>Good understanding of social media KPIs.</li>
        </ul>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Perks and Benefits</h2>
        <ul>
          <li>A modern office in a central location in Noida.</li>
          <li>Medical Insurance provided by the company.</li>
        </ul>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Recruiter Details</h2>
        <table>
          <tr><td><strong>Name: </strong></td><td>Shruti Mittal</td></tr>
          <tr><td><strong>Phone: </strong></td><td><a href="tel:8377905386">8377905386</a></td></tr>
        </table>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <a href="https://www.cyfuture.com/upload-resume.html" class="aoplnow">Apply Now</a>
      </div>
    </div>
  </body>
</html>
`

const customerCareDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Apply for Job ID 93 Customer Care</title>
    <link rel="canonical" href="https://cyfuture.com/apply-job/93/Customer-Care" />
  </head>
  <body>
    <p>Chart your career to the befitting opportunity</p>
    <div class="row career-section1 padd0 padding-all">
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Job Title</h2>
        Customer Care
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Job Responsibilities</h2>
        <ul>
          <li>Provide splendid customer services to customers in a friendly and courteous manner.</li>
          <li>Ensure that all the Company Policies and procedures are strictly complied to.</li>
        </ul>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Skill Requirement</h2>
        <ul>
          <li>Good Communication skills.</li>
          <li>Prior experience in BPO voice process shall be preferred.</li>
        </ul>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Perks and Benefits</h2>
        <ul>
          <li>Transport Facility</li>
          <li>PF &amp; ESIC</li>
        </ul>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <h2>Recruiter Details</h2>
        <table>
          <tr><td><strong>Name: </strong></td><td>Minti Bansal</td></tr>
          <tr><td><strong>Phone: </strong></td><td><a href="tel:9315191342">9315191342</a></td></tr>
        </table>
      </div>
      <div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">
        <a href="https://www.cyfuture.com/upload-resume.html" class="aoplnow">Apply Now</a>
      </div>
    </div>
  </body>
</html>
`

test('Cyfuture validates the verified homepage, careers page, and tabbed current opportunities shell', async () => {
  const cyfuture = await loadCyfutureModule()

  assert.equal(cyfuture.SOURCE, 'cyfuture')
  assert.equal(cyfuture.COMPANY, 'Cyfuture')
  assert.equal(cyfuture.HOMEPAGE_URL, 'https://cyfuture.com/')
  assert.equal(cyfuture.CAREERS_URL, 'https://cyfuture.com/careers.html')
  assert.equal(cyfuture.CURRENT_OPPORTUNITIES_URL, 'https://cyfuture.com/current-opportunities.html')
  assert.equal(cyfuture.UPLOAD_RESUME_URL, 'https://www.cyfuture.com/upload-resume.html')
  assert.equal(cyfuture.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(cyfuture.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(cyfuture.hasCurrentOpportunitiesSignal(currentOpportunitiesHtml), true)
  assert.equal(cyfuture.isIndiaLocationLabel('Noida'), true)
  assert.equal(cyfuture.isIndiaLocationLabel('Jaipur'), true)
  assert.equal(cyfuture.isIndiaLocationLabel('UK'), false)
})

test('extractCurrentOpportunities keeps only India listings from the verified first-party tabs', async () => {
  const cyfuture = await loadCyfutureModule()

  const jobs = cyfuture.extractCurrentOpportunities(currentOpportunitiesHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    jobId: '146',
    requisitionId: '146',
    title: 'SOCIAL MEDIA EXECUTIVE / Sr EXECUTIVE',
    department: 'Digital Marketing',
    location: 'Noida, Uttar Pradesh, India',
    city: 'Noida',
    country: 'India',
    experienceRequired: '3-6 years relevant experience',
    minimumQualification: 'PostGraduate',
    openingCount: 1,
    sourceUrl: 'https://cyfuture.com/apply-job/146/SOCIAL-MEDIA-EXECUTIVE---Sr-EXECUTIVE',
    applyUrl: 'https://www.cyfuture.com/upload-resume.html',
  })
  assert.equal(jobs[1].jobId, '93')
  assert.equal(jobs[1].title, 'Customer Care')
  assert.equal(jobs[1].city, 'Jaipur')
  assert.equal(jobs[1].location, 'Jaipur, Rajasthan, India')
  assert.equal(jobs[1].openingCount, 300)
})

test('extractJobDetail normalizes Cyfuture first-party job detail sections into the shared job shape', async () => {
  const cyfuture = await loadCyfutureModule()
  const listing = cyfuture.extractCurrentOpportunities(currentOpportunitiesHtml)[0]

  const detail = cyfuture.extractJobDetail(socialMediaExecutiveDetailHtml, listing)

  assert.equal(detail.jobId, '146')
  assert.equal(detail.requisitionId, '146')
  assert.equal(detail.title, 'SOCIAL MEDIA EXECUTIVE / Sr EXECUTIVE')
  assert.equal(detail.location, 'Noida, Uttar Pradesh, India')
  assert.equal(detail.city, 'Noida')
  assert.equal(detail.country, 'India')
  assert.equal(detail.department, 'Digital Marketing')
  assert.equal(detail.experienceRequired, '3-6 years relevant experience')
  assert.equal(detail.minimumQualification, 'PostGraduate')
  assert.equal(detail.preferredQualification, null)
  assert.equal(detail.employmentType, null)
  assert.equal(detail.postingDate, null)
  assert.equal(detail.closingDate, null)
  assert.deepEqual(detail.requiredSkills, [
    'Post Graduate with 3+ years of relevant experience.',
    'Good understanding of social media KPIs.',
  ])
  assert.match(detail.jobDescription, /Develop creative and engaging social media strategies\./i)
  assert.match(detail.jobDescription, /Medical Insurance provided by the company\./i)
  assert.equal(detail.applyUrl, 'https://www.cyfuture.com/upload-resume.html')
  assert.equal(
    detail.sourceUrl,
    'https://cyfuture.com/apply-job/146/SOCIAL-MEDIA-EXECUTIVE---Sr-EXECUTIVE',
  )
})

test('run validates the verified first-party Cyfuture surfaces and returns only India jobs', async () => {
  const cyfuture = await loadCyfutureModule()
  const requestedUrls = []
  const scraper = cyfuture.createCyfutureScraper({
    now: () => '2026-07-14T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === cyfuture.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === cyfuture.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === cyfuture.CURRENT_OPPORTUNITIES_URL) {
        return { status: 200, url, html: currentOpportunitiesHtml }
      }

      if (url === 'https://cyfuture.com/apply-job/146/SOCIAL-MEDIA-EXECUTIVE---Sr-EXECUTIVE') {
        return { status: 200, url, html: socialMediaExecutiveDetailHtml }
      }

      if (url === 'https://cyfuture.com/apply-job/93/Customer-Care') {
        return { status: 200, url, html: customerCareDetailHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    cyfuture.HOMEPAGE_URL,
    cyfuture.CAREERS_URL,
    cyfuture.CURRENT_OPPORTUNITIES_URL,
    'https://cyfuture.com/apply-job/146/SOCIAL-MEDIA-EXECUTIVE---Sr-EXECUTIVE',
    'https://cyfuture.com/apply-job/93/Customer-Care',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Cyfuture')
  assert.equal(jobs[0].source, 'cyfuture')
  assert.equal(jobs[0].link, 'https://www.cyfuture.com/upload-resume.html')
  assert.equal(jobs[0].scrapedAt, '2026-07-14T00:00:00.000Z')
  assert.equal(jobs[1].title, 'Customer Care')
  assert.equal(jobs[1].city, 'Jaipur')
})

test('Cyfuture fails closed when the verified openings page or detail apply handoff changes materially', async () => {
  const cyfuture = await loadCyfutureModule()

  await assert.rejects(
    cyfuture.createCyfutureScraper().run({
      fetchPage: async (url) => {
        if (url === cyfuture.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === cyfuture.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === cyfuture.CURRENT_OPPORTUNITIES_URL) {
          return { status: 200, url, html: '<html><body><h1>Current Opportunities</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified current opportunities/i,
  )

  await assert.rejects(
    cyfuture.createCyfutureScraper().run({
      fetchPage: async (url) => {
        if (url === cyfuture.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === cyfuture.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === cyfuture.CURRENT_OPPORTUNITIES_URL) {
          return { status: 200, url, html: currentOpportunitiesHtml }
        }

        if (url === 'https://cyfuture.com/apply-job/146/SOCIAL-MEDIA-EXECUTIVE---Sr-EXECUTIVE') {
          return {
            status: 200,
            url,
            html: socialMediaExecutiveDetailHtml.replace('https://www.cyfuture.com/upload-resume.html', '#apply'),
          }
        }

        if (url === 'https://cyfuture.com/apply-job/93/Customer-Care') {
          return { status: 200, url, html: customerCareDetailHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified first-party job detail/i,
  )
})
