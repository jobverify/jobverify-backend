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

const avizvaCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>We Aim, Learn, and Grow Each Day with Passion and Purpose</h1>
      <section class="job-card">
        <p>Program Governance</p>
        <p>3 - 5 Years</p>
        <h3>Scrum Master</h3>
        <h4>Locations</h4>
        <ul><li>Gurugram, India</li><li>Indore, India</li></ul>
        <a href="https://avizva.keka.com/careers/jobdetails/1001">Apply Now</a>
      </section>
      <section class="job-card">
        <p>Database Technologies</p>
        <p>3 - 5 Years</p>
        <h3>Development Engineer</h3>
        <h4>Locations</h4>
        <ul><li>Gurugram, India</li><li>Indore, India</li></ul>
        <a href="https://avizva.keka.com/careers/jobdetails/1002">Apply Now</a>
      </section>
      <section class="job-card">
        <p>DevOps Engineering</p>
        <p>8 - 10 Years</p>
        <h3>Lead Engineer</h3>
        <h4>Locations</h4>
        <ul><li>Gurugram, India</li><li>Indore, India</li></ul>
        <a href="https://avizva.keka.com/careers/jobdetails/1003">Apply Now</a>
      </section>
      <section class="job-card">
        <p>Design</p>
        <p>4 - 6 Years</p>
        <h3>System Analyst</h3>
        <h4>Locations</h4>
        <ul><li>Gurugram, India</li><li>Indore, India</li></ul>
        <a href="https://avizva.keka.com/careers/jobdetails/1004">Apply Now</a>
      </section>
      <p>Currently, there are no open roles matching your skills.</p>
    </main>
  </body>
</html>
`

const cdwSearchHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Job Search Results</h1>
    <p>Country</p>
    <p>India (5 jobs )</p>
    <article>
      <h4><a href="/jobs/17992081-senior-data-engineer-2">Senior Data Engineer-2</a></h4>
      <p>Technology</p>
      <p>Hyderabad, TS, India</p>
    </article>
    <article>
      <h4><a href="/jobs/17992082-senior-data-engineer-1">Senior Data Engineer-1</a></h4>
      <p>Technology</p>
      <p>Bangalore, KA, India</p>
    </article>
    <article>
      <h4><a href="/jobs/17992083-data-engineer-consultant-2">Data Engineer(Consultant)-2</a></h4>
      <p>Technology</p>
      <p>Bangalore, KA, India</p>
    </article>
    <article>
      <h4><a href="/jobs/17000000-account-executive">Account Executive</a></h4>
      <p>Business Development</p>
      <p>Virtual, TX, United States</p>
    </article>
  </body>
</html>
`

const cdwDetailByUrl = {
  'https://www.cdwjobs.com/jobs/17992081-senior-data-engineer-2': `
    <!doctype html>
    <html lang="en">
      <body>
        <h1>Senior Data Engineer-2</h1>
        <p>Job ID: R26_00002003</p>
        <p>Team: Corporate</p>
        <p>Focus Area: Technology</p>
        <p>Location: Hyderabad, TS, India</p>
        <p>Remote Type: Hybrid</p>
        <p>Date Posted: Jul 14, 2026</p>
        <h2>Description</h2>
        <p>Lead the design and delivery of modern cloud data solutions using Microsoft Fabric and Azure Data Factory.</p>
      </body>
    </html>
  `,
  'https://www.cdwjobs.com/jobs/17992082-senior-data-engineer-1': `
    <!doctype html>
    <html lang="en">
      <body>
        <h1>Senior Data Engineer-1</h1>
        <p>Job ID: R26_00002004</p>
        <p>Team: Corporate</p>
        <p>Focus Area: Technology</p>
        <p>Location: Bangalore, KA, India</p>
        <p>Remote Type: Hybrid</p>
        <p>Date Posted: Jul 14, 2026</p>
        <h2>Description</h2>
        <p>Build scalable analytics platforms with SQL, Fabric, and PySpark.</p>
      </body>
    </html>
  `,
  'https://www.cdwjobs.com/jobs/17992083-data-engineer-consultant-2': `
    <!doctype html>
    <html lang="en">
      <body>
        <h1>Data Engineer(Consultant)-2</h1>
        <p>Job ID: R26_00002006</p>
        <p>Team: Corporate</p>
        <p>Focus Area: Technology</p>
        <p>Location: Bangalore, KA, India</p>
        <p>Remote Type: Hybrid</p>
        <p>Date Posted: Jul 13, 2026</p>
        <h2>Description</h2>
        <p>Design data pipelines and modern warehousing solutions on Azure.</p>
      </body>
    </html>
  `,
}

const mavenWaveHomepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>At Atos, we accelerate intelligence to help shape a responsible, secure and AI-powered digital future.</h1>
    <a href="/en/">Atos homepage</a>
  </body>
</html>
`

const mavenWaveAlertsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Maven Wave Partners Careers</h1>
    <p>Get notified about new jobs that match your skills and let Maven Wave Partners know you're interested!</p>
    <h2>Select Job Categories</h2>
    <p>Application Development</p>
    <p>Data Analytics</p>
    <h2>Select Job Locations</h2>
    <p>Chandigarh</p>
    <p>Gurgaon</p>
    <p>India</p>
    <a href="https://jobs.jobvite.com/maven-wave-partners/jobs">Back to Current Openings</a>
  </body>
</html>
`

const vertexCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Team That’s Redefining Global Innovation</h1>
    <h2>Team Unstoppables - Join Us!</h2>
    <a href="#open-positions">View Opportunities</a>
    <section id="open-positions">
      <h3>Open Positions</h3>
      <h4>Join the Finovate Family</h4>
      <p>Financial Advisor</p>
      <p>Change Management Consultant</p>
      <p>Salesforce Process & Business Consultant/Sr. Consultant</p>
      <p>Office Manager</p>
    </section>
    <footer>
      <p>office@execor.com</p>
      <p>San Francisco, 1140 Harrison St, CA 94103</p>
    </footer>
  </body>
</html>
`

const trinamixCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Innovate with Us</h1>
    <p>Drive Digital Transformation for Customers and Advance Your Career with Oracle Cloud and AI/ML Technologies</p>
    <h2>Current Openings</h2>
    <label>Search</label>
    <input value="Enter keywords to search">
    <button>Search</button>
    <button>Reset</button>
    <h3>Didn't find your dream job?</h3>
    <a href="/submit-resume">Submit Your Resume</a>
  </body>
</html>
`

test('AVIZVA run returns normalized jobs from the verified first-party careers page', async () => {
  const avizva = await loadModule('../../scraper/avizva/script.js')

  assert.equal(avizva.hasOfficialCareersSignal(avizvaCareersHtml), true)

  const jobs = await avizva.createAvizvaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, avizva.CAREERS_URL)
      return avizvaCareersHtml
    },
  })

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Development Engineer',
    'Lead Engineer',
    'Scrum Master',
    'System Analyst',
  ])
  assert.equal(jobs[0].department, 'Database Technologies')
  assert.equal(jobs[0].experienceRequired, '3 - 5 Years')
  assert.equal(jobs[0].applyUrl, 'https://avizva.keka.com/careers/jobdetails/1002')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('CDW run returns normalized India jobs from the verified search results and detail pages', async () => {
  const cdw = await loadModule('../../scraper/cdw/script.js')
  const requestedUrls = []

  assert.equal(cdw.hasOfficialSearchResultsSignal(cdwSearchHtml), true)

  const jobs = await cdw.createCdwScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === cdw.SEARCH_URL) return cdwSearchHtml
      if (cdwDetailByUrl[url]) return cdwDetailByUrl[url]
      throw new Error(`Unexpected CDW URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    cdw.SEARCH_URL,
    'https://www.cdwjobs.com/jobs/17992081-senior-data-engineer-2',
    'https://www.cdwjobs.com/jobs/17992082-senior-data-engineer-1',
    'https://www.cdwjobs.com/jobs/17992083-data-engineer-consultant-2',
  ])
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Data Engineer(Consultant)-2',
    'Senior Data Engineer-1',
    'Senior Data Engineer-2',
  ])
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[1].team, 'Corporate')
  assert.match(jobs[2].jobDescription, /Microsoft Fabric/i)
})

test('Maven Wave Partners stays fail-closed while the public surface is limited to Atos redirect plus Jobvite alerts', async () => {
  const mavenWave = await loadModule('../../scraper/mavenwavepartners/script.js')
  const requestedUrls = []

  assert.equal(mavenWave.hasVerifiedHomepageRedirectSignal(mavenWaveHomepageHtml), true)
  assert.equal(mavenWave.hasJobAlertsSignal(mavenWaveAlertsHtml), true)

  const jobs = await mavenWave.createMavenWavePartnersScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === mavenWave.HOMEPAGE_URL) return mavenWaveHomepageHtml
      if (url === mavenWave.CAREERS_URL) return mavenWaveAlertsHtml
      throw new Error(`Unexpected Maven Wave URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [mavenWave.HOMEPAGE_URL, mavenWave.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Vertex Global Services stays fail-closed while the careers page remains contradictory and untrustworthy', async () => {
  const vertex = await loadModule('../../scraper/vertexglobalservices/script.js')

  assert.equal(vertex.hasContradictoryCareersSignal(vertexCareersHtml), true)

  const jobs = await vertex.createVertexGlobalServicesScraper().run({
    fetchText: async (url) => {
      assert.equal(url, vertex.CAREERS_URL)
      return vertexCareersHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('TRINAMIX stays fail-closed while the careers page exposes only a current-openings search shell', async () => {
  const trinamix = await loadModule('../../scraper/trinamix/script.js')

  assert.equal(trinamix.hasOfficialCareersShellSignal(trinamixCareersHtml), true)
  assert.equal(trinamix.hasServerRenderedRoleInventory(trinamixCareersHtml), false)

  const jobs = await trinamix.createTrinamixScraper().run({
    fetchText: async (url) => {
      assert.equal(url, trinamix.CAREERS_URL)
      return trinamixCareersHtml
    },
  })

  assert.deepEqual(jobs, [])
})
