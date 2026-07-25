import assert from 'node:assert/strict'
import test from 'node:test'

const loadTalentiseGlobalModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Talentise Global scraper module at ./script.js')
  }
}

const officialHomepageHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Talentise Global Pvt. Ltd</title>
  </head>
  <body>
    <header>
      <a href="https://talentiseglobal.com/content/mobile_login_view">Login | Register</a>
      <a href="https://talentiseglobal.com/student/login">Candidate Login</a>
      <a href="https://talentiseglobal.com/student">Candidate Register</a>
      <a href="mailto:teamtalentise@talentiseglobal.com">teamtalentise@talentiseglobal.com</a>
    </header>
    <main>
      <h1>Connecting Talents</h1>
      <h2>With Opportunities</h2>
      <section>
        <h3>Welcome to Talentise Global Pvt. Ltd</h3>
        <p>We are a young and creative company and we offer you fresh HR ideas.</p>
      </section>
      <ul>
        <li>End to End Campus Recruitment Support</li>
        <li>Customized Talent Acquisition</li>
        <li>Proctored Examination Service</li>
        <li>Training &amp; Development</li>
      </ul>
      <section>
        <h3>Services We Provide</h3>
        <p>Corporates</p>
        <p>Institutes</p>
        <p>Students</p>
      </section>
    </main>
  </body>
</html>
`

const candidatePortalHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Talentise Global Pvt. Ltd</title>
  </head>
  <body>
    <main>
      <h1>Are you Looking for a Job?</h1>
      <p>You can register or Login on Talentise Global Pvt. Ltd to start your job search.</p>
      <p>Jobseeker Login</p>
      <a href="https://talentiseglobal.com/student/login">Candidate Login</a>
      <a href="https://talentiseglobal.com/student">Register</a>
      <h2>I am an Employer</h2>
      <h2>I am an Institute</h2>
    </main>
  </body>
</html>
`

const candidateLoginHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Talentise Global Pvt. Ltd</title>
  </head>
  <body>
    <main>
      <h1>Candidate Login</h1>
      <p>Login to continue to our application</p>
      <form action="https://talentiseglobal.com/student/login" method="post">
        <input type="email" name="email">
        <input type="password" name="password">
      </form>
      <a href="https://talentiseglobal.com/student">Create your candidate profile</a>
    </main>
  </body>
</html>
`

const candidateSignupHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Talentise Global Pvt. Ltd</title>
  </head>
  <body>
    <main>
      <h1>Sign Up As Candidate</h1>
      <p>Appeared class 12 ?</p>
      <p>Are you a Corporate</p>
      <p>Are you an Institute</p>
      <a href="https://talentiseglobal.com/student/login">Already registered? Login</a>
    </main>
  </body>
</html>
`

const missingCareersRouteHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Talentise Global Pvt. Ltd</title>
  </head>
  <body>
    <main>
      <h1>Error 404</h1>
      <h2>Oops! Page not found.</h2>
      <a href="https://talentiseglobal.com/content/mobile_login_view">Login | Register</a>
      <a href="https://talentiseglobal.com/student/login">Candidate Login</a>
      <a href="https://talentiseglobal.com/student">Candidate Register</a>
    </main>
    <footer>
      <h3>Quick Links</h3>
      <h3>Services</h3>
      <h3>FAQ</h3>
      <h3>Important Links</h3>
    </footer>
  </body>
</html>
`

const publicJobsHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Talentise Global Careers</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Campus Recruiter"}
    </script>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <p>Search jobs across our public hiring board.</p>
      <p>Job ID: TG-101</p>
      <a href="https://jobs.lever.co/talentiseglobal/campus-recruiter">Apply now</a>
    </main>
  </body>
</html>
`

test('Talentise Global sentinel exports the verified first-party no-public-jobs contract', async () => {
  const talentiseGlobal = await loadTalentiseGlobalModule()

  assert.equal(talentiseGlobal.SOURCE, 'talentiseglobal')
  assert.equal(talentiseGlobal.COMPANY, 'TALENTISE GLOBAL')
  assert.equal(talentiseGlobal.HOMEPAGE_URL, 'https://talentiseglobal.com/')
  assert.equal(talentiseGlobal.CANDIDATE_PORTAL_URL, 'https://talentiseglobal.com/content/mobile_login_view')
  assert.equal(talentiseGlobal.CANDIDATE_LOGIN_URL, 'https://talentiseglobal.com/student/login')
  assert.equal(talentiseGlobal.CANDIDATE_SIGNUP_URL, 'https://talentiseglobal.com/student')
  assert.deepEqual(talentiseGlobal.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://talentiseglobal.com/careers',
    'https://talentiseglobal.com/careers/',
    'https://talentiseglobal.com/career',
    'https://talentiseglobal.com/career/',
    'https://talentiseglobal.com/jobs',
    'https://talentiseglobal.com/jobs/',
    'https://talentiseglobal.com/openings',
    'https://talentiseglobal.com/openings/',
    'https://talentiseglobal.com/current-openings',
    'https://talentiseglobal.com/current-openings/',
    'https://talentiseglobal.com/join-us',
    'https://talentiseglobal.com/join-us/',
  ])
  assert.equal(talentiseGlobal.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(talentiseGlobal.hasCandidatePortalSignal(candidatePortalHtml), true)
  assert.equal(talentiseGlobal.hasCandidateLoginSignal(candidateLoginHtml), true)
  assert.equal(talentiseGlobal.hasCandidateSignupSignal(candidateSignupHtml), true)
  assert.equal(talentiseGlobal.hasPublicJobListingsSignal(officialHomepageHtml), false)
  assert.equal(talentiseGlobal.hasPublicJobListingsSignal(candidatePortalHtml), false)
  assert.equal(talentiseGlobal.hasPublicJobListingsSignal(publicJobsHtml), true)
  assert.equal(
    talentiseGlobal.isVerifiedMissingCareersRoute({
      status: 200,
      url: talentiseGlobal.NO_PUBLIC_CAREERS_ROUTE_URLS[0],
      html: missingCareersRouteHtml,
    }),
    true,
  )
})

test('Talentise Global sentinel returns no jobs only while the verified first-party candidate surface and branded 404 routes stay stable', async () => {
  const talentiseGlobal = await loadTalentiseGlobalModule()
  const requestedUrls = []

  const jobs = await talentiseGlobal.createTalentiseGlobalScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === talentiseGlobal.HOMEPAGE_URL) {
        return { status: 200, url, html: officialHomepageHtml }
      }

      if (url === talentiseGlobal.CANDIDATE_PORTAL_URL) {
        return { status: 200, url, html: candidatePortalHtml }
      }

      if (url === talentiseGlobal.CANDIDATE_LOGIN_URL) {
        return { status: 200, url, html: candidateLoginHtml }
      }

      if (url === talentiseGlobal.CANDIDATE_SIGNUP_URL) {
        return { status: 200, url, html: candidateSignupHtml }
      }

      if (talentiseGlobal.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 200, url, html: missingCareersRouteHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    talentiseGlobal.HOMEPAGE_URL,
    talentiseGlobal.CANDIDATE_PORTAL_URL,
    talentiseGlobal.CANDIDATE_LOGIN_URL,
    talentiseGlobal.CANDIDATE_SIGNUP_URL,
    ...talentiseGlobal.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Talentise Global sentinel fails closed when the verified surface changes or starts exposing public jobs', async () => {
  const talentiseGlobal = await loadTalentiseGlobalModule()

  await assert.rejects(
    talentiseGlobal.createTalentiseGlobalScraper().run({
      fetchPage: async (url) => {
        if (url === talentiseGlobal.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Unexpected</title></head><body><h1>Unexpected</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    talentiseGlobal.createTalentiseGlobalScraper().run({
      fetchPage: async (url) => {
        if (url === talentiseGlobal.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === talentiseGlobal.CANDIDATE_PORTAL_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /candidate portal/i,
  )

  await assert.rejects(
    talentiseGlobal.createTalentiseGlobalScraper().run({
      fetchPage: async (url) => {
        if (url === talentiseGlobal.HOMEPAGE_URL) {
          return { status: 200, url, html: officialHomepageHtml }
        }

        if (url === talentiseGlobal.CANDIDATE_PORTAL_URL) {
          return { status: 200, url, html: candidatePortalHtml }
        }

        if (url === talentiseGlobal.CANDIDATE_LOGIN_URL) {
          return { status: 200, url, html: candidateLoginHtml }
        }

        if (url === talentiseGlobal.CANDIDATE_SIGNUP_URL) {
          return { status: 200, url, html: candidateSignupHtml }
        }

        if (url === talentiseGlobal.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        if (talentiseGlobal.NO_PUBLIC_CAREERS_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 200, url, html: missingCareersRouteHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /no-public-careers route changed materially|public job listings/i,
  )
})
