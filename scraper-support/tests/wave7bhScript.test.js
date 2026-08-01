import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected scraper module at ${relativePath}`)
  }
}

const GREYTRIX_SENTINEL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Greytrix</title>
  </head>
  <body>
    <main>
      <h1>Launch your PROFESSIONAL JOURNEY with us!</h1>
      <h2>Join Us</h2>
      <p>With a global presence and a reputable clientele, we guarantee our employees a collaborative and safe working space.</p>
      <h2>Job Openings</h2>
      <p>Alert: Fake Appointment Letters! Greytrix official emails only come from @greytrix.com.</p>
      <iframe src="https://jobs.example-ats.invalid/greytrix"></iframe>
      <section>
        <h2>Contact Us</h2>
      </section>
    </main>
  </body>
</html>
`

const EMTEC_SENTINEL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Engineering, Marketing, & Technology - Bridgenext</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <h2>Dream Bigger. Join our Bridgenext team!</h2>
      <a href="https://careers-bridgenext.icims.com/jobs/search?ss=1&searchRelation=keyword_all&searchCategory=8724">Check out our open jobs and apply today!</a>
      <section>
        <h2>India Openings</h2>
        <a href="https://careers-bridgenext.icims.com/jobs/search?ss=1&searchRelation=keyword_all&searchCategory=8724">View all</a>
      </section>
      <p>Copyright © 2026 Bridgenext. All rights reserved.</p>
    </main>
  </body>
</html>
`

const CONTUS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>CONTUS TECH - Career Opportunities and Job Openings</title>
  </head>
  <body>
    <main>
      <h1>We build features not just Tech.</h1>
      <section>
        <h2>Current Openings</h2>
        <article class="opening-card">
          <h3>Business Development Manager</h3>
          <p class="location">Chennai, India</p>
          <a href="/careers/apply/business-development-manager">Apply Now</a>
        </article>
        <article class="opening-card">
          <h3>Node API Developer</h3>
          <p class="location">Chennai, India</p>
          <a href="/careers/apply/node-api-developer">Apply Now</a>
        </article>
      </section>
    </main>
  </body>
</html>
`

const SMART_IMS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers & Job Opportunities | SmartIMS</title>
  </head>
  <body>
    <main>
      <h1>Building Impactful Careers</h1>
      <section>
        <h2>Openings</h2>
        <p>Select a region to view job openings.</p>
        <a href="#smart-ims-americas">Smart IMS Americas</a>
        <a href="#smart-ims-india">Smart IMS India</a>
        <a href="#smart-ims-apac">Smart IMS APAC</a>
      </section>
      <section id="smart-ims-india">
        <h2>Current Job Openings</h2>
        <article class="job-opening">
          <h3>Job Description: Data Engineer II</h3>
          <p>Experience: 3-5 Years</p>
          <p>Location: Hyderabad (or as applicable)</p>
          <p>Team: Data Platform & Engineering</p>
          <p>To apply send your profile to [email protected]</p>
        </article>
        <article class="job-opening">
          <h3>Java Backend Software Development Engineer (SDE-2)</h3>
          <p>Location: Hyderabad</p>
          <p>Experience: Minimum 4 – 6 Years</p>
          <p>No of Positions: 10</p>
          <p>To apply send your profile to [email protected]</p>
        </article>
      </section>
    </main>
  </body>
</html>
`

const DOODLEBLUE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career at doodleblue | openings at chennai | doodleblue | India</title>
  </head>
  <body>
    <main>
      <a href="/careers/apply-now/">Apply Now</a>
      <h1>Join our Team</h1>
      <h2>Browse our open positions and pick the challenge that excites you the most</h2>
      <article class="opening-card">
        <h3>Full stack Developer (Reactjs+Nodejs) 2+ years</h3>
        <p class="meta">Chennai, India Full time experienced</p>
      </article>
      <article class="opening-card">
        <h3>Flutter Developer 5+ years</h3>
        <p class="meta">Chennai, India Full time experienced</p>
      </article>
      <article class="opening-card">
        <h3>Project Managers 3+ years</h3>
        <p class="meta">Chennai, India Full time experienced</p>
      </article>
    </main>
  </body>
</html>
`

const PUBLIC_JOB_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Open Jobs</title>
  </head>
  <body>
    <main>
      <article itemscope itemtype="https://schema.org/JobPosting" data-job-id="public-001">
        <h2 itemprop="title">Senior Engineer</h2>
        <a href="/jobs/senior-engineer">Apply Now</a>
      </article>
    </main>
  </body>
</html>
`

test('Greytrix stays fail-closed while the first-party page remains an embedded jobs shell without parseable inventory', async () => {
  const greytrix = await loadModule('../../scraper/greytrix/script.js')

  assert.equal(greytrix.SOURCE, 'greytrix')
  assert.equal(greytrix.COMPANY, 'Greytrix')
  assert.equal(greytrix.CAREERS_URL, 'https://www.greytrix.com/careers/')
  assert.equal(greytrix.VERIFIED_ON, '2026-07-18')
  assert.equal(greytrix.hasOfficialCareersSignal(GREYTRIX_SENTINEL_HTML), true)
  assert.equal(greytrix.hasPublicJobSignals(GREYTRIX_SENTINEL_HTML), false)
  assert.equal(greytrix.hasPublicJobSignals(PUBLIC_JOB_HTML), true)

  const jobs = await greytrix.createGreytrixScraper().run({
    fetchText: async () => GREYTRIX_SENTINEL_HTML,
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    greytrix.createGreytrixScraper().run({
      fetchText: async () => PUBLIC_JOB_HTML,
    }),
    /verified Greytrix careers page/i,
  )
})

test('Emtec stays fail-closed while the public brand routes hiring through Bridgenext external iCIMS handoff pages', async () => {
  const emtec = await loadModule('../../scraper/emtec/script.js')

  assert.equal(emtec.SOURCE, 'emtec')
  assert.equal(emtec.COMPANY, 'Emtec')
  assert.equal(emtec.CAREERS_URL, 'https://www.bridgenext.com/company/careers/')
  assert.equal(emtec.VERIFIED_ON, '2026-07-18')
  assert.equal(emtec.hasOfficialCareersSignal(EMTEC_SENTINEL_HTML), true)
  assert.equal(emtec.hasExternalIcimsHandoff(EMTEC_SENTINEL_HTML), true)
  assert.equal(emtec.hasFirstPartyInventorySignal(EMTEC_SENTINEL_HTML), false)

  const jobs = await emtec.createEmtecScraper().run({
    fetchText: async () => EMTEC_SENTINEL_HTML,
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    emtec.createEmtecScraper().run({
      fetchText: async () => `${EMTEC_SENTINEL_HTML}\n<section><h3>Salesforce Technical Architect</h3><p>Pune, India</p></section>`,
    }),
    /verified Emtec\/Bridgenext recruiting surface/i,
  )
})

test('Contus parses current openings from the first-party careers page', async () => {
  const contus = await loadModule('../../scraper/contus/script.js')

  assert.equal(contus.SOURCE, 'contus')
  assert.equal(contus.COMPANY, 'Contus')
  assert.equal(contus.CAREERS_URL, 'https://www.contus.com/careers.php')
  assert.equal(contus.VERIFIED_ON, '2026-07-18')
  assert.equal(contus.hasOfficialCareersSignal(CONTUS_HTML), true)

  const jobs = await contus.createContusScraper().run({
    fetchText: async () => CONTUS_HTML,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Business Development Manager',
      location: 'Chennai, India',
      detailUrl: 'https://www.contus.com/careers/apply/business-development-manager',
      applyUrl: 'https://www.contus.com/careers/apply/business-development-manager',
    },
    {
      title: 'Node API Developer',
      location: 'Chennai, India',
      detailUrl: 'https://www.contus.com/careers/apply/node-api-developer',
      applyUrl: 'https://www.contus.com/careers/apply/node-api-developer',
    },
  ])
})

test('Smart IMS parses current job opening blocks from the first-party careers page', async () => {
  const smartIms = await loadModule('../../scraper/smartims/script.js')

  assert.equal(smartIms.SOURCE, 'smartims')
  assert.equal(smartIms.COMPANY, 'Smart IMS')
  assert.equal(smartIms.CAREERS_URL, 'https://www.smartims.com/careers/')
  assert.equal(smartIms.VERIFIED_ON, '2026-07-18')
  assert.equal(smartIms.hasOfficialCareersSignal(SMART_IMS_HTML), true)

  const jobs = await smartIms.createSmartImsScraper().run({
    fetchText: async () => SMART_IMS_HTML,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Data Engineer II',
      location: 'Hyderabad (or as applicable)',
      applyUrl: 'mailto:[email protected]',
      experience: '3-5 Years',
      team: 'Data Platform & Engineering',
    },
    {
      title: 'Java Backend Software Development Engineer (SDE-2)',
      location: 'Hyderabad',
      applyUrl: 'mailto:[email protected]',
      experience: 'Minimum 4 - 6 Years',
      openingsCount: '10',
    },
  ])
})

test('doodleblue innovation parses first-party openings and shared metadata', async () => {
  const doodleblue = await loadModule('../../scraper/doodleblueinnovation/script.js')

  assert.equal(doodleblue.SOURCE, 'doodleblueinnovation')
  assert.equal(doodleblue.COMPANY, 'doodleblue innovation')
  assert.equal(doodleblue.CAREERS_URL, 'https://www.doodleblue.com/careers/openings/')
  assert.equal(doodleblue.VERIFIED_ON, '2026-07-18')
  assert.equal(doodleblue.hasOfficialOpeningsSignal(DOODLEBLUE_HTML), true)

  const jobs = await doodleblue.createDoodleblueInnovationScraper().run({
    fetchText: async () => DOODLEBLUE_HTML,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Full stack Developer (Reactjs+Nodejs) 2+ years',
      location: 'Chennai, India',
      employmentType: 'Full time',
      seniority: 'experienced',
      detailUrl: 'https://www.doodleblue.com/careers/apply-now/',
      applyUrl: 'https://www.doodleblue.com/careers/apply-now/',
    },
    {
      title: 'Flutter Developer 5+ years',
      location: 'Chennai, India',
      employmentType: 'Full time',
      seniority: 'experienced',
      detailUrl: 'https://www.doodleblue.com/careers/apply-now/',
      applyUrl: 'https://www.doodleblue.com/careers/apply-now/',
    },
    {
      title: 'Project Managers 3+ years',
      location: 'Chennai, India',
      employmentType: 'Full time',
      seniority: 'experienced',
      detailUrl: 'https://www.doodleblue.com/careers/apply-now/',
      applyUrl: 'https://www.doodleblue.com/careers/apply-now/',
    },
  ])
})
