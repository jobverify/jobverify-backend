import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  EXPECTED_ROLE_APPLY_URLS,
  HOMEPAGE_URL,
  MISSING_ROUTE_URLS,
  RESUME_SUBMISSION_URL,
  SITEMAP_URL,
  SOURCE,
  createCrimsonEnergyExpertsScraper,
  extractJobs,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
  hasOfficialSitemapSignal,
  hasVerifiedCareersLink,
  isVerifiedMissingRoute,
} from './script.js'

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Crimson Energy</title>
    <meta
      name="description"
      content="Crimson Energy specializes in delivering innovative, tailor-made solutions across a broad spectrum of industries."
    />
    <link rel="canonical" href="https://crimsonenergy.in" />
  </head>
  <body>
    <div class="logo-main">
      <p id="logotext">Crimson Energy <br />Experts Pvt ltd.</p>
    </div>
    <nav>
      <a href="/careers.html">Careers</a>
    </nav>
    <section>
      <p>
        As a trusted partner of the Indian Navy, BARC and DRDO, we have consistently delivered impactful solutions,
        ensuring mission success.
      </p>
    </section>
    <footer>© 2026 Crimson Energy Experts Pvt Ltd CIN: U74900PN2012PTC143507</footer>
  </body>
</html>
`

const SITEMAP_XML = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://crimsonenergy.in/</loc></url>
  <url><loc>https://crimsonenergy.in/contact.html</loc></url>
  <url><loc>https://crimsonenergy.in/careers.html</loc></url>
</urlset>
`

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Crimson Energy</title>
  </head>
  <body>
    <a href="/careers.html">Careers</a>
    <div class="page" id="careers-page">
      <section class="hero-sec">
        <h1>We're Hiring.</h1>
        <p>We welcome top talent to join Crimson, where we value excellence and create meaningful impact.</p>
      </section>
      <section id="advance-with-us">
        <h5>Careers</h5>
        <h2>Advance with us</h2>
        <p>
          The key tenet of our business is to seek out the best talent—individuals who are driven, innovative, and eager
          to make a measurable impact at Crimson Energy. We are committed to delivering exceptional value to our clients and
          are constantly scouting for skilled professionals to join our dynamic and fast-growing team.
        </p>
      </section>
      <section id="opportunities">
        <h5>Careers</h5>
        <h2>Opportunities at Crimson</h2>
        <div class="oprt oprt-even">
          <div class="oprt-txt">
            <h3>Artificial Intelligence (AI) &amp; Machine Learning</h3>
            <p>
              Work on cutting-edge AI and machine learning solutions that drive defence-sector innovation. Develop advanced
              threat detection algorithms, build LLM-powered intelligence analysis tools and create AI-driven mission
              support systems to enhance security and decision-making in critical operations.
            </p>
          </div>
          <a href="https://forms.gle/VUiYLf88LjmD7Yzu7"><button><label>Apply Now</label></button></a>
        </div>
        <div class="oprt oprt-odd">
          <div class="oprt-txt">
            <h3>Engineering</h3>
            <p>
              Develop and optimize solutions in nuclear, mechanical, marine and electrical engineering. Work on the design
              and improvement of systems that enhance performance, ensure safety and increase reliability in demanding
              environments.
            </p>
          </div>
          <a href="https://forms.gle/vSaNLFnoWJRb1SDX6"><button><label>Apply Now</label></button></a>
        </div>
        <div class="oprt oprt-even">
          <div class="oprt-txt">
            <h3>Software Engineering</h3>
            <p>
              Design, build and optimize applications across frontend, backend or full-stack development. Work with
              JavaScript, TypeScript, Python, Java and SQL to create scalable and efficient solutions that drive our
              operations.
            </p>
          </div>
          <a href="https://forms.gle/Z9THYAeU2FEvCPm39"><button><label>Apply Now</label></button></a>
        </div>
        <div class="oprt oprt-odd">
          <div class="oprt-txt">
            <h3>Finance</h3>
            <p>
              Support strategic growth by managing financial planning, risk assessment and budgeting. Work on optimizing
              resource allocation, improving financial forecasting and ensuring compliance to drive the company's success.
            </p>
          </div>
          <a href="https://forms.gle/snCnLta42UzacbCSA"><button><label>Apply Now</label></button></a>
        </div>
      </section>
      <section class="crrs-open" id="open-positions">
        <h3>Don’t see a role that fits?</h3>
        <p>Send us your resume – we’re always on the lookout for great talent!</p>
        <a href="${RESUME_SUBMISSION_URL}"><button><label>Submit Resume</label></button></a>
      </section>
    </div>
    <footer>
      <a href="//in.linkedin.com/company/crimson-energy-experts-pvt-ltd">LinkedIn</a>
      <a href="mailto:info@crimsonenergy.in">info@crimsonenergy.in</a>
      <div>© 2026 Crimson Energy Experts Pvt Ltd CIN: U74900PN2012PTC143507</div>
    </footer>
  </body>
</html>
`

const MISSING_ROUTE_HTML = `
<!doctype html>
<html lang="en-us">
  <head>
    <title>This Page Does Not Exist</title>
    <meta name="description" content="Oops, looks like the page is lost." />
  </head>
  <body>
    <div class="page-not-found">
      <h1 class="title">This Page Does Not Exist</h1>
      <p class="text">
        Sorry, the page you are looking for could not be found. It's just an accident that was not intentional.
      </p>
    </div>
  </body>
</html>
`

test('Crimson Energy Experts verifies the homepage, sitemap, careers page, and known missing-route shell', () => {
  assert.equal(hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(hasVerifiedCareersLink(HOMEPAGE_HTML), true)
  assert.equal(hasOfficialSitemapSignal(SITEMAP_XML), true)
  assert.equal(hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.equal(isVerifiedMissingRoute({ status: 404, html: MISSING_ROUTE_HTML }), true)
})

test('Crimson Energy Experts extracts the verified public role cards and their apply links', () => {
  const jobs = extractJobs(CAREERS_HTML)

  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      applyUrl: job.applyUrl,
      location: job.location,
      country: job.country,
      company: job.company,
    })),
    [
      {
        title: 'Artificial Intelligence (AI) & Machine Learning',
        applyUrl: EXPECTED_ROLE_APPLY_URLS['Artificial Intelligence (AI) & Machine Learning'],
        location: 'India',
        country: 'India',
        company: COMPANY,
      },
      {
        title: 'Engineering',
        applyUrl: EXPECTED_ROLE_APPLY_URLS.Engineering,
        location: 'India',
        country: 'India',
        company: COMPANY,
      },
      {
        title: 'Software Engineering',
        applyUrl: EXPECTED_ROLE_APPLY_URLS['Software Engineering'],
        location: 'India',
        country: 'India',
        company: COMPANY,
      },
      {
        title: 'Finance',
        applyUrl: EXPECTED_ROLE_APPLY_URLS.Finance,
        location: 'India',
        country: 'India',
        company: COMPANY,
      },
    ],
  )

  assert.match(
    jobs[0].jobDescription,
    /LLM-powered intelligence analysis tools/i,
  )
  assert.match(
    jobs[3].jobDescription,
    /financial forecasting/i,
  )
})

test('Crimson Energy Experts fails closed when a verified role mapping drifts', () => {
  const driftedCareersHtml = CAREERS_HTML.replace(
    'https://forms.gle/snCnLta42UzacbCSA',
    'https://forms.gle/example-drift',
  )

  assert.throws(
    () => extractJobs(driftedCareersHtml),
    /role mapping drifted/i,
  )
})

test('Crimson Energy Experts run() validates the first-party surfaces and returns four jobs', async () => {
  const scraper = createCrimsonEnergyExpertsScraper({ now: () => '2026-07-11T01:00:00.000Z' })
  const fetchCounts = new Map()

  const fetchPage = async (url) => {
    fetchCounts.set(url, (fetchCounts.get(url) || 0) + 1)

    if (url === HOMEPAGE_URL) return { status: 200, url, html: HOMEPAGE_HTML }
    if (url === SITEMAP_URL) return { status: 200, url, html: SITEMAP_XML }
    if (url === CAREERS_URL) return { status: 200, url, html: CAREERS_HTML }
    if (MISSING_ROUTE_URLS.includes(url)) return { status: 404, url, html: MISSING_ROUTE_HTML }

    throw new Error(`Unexpected URL ${url}`)
  }

  const jobs = await scraper.run({ fetchPage })

  assert.equal(jobs.length, 4)
  assert.deepEqual(
    jobs.map((job) => [job.source, job.link, job.companyCareerPage, job.companyDomain, job.atsPlatform]),
    [
      [
        SOURCE,
        'https://forms.gle/VUiYLf88LjmD7Yzu7',
        CAREERS_URL,
        'crimsonenergy.in',
        'official-company-careers',
      ],
      [
        SOURCE,
        'https://forms.gle/vSaNLFnoWJRb1SDX6',
        CAREERS_URL,
        'crimsonenergy.in',
        'official-company-careers',
      ],
      [
        SOURCE,
        'https://forms.gle/Z9THYAeU2FEvCPm39',
        CAREERS_URL,
        'crimsonenergy.in',
        'official-company-careers',
      ],
      [
        SOURCE,
        'https://forms.gle/snCnLta42UzacbCSA',
        CAREERS_URL,
        'crimsonenergy.in',
        'official-company-careers',
      ],
    ],
  )
  assert.ok(jobs.every((job) => job.scrapedAt === '2026-07-11T01:00:00.000Z'))
  assert.equal(fetchCounts.get(HOMEPAGE_URL), 1)
  assert.equal(fetchCounts.get(SITEMAP_URL), 1)
  assert.equal(fetchCounts.get(CAREERS_URL), 1)
  assert.equal(
    MISSING_ROUTE_URLS.every((url) => fetchCounts.get(url) === 1),
    true,
  )
})
